CREATE TABLE medicoes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_id       uuid REFERENCES contracts(id),

  -- Period
  numero            integer NOT NULL,                -- measurement number (1, 2, 3...)
  periodo_inicio    date NOT NULL,
  periodo_fim       date NOT NULL,

  -- Values
  valor_medido      numeric(12, 2) NOT NULL,         -- value of work measured in this period
  valor_acumulado   numeric(12, 2),                  -- cumulative measured value
  percentual_fisico numeric(5, 2),                   -- physical % complete (0-100)

  -- Status
  status            text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'em_aprovacao', 'aprovada', 'faturada', 'rejeitada')),

  -- Responsible
  responsavel       text,                            -- name of the person who measured
  aprovado_por      uuid REFERENCES profiles(id),
  aprovado_em       timestamptz,

  -- Documentation
  observacoes       text,
  documento_url     text,                            -- storage path for measurement report/evidence

  -- Link to financial
  financial_entry_id uuid REFERENCES project_financial_entries(id), -- linked revenue entry when faturada
  contract_payment_id uuid REFERENCES contract_payments(id),        -- linked installment

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz,
  created_by        uuid REFERENCES profiles(id)
);

CREATE INDEX idx_medicoes_project  ON medicoes(project_id);
CREATE INDEX idx_medicoes_contract ON medicoes(contract_id);
CREATE INDEX idx_medicoes_status   ON medicoes(status);
CREATE INDEX idx_medicoes_periodo  ON medicoes(periodo_fim DESC);

ALTER TABLE medicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_financeiro_medicoes" ON medicoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro'))
  );

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_medicoes BEFORE UPDATE ON medicoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit trigger
CREATE TRIGGER audit_medicoes
  AFTER INSERT OR UPDATE OR DELETE ON medicoes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
