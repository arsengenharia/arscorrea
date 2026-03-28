-- Separate date fields for cash flow projection
-- data (existing) = data de competência (when the expense/revenue relates to)
-- data_vencimento = when payment is DUE
-- data_pagamento = when payment was actually MADE

ALTER TABLE project_financial_entries
  ADD COLUMN IF NOT EXISTS data_vencimento  date,
  ADD COLUMN IF NOT EXISTS data_pagamento   date;

-- Backfill: set data_pagamento = data for all existing entries (they were recorded on payment date)
UPDATE project_financial_entries SET data_pagamento = data WHERE data_pagamento IS NULL;

COMMENT ON COLUMN project_financial_entries.data IS 'Data de competência (a qual período o valor se refere)';
COMMENT ON COLUMN project_financial_entries.data_vencimento IS 'Data de vencimento (quando deveria ser pago)';
COMMENT ON COLUMN project_financial_entries.data_pagamento IS 'Data de pagamento efetivo (quando foi pago de fato)';
