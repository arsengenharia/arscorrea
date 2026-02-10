
-- 1. Nova tabela: project_costs
CREATE TABLE public.project_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL DEFAULT 'Direto',
  description TEXT,
  expected_value NUMERIC NOT NULL DEFAULT 0,
  actual_value NUMERIC NOT NULL DEFAULT 0,
  record_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project costs" ON public.project_costs FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can create project costs" ON public.project_costs FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can update project costs" ON public.project_costs FOR UPDATE USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can delete project costs" ON public.project_costs FOR DELETE USING (auth.role() = 'authenticated'::text);

CREATE TRIGGER update_project_costs_updated_at BEFORE UPDATE ON public.project_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Nova tabela: project_revenues
CREATE TABLE public.project_revenues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  revenue_type TEXT NOT NULL DEFAULT 'Contrato',
  description TEXT,
  expected_value NUMERIC NOT NULL DEFAULT 0,
  actual_value NUMERIC NOT NULL DEFAULT 0,
  record_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project revenues" ON public.project_revenues FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can create project revenues" ON public.project_revenues FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can update project revenues" ON public.project_revenues FOR UPDATE USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can delete project revenues" ON public.project_revenues FOR DELETE USING (auth.role() = 'authenticated'::text);

CREATE TRIGGER update_project_revenues_updated_at BEFORE UPDATE ON public.project_revenues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Nova tabela: project_reports
CREATE TABLE public.project_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  observations TEXT,
  pdf_path TEXT,
  report_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view project reports" ON public.project_reports FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can create project reports" ON public.project_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can update project reports" ON public.project_reports FOR UPDATE USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can delete project reports" ON public.project_reports FOR DELETE USING (auth.role() = 'authenticated'::text);

CREATE TRIGGER update_project_reports_updated_at BEFORE UPDATE ON public.project_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Adicionar coluna stage_weight na tabela stages
ALTER TABLE public.stages ADD COLUMN stage_weight NUMERIC NOT NULL DEFAULT 0;
