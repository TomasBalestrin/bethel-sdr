-- Fix the INSERT policy to be more restrictive
-- Only allow service role or authenticated users to insert (for triggers running as service role)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Allow inserts only from service role (triggers with SECURITY DEFINER) 
-- This is secure because only database triggers can insert, not direct API calls
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- This will be false for anon/authenticated, but triggers run as SECURITY DEFINER bypass RLS
  -- So regular users can't insert, only the trigger functions can
  auth.uid() IS NOT NULL OR auth.uid() IS NULL
);

-- Actually, let's make this explicit - users should NOT be able to insert their own notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- The triggers use SECURITY DEFINER which bypasses RLS, so we don't need an INSERT policy for regular users
-- If we need to allow the system to insert, we can use service_role key which bypasses RLS