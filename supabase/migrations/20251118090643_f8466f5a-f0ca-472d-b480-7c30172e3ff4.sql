-- Add tags column to consultations table
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for better performance on tag queries
CREATE INDEX IF NOT EXISTS idx_consultations_tags ON consultations USING GIN(tags);