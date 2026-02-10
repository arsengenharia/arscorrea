
-- 1. Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_name TEXT NOT NULL,
  legal_name TEXT,
  document TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers FOR SELECT USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can create suppliers" ON public.suppliers FOR INSERT WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers FOR UPDATE USING (auth.role() = 'authenticated'::text);
CREATE POLICY "Authenticated users can delete suppliers" ON public.suppliers FOR DELETE USING (auth.role() = 'authenticated'::text);

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. New columns in clients
ALTER TABLE public.clients ADD COLUMN client_type TEXT;
ALTER TABLE public.clients ADD COLUMN segment TEXT;

-- 3. New columns in proposals
ALTER TABLE public.proposals ADD COLUMN project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.proposals ADD COLUMN loss_reason TEXT;
ALTER TABLE public.proposals ADD COLUMN expected_close_date DATE;

-- 4. New columns in contracts
ALTER TABLE public.contracts ADD COLUMN project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.contracts ADD COLUMN due_date DATE;
ALTER TABLE public.contracts ADD COLUMN additive_value NUMERIC DEFAULT 0;

-- 5. New column in project_costs
ALTER TABLE public.project_costs ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);
