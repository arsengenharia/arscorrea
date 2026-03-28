-- ══════════════════════════════════════════════════════════════
-- AI QUERY LOG — tracks all AI interactions for auditability
-- ══════════════════════════════════════════════════════════════

CREATE TABLE ai_query_log (
  id              bigserial PRIMARY KEY,
  module          text NOT NULL,                    -- 'nfe_classification', 'item_normalization', 'anomaly_detection', 'chat'
  prompt          text NOT NULL,                    -- what was sent to the AI
  response        text,                             -- what the AI returned
  model           text,                             -- 'claude-sonnet-4-6', etc.
  tokens_input    integer,
  tokens_output   integer,
  latency_ms      integer,

  -- Context
  context_type    text,                             -- 'nfe_inbox', 'nfe_item', 'project', etc.
  context_id      uuid,                             -- ID of the entity being processed

  -- Result
  success         boolean NOT NULL DEFAULT true,
  error_message   text,

  -- Tracking
  user_id         uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_log_module   ON ai_query_log(module);
CREATE INDEX idx_ai_log_context  ON ai_query_log(context_type, context_id);
CREATE INDEX idx_ai_log_created  ON ai_query_log(created_at DESC);

ALTER TABLE ai_query_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_ai_log" ON ai_query_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ══════════════════════════════════════════════════════════════
-- ANOMALIES — financial divergences detected by rules or AI
-- ══════════════════════════════════════════════════════════════

CREATE TABLE anomalies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            text NOT NULL CHECK (tipo IN (
    'preco_acima_media',          -- item price > 2x average
    'nfe_duplicata_suspeita',     -- similar NF-e (same supplier+value+period)
    'lancamento_sem_conciliacao', -- entry pending > 7 days
    'divergencia_contrato',       -- received differs from expected by > 10%
    'orcamento_estourado',        -- actual > budget by category
    'fornecedor_novo_valor_alto', -- new supplier with high first payment
    'lancamento_sem_nfe',         -- high value payment without NF-e
    'medicao_vs_faturamento',     -- measurement doesn't match invoicing
    'outro'
  )),
  severidade      text NOT NULL DEFAULT 'media' CHECK (severidade IN ('baixa', 'media', 'alta', 'critica')),
  status          text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_analise', 'resolvida', 'ignorada')),

  -- Description
  titulo          text NOT NULL,
  descricao       text NOT NULL,

  -- Context links (at least one should be filled)
  project_id      uuid REFERENCES projects(id),
  supplier_id     uuid REFERENCES suppliers(id),
  entry_id        uuid REFERENCES project_financial_entries(id) ON DELETE SET NULL,
  nfe_inbox_id    uuid,  -- no FK to avoid circular deps with nfe_inbox
  contract_id     uuid REFERENCES contracts(id),

  -- Evidence
  valor_esperado  numeric(12, 2),
  valor_encontrado numeric(12, 2),
  percentual_desvio numeric(5, 2),
  evidencia_json  jsonb,                            -- extra context for AI/reports

  -- Resolution
  resolvido_por   uuid REFERENCES profiles(id),
  resolvido_em    timestamptz,
  resolucao_nota  text,

  -- Detection
  detectado_por   text NOT NULL DEFAULT 'sistema' CHECK (detectado_por IN ('sistema', 'ia', 'usuario')),

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_anomalies_tipo     ON anomalies(tipo);
CREATE INDEX idx_anomalies_status   ON anomalies(status);
CREATE INDEX idx_anomalies_severity ON anomalies(severidade);
CREATE INDEX idx_anomalies_project  ON anomalies(project_id);
CREATE INDEX idx_anomalies_created  ON anomalies(created_at DESC);

ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_financeiro_anomalies" ON anomalies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro'))
  );

-- ══════════════════════════════════════════════════════════════
-- MARGIN HISTORY — monthly snapshots for trend analysis
-- ══════════════════════════════════════════════════════════════

CREATE TABLE margin_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  mes             date NOT NULL,                    -- first day of month (2026-03-01)
  receita         numeric(12, 2) NOT NULL DEFAULT 0,
  custo           numeric(12, 2) NOT NULL DEFAULT 0,
  saldo           numeric(12, 2) NOT NULL DEFAULT 0,
  margem          numeric(5, 2),                    -- percentage
  iec             numeric(8, 4),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_margin_snapshots_unique ON margin_snapshots(project_id, mes);
CREATE INDEX idx_margin_snapshots_project ON margin_snapshots(project_id);

ALTER TABLE margin_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_financeiro_margin" ON margin_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro'))
  );
