-- Fix the permissive RLS policy for activity_logs INSERT
DROP POLICY IF EXISTS "Authenticated users can create logs" ON public.activity_logs;

CREATE POLICY "Authenticated users can create own logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);