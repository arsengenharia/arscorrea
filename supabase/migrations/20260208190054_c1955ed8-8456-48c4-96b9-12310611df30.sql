-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view events they created or are invited to" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view attendees of their events" ON public.calendar_event_attendees;

-- Create security definer function to check if user is attendee (breaks recursion)
CREATE OR REPLACE FUNCTION public.is_event_attendee(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.calendar_event_attendees
    WHERE event_id = _event_id
    AND user_id = _user_id
  )
$$;

-- Create security definer function to check if user is event creator
CREATE OR REPLACE FUNCTION public.is_event_creator(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.calendar_events
    WHERE id = _event_id
    AND created_by = _user_id
  )
$$;

-- Recreate SELECT policy for calendar_events using security definer function
CREATE POLICY "Users can view events they created or are invited to"
  ON public.calendar_events FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.is_event_attendee(id, auth.uid())
  );

-- Recreate SELECT policy for calendar_event_attendees using security definer function
CREATE POLICY "Users can view attendees of their events"
  ON public.calendar_event_attendees FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_event_creator(event_id, auth.uid())
  );