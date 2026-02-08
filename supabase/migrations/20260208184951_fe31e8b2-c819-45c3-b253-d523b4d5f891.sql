-- Tabela de eventos do calendário
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  timezone text DEFAULT 'America/Sao_Paulo',
  google_publish_url text,
  google_published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de participantes do evento
CREATE TABLE public.calendar_event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'attendee' CHECK (role IN ('owner', 'attendee')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX idx_calendar_events_start_at ON public.calendar_events(start_at);
CREATE INDEX idx_calendar_event_attendees_event_id ON public.calendar_event_attendees(event_id);
CREATE INDEX idx_calendar_event_attendees_user_id ON public.calendar_event_attendees(user_id);

-- RLS para calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Visualizar: criador ou participante convidado
CREATE POLICY "Users can view events they created or are invited to"
  ON public.calendar_events FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.calendar_event_attendees
      WHERE event_id = calendar_events.id
      AND user_id = auth.uid()
    )
  );

-- Criar: qualquer usuário autenticado
CREATE POLICY "Authenticated users can create events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Atualizar: apenas criador
CREATE POLICY "Only creator can update events"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = created_by);

-- Excluir: apenas criador
CREATE POLICY "Only creator can delete events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = created_by);

-- RLS para calendar_event_attendees
ALTER TABLE public.calendar_event_attendees ENABLE ROW LEVEL SECURITY;

-- Visualizar: participante ou criador do evento
CREATE POLICY "Users can view attendees of their events"
  ON public.calendar_event_attendees FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = calendar_event_attendees.event_id
      AND created_by = auth.uid()
    )
  );

-- Criar: apenas criador do evento pode adicionar participantes
CREATE POLICY "Event creator can add attendees"
  ON public.calendar_event_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = event_id
      AND created_by = auth.uid()
    )
  );

-- Atualizar: participante pode atualizar seu próprio status, criador pode atualizar qualquer
CREATE POLICY "Attendees can update their status or creator can update any"
  ON public.calendar_event_attendees FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = calendar_event_attendees.event_id
      AND created_by = auth.uid()
    )
  );

-- Excluir: apenas criador do evento
CREATE POLICY "Only event creator can remove attendees"
  ON public.calendar_event_attendees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = calendar_event_attendees.event_id
      AND created_by = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();