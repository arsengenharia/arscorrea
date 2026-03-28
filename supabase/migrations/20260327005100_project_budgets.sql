-- ══════════════════════════════════════════════════════════════
-- PROJECT BUDGETS — budget breakdown by financial category
-- ══════════════════════════════════════════════════════════════

CREATE TABLE project_budgets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id     uuid NOT NULL REFERENCES financial_categories(id),
  valor_previsto  numeric(12, 2) NOT NULL,           -- budgeted amount for this category
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

-- One budget line per project per category
CREATE UNIQUE INDEX idx_project_budgets_unique ON project_budgets(project_id, category_id);
CREATE INDEX idx_project_budgets_project ON project_budgets(project_id);

ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_financeiro_project_budgets" ON project_budgets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro'))
  );

-- Auto-update
CREATE TRIGGER set_updated_at_pb BEFORE UPDATE ON project_budgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit
CREATE TRIGGER audit_project_budgets
  AFTER INSERT OR UPDATE OR DELETE ON project_budgets
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
