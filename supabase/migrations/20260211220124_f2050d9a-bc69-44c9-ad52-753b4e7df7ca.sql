
-- Allow clients to update their own portal events (edit ocorrência)
CREATE POLICY "Clients can update own portal events"
  ON public.portal_events FOR UPDATE
  USING (auth.uid() = user_id AND has_role(auth.uid(), 'client'::app_role));

-- Allow clients to delete their own portal events
CREATE POLICY "Clients can delete own portal events"
  ON public.portal_events FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admins to delete portal event photos (when deleting an event)
CREATE POLICY "Admins can delete event photos"
  ON public.portal_event_photos FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow clients to delete their own event photos
CREATE POLICY "Clients can delete own event photos"
  ON public.portal_event_photos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM portal_events pe
    WHERE pe.id = portal_event_photos.event_id AND pe.user_id = auth.uid()
  ));
