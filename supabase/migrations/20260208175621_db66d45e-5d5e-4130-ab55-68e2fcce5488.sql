-- 1. Criar tabela proposal_stages (Etapas do Funil Comercial)
CREATE TABLE public.proposal_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Inserir valores iniciais
INSERT INTO public.proposal_stages (name, order_index) VALUES
  ('Em aberto', 1),
  ('Fachada', 2),
  ('Em análise', 3),
  ('Perdida', 4);

-- 3. Adicionar coluna stage_id na tabela proposals
ALTER TABLE public.proposals 
ADD COLUMN stage_id uuid REFERENCES public.proposal_stages(id);

-- 4. Definir valor padrão para propostas existentes
UPDATE public.proposals 
SET stage_id = (SELECT id FROM public.proposal_stages WHERE name = 'Em aberto')
WHERE stage_id IS NULL;

-- 5. Habilitar RLS na tabela proposal_stages
ALTER TABLE public.proposal_stages ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas de acesso
CREATE POLICY "Authenticated users can view proposal stages"
ON public.proposal_stages FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert proposal stages"
ON public.proposal_stages FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update proposal stages"
ON public.proposal_stages FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete proposal stages"
ON public.proposal_stages FOR DELETE
USING (auth.role() = 'authenticated');