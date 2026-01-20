-- Add columns to cleanup_logs for Google Sheets tracking
ALTER TABLE public.cleanup_logs 
ADD COLUMN IF NOT EXISTS google_sheet_url text,
ADD COLUMN IF NOT EXISTS sheet_name text,
ADD COLUMN IF NOT EXISTS exported_at timestamp with time zone;