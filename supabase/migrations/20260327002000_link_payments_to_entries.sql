-- Link contract_payments to project_financial_entries
-- When a revenue entry is created, it can reference which contract installment it corresponds to
ALTER TABLE project_financial_entries
  ADD COLUMN IF NOT EXISTS contract_payment_id uuid REFERENCES contract_payments(id);

CREATE INDEX IF NOT EXISTS idx_pfe_contract_payment
  ON project_financial_entries(contract_payment_id)
  WHERE contract_payment_id IS NOT NULL;
