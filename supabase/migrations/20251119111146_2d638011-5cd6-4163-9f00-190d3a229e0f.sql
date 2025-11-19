-- Create custom consultation templates table
CREATE TABLE IF NOT EXISTS public.custom_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  specialty TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template question sets table
CREATE TABLE IF NOT EXISTS public.template_question_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.custom_templates(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  questions TEXT[] NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_question_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_templates
CREATE POLICY "Users can view their own templates"
  ON public.custom_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.custom_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.custom_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.custom_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for template_question_sets
CREATE POLICY "Users can view question sets for their templates"
  ON public.template_question_sets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_templates
      WHERE custom_templates.id = template_question_sets.template_id
      AND custom_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create question sets for their templates"
  ON public.template_question_sets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_templates
      WHERE custom_templates.id = template_question_sets.template_id
      AND custom_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update question sets for their templates"
  ON public.template_question_sets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_templates
      WHERE custom_templates.id = template_question_sets.template_id
      AND custom_templates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete question sets for their templates"
  ON public.template_question_sets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_templates
      WHERE custom_templates.id = template_question_sets.template_id
      AND custom_templates.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_custom_templates_updated_at
  BEFORE UPDATE ON public.custom_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_custom_templates_user_id ON public.custom_templates(user_id);
CREATE INDEX idx_template_question_sets_template_id ON public.template_question_sets(template_id);