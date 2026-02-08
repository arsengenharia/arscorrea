-- Sequence for automatic contract numbering
CREATE SEQUENCE IF NOT EXISTS public.contract_number_seq START 1;

-- Contracts table
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  title text,
  scope_text text,
  subtotal numeric DEFAULT 0,
  discount_type text DEFAULT 'fixed',
  discount_value numeric DEFAULT 0,
  total numeric DEFAULT 0,
  status text DEFAULT 'ativo',
  payment_entry_value numeric DEFAULT 0,
  payment_installments_count integer DEFAULT 0,
  payment_installment_value numeric DEFAULT 0,
  payment_notes text,
  commission_expected_value numeric DEFAULT 0,
  commission_expected_date date,
  commission_received_value numeric DEFAULT 0,
  commission_notes text,
  pdf_path text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for automatic contract numbering
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS trigger LANGUAGE plpgsql
SET search_path = 'public' AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := 'CONT-' || 
      EXTRACT(YEAR FROM now())::TEXT || '-' || 
      LPAD(nextval('public.contract_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_contract_number
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.generate_contract_number();

-- Trigger for updated_at
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contract items table
CREATE TABLE public.contract_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  category text,
  description text,
  unit text,
  quantity numeric DEFAULT 0,
  unit_price numeric DEFAULT 0,
  total numeric DEFAULT 0,
  order_index integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Contract financial table
CREATE TABLE public.contract_financial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text,
  expected_value numeric DEFAULT 0,
  received_value numeric DEFAULT 0,
  expected_date date,
  received_date date,
  status text DEFAULT 'pendente',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Storage bucket for contracts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contracts', 'contracts', false)
ON CONFLICT DO NOTHING;

-- RLS for contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view contracts"
  ON public.contracts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create contracts"
  ON public.contracts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update contracts"
  ON public.contracts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete contracts"
  ON public.contracts FOR DELETE USING (auth.role() = 'authenticated');

-- RLS for contract_items
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view contract items"
  ON public.contract_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create contract items"
  ON public.contract_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update contract items"
  ON public.contract_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete contract items"
  ON public.contract_items FOR DELETE USING (auth.role() = 'authenticated');

-- RLS for contract_financial
ALTER TABLE public.contract_financial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view contract financial"
  ON public.contract_financial FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create contract financial"
  ON public.contract_financial FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update contract financial"
  ON public.contract_financial FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete contract financial"
  ON public.contract_financial FOR DELETE USING (auth.role() = 'authenticated');

-- Storage policies for contracts bucket
CREATE POLICY "Authenticated users can upload contracts"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'contracts' AND auth.role() = 'authenticated'
  );
CREATE POLICY "Authenticated users can read contracts"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'contracts' AND auth.role() = 'authenticated'
  );
CREATE POLICY "Authenticated users can update contracts storage"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'contracts' AND auth.role() = 'authenticated'
  );
CREATE POLICY "Authenticated users can delete contracts storage"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'contracts' AND auth.role() = 'authenticated'
  );