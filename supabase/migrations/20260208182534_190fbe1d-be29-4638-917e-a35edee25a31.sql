-- Criar tabela contract_payments para forma de pagamento e comissões
CREATE TABLE public.contract_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  kind text NOT NULL, -- 'entrada', 'parcela', 'sinal', 'ajuste', 'comissao'
  description text,
  expected_value numeric DEFAULT 0,
  expected_date date,
  received_value numeric DEFAULT 0,
  received_date date,
  status text DEFAULT 'pendente', -- 'pendente', 'parcial', 'recebido'
  order_index integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.contract_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contract payments"
  ON public.contract_payments FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create contract payments"
  ON public.contract_payments FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update contract payments"
  ON public.contract_payments FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete contract payments"
  ON public.contract_payments FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Índice para queries por contrato
CREATE INDEX idx_contract_payments_contract_id 
  ON public.contract_payments(contract_id);