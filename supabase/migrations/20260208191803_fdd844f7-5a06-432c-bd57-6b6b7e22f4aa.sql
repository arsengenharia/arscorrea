-- =====================================================
-- Atualizar RLS para permitir acesso total da equipe
-- =====================================================

-- =========================
-- calendar_events
-- =========================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.calendar_events;
DROP POLICY IF EXISTS "Only creator can delete events" ON public.calendar_events;
DROP POLICY IF EXISTS "Only creator can update events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view events they created or are invited to" ON public.calendar_events;

-- SELECT: todos os usuários autenticados podem ver todos os eventos
CREATE POLICY "Authenticated users can view all events" 
ON public.calendar_events 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- INSERT: todos os usuários autenticados podem criar eventos
CREATE POLICY "Authenticated users can create events" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- UPDATE: apenas o criador pode atualizar
CREATE POLICY "Only creator can update events" 
ON public.calendar_events 
FOR UPDATE 
USING (auth.uid() = created_by);

-- DELETE: apenas o criador pode excluir
CREATE POLICY "Only creator can delete events" 
ON public.calendar_events 
FOR DELETE 
USING (auth.uid() = created_by);

-- =========================
-- calendar_event_attendees
-- =========================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Attendees can update their status or creator can update any" ON public.calendar_event_attendees;
DROP POLICY IF EXISTS "Event creator can add attendees" ON public.calendar_event_attendees;
DROP POLICY IF EXISTS "Only event creator can remove attendees" ON public.calendar_event_attendees;
DROP POLICY IF EXISTS "Users can view attendees of their events" ON public.calendar_event_attendees;

-- SELECT: todos os usuários autenticados podem ver participantes
CREATE POLICY "Authenticated users can view all attendees" 
ON public.calendar_event_attendees 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- INSERT: todos os usuários autenticados podem adicionar participantes
CREATE POLICY "Authenticated users can add attendees" 
ON public.calendar_event_attendees 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: participante pode atualizar seu status, ou criador do evento pode atualizar qualquer
CREATE POLICY "Attendees can update their status" 
ON public.calendar_event_attendees 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR is_event_creator(event_id, auth.uid())
);

-- DELETE: criador do evento pode remover participantes
CREATE POLICY "Event creator can remove attendees" 
ON public.calendar_event_attendees 
FOR DELETE 
USING (is_event_creator(event_id, auth.uid()));