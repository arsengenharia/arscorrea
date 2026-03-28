-- ══════════════════════════════════════════════════════════════
-- AUDIT LOG — captures all INSERT/UPDATE/DELETE on tracked tables
-- ══════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
  id              bigserial PRIMARY KEY,
  table_name      text NOT NULL,
  record_id       uuid NOT NULL,
  action          text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data        jsonb,
  new_data        jsonb,
  changed_fields  text[],          -- list of column names that changed (UPDATE only)
  user_id         uuid,            -- auth.uid() at time of change
  ip_address      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_table    ON audit_log(table_name);
CREATE INDEX idx_audit_log_record   ON audit_log(record_id);
CREATE INDEX idx_audit_log_user     ON audit_log(user_id);
CREATE INDEX idx_audit_log_created  ON audit_log(created_at DESC);

-- RLS: only admins can read audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_audit_log" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ══════════════════════════════════════════════════════════════
-- GENERIC AUDIT TRIGGER FUNCTION
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_changed text[];
  v_key text;
  v_record_id uuid;
  v_user_id uuid;
BEGIN
  -- Try to get current user
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_record_id := OLD.id;
    INSERT INTO audit_log (table_name, record_id, action, old_data, user_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', v_old, v_user_id);
    RETURN OLD;

  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
    INSERT INTO audit_log (table_name, record_id, action, new_data, user_id)
    VALUES (TG_TABLE_NAME, v_record_id, 'INSERT', v_new, v_user_id);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;

    -- Find changed fields
    v_changed := ARRAY[]::text[];
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_old->v_key IS DISTINCT FROM v_new->v_key THEN
        v_changed := array_append(v_changed, v_key);
      END IF;
    END LOOP;

    -- Only log if something actually changed (skip no-op updates)
    IF array_length(v_changed, 1) > 0 THEN
      INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_fields, user_id)
      VALUES (TG_TABLE_NAME, v_record_id, 'UPDATE', v_old, v_new, v_changed, v_user_id);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- ATTACH AUDIT TRIGGERS to financial tables
-- ══════════════════════════════════════════════════════════════

CREATE TRIGGER audit_project_financial_entries
  AFTER INSERT OR UPDATE OR DELETE ON project_financial_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_contracts
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_contract_payments
  AFTER INSERT OR UPDATE OR DELETE ON contract_payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_nfe_inbox
  AFTER INSERT OR UPDATE OR DELETE ON nfe_inbox
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_cost_allocations
  AFTER INSERT OR UPDATE OR DELETE ON cost_allocations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_bank_reconciliations
  AFTER INSERT OR UPDATE OR DELETE ON bank_reconciliations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_suppliers
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
