ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS bank_account_id   uuid REFERENCES bank_accounts(id),
  ADD COLUMN IF NOT EXISTS orcamento_previsto numeric(14, 2),
  ADD COLUMN IF NOT EXISTS saldo_atual       numeric(12, 2),
  ADD COLUMN IF NOT EXISTS custo_realizado   numeric(12, 2),
  ADD COLUMN IF NOT EXISTS receita_realizada numeric(12, 2),
  ADD COLUMN IF NOT EXISTS margem_atual      numeric(5, 2),
  ADD COLUMN IF NOT EXISTS iec_atual         numeric(8, 4);
