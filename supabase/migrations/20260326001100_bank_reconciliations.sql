CREATE TABLE bank_reconciliations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    uuid NOT NULL REFERENCES bank_transactions(id),
  lancamento_id     uuid NOT NULL REFERENCES project_financial_entries(id),
  tipo_match        text NOT NULL CHECK (tipo_match IN ('automatico', 'manual')),
  criado_por        uuid REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_bank_reconciliations" ON bank_reconciliations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "financeiro_crud_bank_reconciliations" ON bank_reconciliations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'financeiro')
  );
