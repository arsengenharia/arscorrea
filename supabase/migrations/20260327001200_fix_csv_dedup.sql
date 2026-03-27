-- Fix: Prevent duplicate bank transaction imports
-- Unique on (account + date + value + description) catches re-imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_dedup
  ON bank_transactions(bank_account_id, data_transacao, valor, descricao_banco);

-- Fix: Prevent duplicate rateio allocations
CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_allocations_dedup
  ON cost_allocations(lancamento_id, project_id);
