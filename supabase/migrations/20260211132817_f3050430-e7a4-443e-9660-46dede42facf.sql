
-- Criar tabela portal_events
CREATE TABLE public.portal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto',
  admin_response TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela portal_event_photos
CREATE TABLE public.portal_event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.portal_events(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_portal_events_updated_at
  BEFORE UPDATE ON public.portal_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.portal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_event_photos ENABLE ROW LEVEL SECURITY;

-- RLS portal_events: Admins podem ver e atualizar tudo
CREATE POLICY "Admins can view all portal events"
  ON public.portal_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update portal events"
  ON public.portal_events FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- RLS portal_events: Clientes podem ver e criar eventos dos seus projetos
CREATE POLICY "Clients can view own portal events"
  ON public.portal_events FOR SELECT
  USING (
    has_role(auth.uid(), 'client') AND
    EXISTS (
      SELECT 1 FROM client_portal_access
      WHERE client_portal_access.user_id = auth.uid()
        AND client_portal_access.project_id = portal_events.project_id
    )
  );

CREATE POLICY "Clients can create portal events"
  ON public.portal_events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (
      has_role(auth.uid(), 'admin') OR
      (
        has_role(auth.uid(), 'client') AND
        EXISTS (
          SELECT 1 FROM client_portal_access
          WHERE client_portal_access.user_id = auth.uid()
            AND client_portal_access.project_id = portal_events.project_id
        )
      )
    )
  );

-- RLS portal_event_photos: mesma logica via event_id
CREATE POLICY "Admins can view all event photos"
  ON public.portal_event_photos FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view own event photos"
  ON public.portal_event_photos FOR SELECT
  USING (
    has_role(auth.uid(), 'client') AND
    EXISTS (
      SELECT 1 FROM portal_events pe
      JOIN client_portal_access cpa ON cpa.project_id = pe.project_id
      WHERE pe.id = portal_event_photos.event_id
        AND cpa.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create event photos"
  ON public.portal_event_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portal_events pe
      WHERE pe.id = portal_event_photos.event_id
        AND pe.user_id = auth.uid()
    )
  );

-- Criar bucket para fotos dos eventos
INSERT INTO storage.buckets (id, name, public) VALUES ('portal_events', 'portal_events', false);

-- Storage policies para portal_events bucket
CREATE POLICY "Users can upload event photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'portal_events' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view event photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portal_events' AND auth.role() = 'authenticated');
