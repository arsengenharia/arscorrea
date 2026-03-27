-- Fix: Allow deleting entries that have reconciliations or allocations

-- bank_reconciliations.lancamento_id → CASCADE
ALTER TABLE bank_reconciliations DROP CONSTRAINT IF EXISTS bank_reconciliations_lancamento_id_fkey;
ALTER TABLE bank_reconciliations ADD CONSTRAINT bank_reconciliations_lancamento_id_fkey
  FOREIGN KEY (lancamento_id) REFERENCES project_financial_entries(id) ON DELETE CASCADE;

-- cost_allocations.lancamento_id → CASCADE
ALTER TABLE cost_allocations DROP CONSTRAINT IF EXISTS cost_allocations_lancamento_id_fkey;
ALTER TABLE cost_allocations ADD CONSTRAINT cost_allocations_lancamento_id_fkey
  FOREIGN KEY (lancamento_id) REFERENCES project_financial_entries(id) ON DELETE CASCADE;

-- nfe_inbox.financial_entry_id → SET NULL (keep NF-e history even if entry deleted)
ALTER TABLE nfe_inbox DROP CONSTRAINT IF EXISTS nfe_inbox_financial_entry_id_fkey;
ALTER TABLE nfe_inbox ADD CONSTRAINT nfe_inbox_financial_entry_id_fkey
  FOREIGN KEY (financial_entry_id) REFERENCES project_financial_entries(id) ON DELETE SET NULL;

-- bank_transactions.lancamento_id → SET NULL (unlink transaction, revert to pendente)
ALTER TABLE bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_lancamento_id_fkey;
ALTER TABLE bank_transactions ADD CONSTRAINT bank_transactions_lancamento_id_fkey
  FOREIGN KEY (lancamento_id) REFERENCES project_financial_entries(id) ON DELETE SET NULL;
