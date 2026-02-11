
-- Migração 1: Sistema de roles

-- Criar enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

-- Criar tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para verificar role sem recursão
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Políticas RLS para user_roles
-- Admins podem ver todos os roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Usuários podem ver seu próprio role
CREATE POLICY "Users can view own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Apenas admins podem inserir roles
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem deletar roles
CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Atribuir role 'admin' a todos os usuários existentes
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Migração 2: Tabela client_portal_access

CREATE TABLE public.client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os acessos
CREATE POLICY "Admins can view all portal access"
  ON public.client_portal_access
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Clientes podem ver seus próprios acessos
CREATE POLICY "Clients can view own portal access"
  ON public.client_portal_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins podem criar acessos
CREATE POLICY "Admins can create portal access"
  ON public.client_portal_access
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins podem deletar acessos
CREATE POLICY "Admins can delete portal access"
  ON public.client_portal_access
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Migração 3: Política RLS para clients com role client (SELECT via portal access)

-- Clientes podem ver apenas seus dados vinculados
CREATE POLICY "Clients can view own client data"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access
      WHERE client_portal_access.user_id = auth.uid()
        AND client_portal_access.client_id = clients.id
    )
  );

-- Clientes podem ver projetos vinculados
CREATE POLICY "Clients can view portal projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access
      WHERE client_portal_access.user_id = auth.uid()
        AND client_portal_access.project_id = projects.id
    )
  );

-- Clientes podem ver etapas dos projetos vinculados
CREATE POLICY "Clients can view portal stages"
  ON public.stages
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access
      WHERE client_portal_access.user_id = auth.uid()
        AND client_portal_access.project_id = stages.project_id
    )
  );

-- Clientes podem ver fotos das etapas dos projetos vinculados
CREATE POLICY "Clients can view portal stage photos"
  ON public.stage_photos
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND EXISTS (
      SELECT 1 FROM public.stages
      JOIN public.client_portal_access ON client_portal_access.project_id = stages.project_id
      WHERE stages.id = stage_photos.stage_id
        AND client_portal_access.user_id = auth.uid()
    )
  );
