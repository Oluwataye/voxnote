-- Create template versions table to track changes
CREATE TABLE public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.custom_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  specialty TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  icon TEXT,
  question_sets JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(template_id, version_number)
);

-- Enable RLS
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for template versions
CREATE POLICY "Users can view versions of their templates"
ON public.template_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.custom_templates
    WHERE custom_templates.id = template_versions.template_id
    AND custom_templates.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create versions for their templates"
ON public.template_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.custom_templates
    WHERE custom_templates.id = template_versions.template_id
    AND custom_templates.user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Create index for faster queries
CREATE INDEX idx_template_versions_template_id ON public.template_versions(template_id);
CREATE INDEX idx_template_versions_created_at ON public.template_versions(created_at DESC);

-- Function to automatically create a version when template is updated
CREATE OR REPLACE FUNCTION public.create_template_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
  question_sets_data JSONB;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM public.template_versions
  WHERE template_id = OLD.id;

  -- Get question sets as JSONB
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category', category,
      'questions', questions,
      'order_index', order_index
    )
    ORDER BY order_index
  ), '[]'::jsonb)
  INTO question_sets_data
  FROM public.template_question_sets
  WHERE template_id = OLD.id;

  -- Insert the version
  INSERT INTO public.template_versions (
    template_id,
    version_number,
    name,
    description,
    specialty,
    tags,
    icon,
    question_sets,
    created_by
  ) VALUES (
    OLD.id,
    next_version,
    OLD.name,
    OLD.description,
    OLD.specialty,
    OLD.tags,
    OLD.icon,
    question_sets_data,
    auth.uid()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to save version on update
CREATE TRIGGER save_template_version
BEFORE UPDATE ON public.custom_templates
FOR EACH ROW
WHEN (
  OLD.name IS DISTINCT FROM NEW.name OR
  OLD.description IS DISTINCT FROM NEW.description OR
  OLD.specialty IS DISTINCT FROM NEW.specialty OR
  OLD.tags IS DISTINCT FROM NEW.tags OR
  OLD.icon IS DISTINCT FROM NEW.icon
)
EXECUTE FUNCTION public.create_template_version();