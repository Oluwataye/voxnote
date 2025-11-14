-- ============================================
-- CREATE TABLES WITH RLS ENABLED
-- ============================================

-- Profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User settings table
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Consultations table
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  original_language TEXT DEFAULT 'en',
  is_paused BOOLEAN DEFAULT false,
  document_url TEXT,
  document_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Consultation contents table
CREATE TABLE public.consultation_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  is_original BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.consultation_contents ENABLE ROW LEVEL SECURITY;

-- Messages table for consultation transcripts
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PROFILES TABLE RLS POLICIES
-- ============================================

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = id);

-- ============================================
-- USER_SETTINGS TABLE RLS POLICIES
-- ============================================

CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
ON public.user_settings FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- CONSULTATIONS TABLE RLS POLICIES
-- ============================================

CREATE POLICY "Users can view their own consultations"
ON public.consultations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own consultations"
ON public.consultations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consultations"
ON public.consultations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consultations"
ON public.consultations FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- CONSULTATION_CONTENTS TABLE RLS POLICIES
-- ============================================

CREATE POLICY "Users can view their consultation contents"
ON public.consultation_contents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consultations
    WHERE consultations.id = consultation_contents.consultation_id
    AND consultations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create consultation contents"
ON public.consultation_contents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultations
    WHERE consultations.id = consultation_contents.consultation_id
    AND consultations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their consultation contents"
ON public.consultation_contents FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.consultations
    WHERE consultations.id = consultation_contents.consultation_id
    AND consultations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their consultation contents"
ON public.consultation_contents FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.consultations
    WHERE consultations.id = consultation_contents.consultation_id
    AND consultations.user_id = auth.uid()
  )
);

-- ============================================
-- MESSAGES TABLE RLS POLICIES
-- ============================================

CREATE POLICY "Users can view their consultation messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consultations
    WHERE consultations.id = messages.consultation_id
    AND consultations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their consultations"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultations
    WHERE consultations.id = messages.consultation_id
    AND consultations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their consultation messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.consultations
    WHERE consultations.id = messages.consultation_id
    AND consultations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their consultation messages"
ON public.messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.consultations
    WHERE consultations.id = messages.consultation_id
    AND consultations.user_id = auth.uid()
  )
);

-- ============================================
-- CREATE PROFILE ON USER SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE: CREATE DOCUMENTS BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- ============================================
-- STORAGE: DOCUMENTS BUCKET RLS POLICIES
-- ============================================

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_consultations_user_id ON public.consultations(user_id);
CREATE INDEX idx_consultations_created_at ON public.consultations(created_at DESC);
CREATE INDEX idx_consultation_contents_consultation_id ON public.consultation_contents(consultation_id);
CREATE INDEX idx_messages_consultation_id ON public.messages(consultation_id);
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);