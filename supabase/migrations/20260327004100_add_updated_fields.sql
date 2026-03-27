-- Add updated_at and updated_by to financial tables that don't have them

-- project_financial_entries
ALTER TABLE project_financial_entries
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by  uuid REFERENCES profiles(id);

-- nfe_inbox
ALTER TABLE nfe_inbox
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz;

-- financial_categories
ALTER TABLE financial_categories
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz;

-- bank_accounts
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz;

-- bank_transactions
ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz;

-- cost_allocations (no updated_at needed — immutable after creation)

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_pfe BEFORE UPDATE ON project_financial_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_nfe BEFORE UPDATE ON nfe_inbox
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_fc BEFORE UPDATE ON financial_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_ba BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_bt BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
