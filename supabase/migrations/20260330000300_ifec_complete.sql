-- ============================================================================
-- IFEC (Índice Físico de Eficiência de Custo) — Complete Implementation
-- IFEC = avanço_real / avanço_previsto
-- Where:
--   avanço_real = latest medicoes.percentual_fisico (most recent approved measurement)
--   avanço_previsto = interpolated from project_progress_baseline for current date
-- ============================================================================

-- 1. Baseline progress schedule table
-- Stores planned physical progress per month for each project
CREATE TABLE IF NOT EXISTS project_progress_baseline (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  mes           date NOT NULL,                          -- first day of month (YYYY-MM-01)
  percentual_previsto numeric(5, 2) NOT NULL CHECK (percentual_previsto >= 0 AND percentual_previsto <= 100),
  observacao    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz,
  created_by    uuid REFERENCES profiles(id),

  UNIQUE (project_id, mes)
);

CREATE INDEX idx_progress_baseline_project ON project_progress_baseline(project_id);
CREATE INDEX idx_progress_baseline_mes ON project_progress_baseline(mes);

ALTER TABLE project_progress_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_financeiro_progress_baseline" ON project_progress_baseline
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro'))
  );

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_progress_baseline BEFORE UPDATE ON project_progress_baseline
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit trigger
CREATE TRIGGER audit_progress_baseline
  AFTER INSERT OR UPDATE OR DELETE ON project_progress_baseline
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();


-- 2. Add IFEC columns to projects and margin_snapshots
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS ifec_atual          numeric(8, 4),
  ADD COLUMN IF NOT EXISTS avanco_real         numeric(5, 2),
  ADD COLUMN IF NOT EXISTS avanco_previsto     numeric(5, 2);

ALTER TABLE margin_snapshots
  ADD COLUMN IF NOT EXISTS ifec               numeric(8, 4),
  ADD COLUMN IF NOT EXISTS avanco_real        numeric(5, 2),
  ADD COLUMN IF NOT EXISTS avanco_previsto    numeric(5, 2);


-- 3. Function to get planned progress for a given date (linear interpolation)
CREATE OR REPLACE FUNCTION get_avanco_previsto(p_project_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_before  record;
  v_after   record;
  v_exact   numeric;
  v_days_total integer;
  v_days_elapsed integer;
  v_result  numeric;
BEGIN
  -- Check exact match first
  SELECT percentual_previsto INTO v_exact
  FROM project_progress_baseline
  WHERE project_id = p_project_id
    AND mes = date_trunc('month', p_date)::date;

  IF v_exact IS NOT NULL THEN
    RETURN v_exact;
  END IF;

  -- Find closest before and after
  SELECT mes, percentual_previsto INTO v_before
  FROM project_progress_baseline
  WHERE project_id = p_project_id AND mes <= date_trunc('month', p_date)::date
  ORDER BY mes DESC LIMIT 1;

  SELECT mes, percentual_previsto INTO v_after
  FROM project_progress_baseline
  WHERE project_id = p_project_id AND mes > date_trunc('month', p_date)::date
  ORDER BY mes ASC LIMIT 1;

  -- No baseline data at all
  IF v_before IS NULL AND v_after IS NULL THEN
    RETURN NULL;
  END IF;

  -- Only before exists (past the last planned month)
  IF v_after IS NULL THEN
    RETURN v_before.percentual_previsto;
  END IF;

  -- Only after exists (before the first planned month)
  IF v_before IS NULL THEN
    RETURN 0;
  END IF;

  -- Interpolate between the two
  v_days_total := v_after.mes - v_before.mes;
  v_days_elapsed := date_trunc('month', p_date)::date - v_before.mes;

  IF v_days_total <= 0 THEN
    RETURN v_before.percentual_previsto;
  END IF;

  v_result := v_before.percentual_previsto
    + (v_after.percentual_previsto - v_before.percentual_previsto)
    * (v_days_elapsed::numeric / v_days_total::numeric);

  RETURN ROUND(v_result, 2);
END;
$$;


-- 4. Function to get actual physical progress (latest approved measurement)
CREATE OR REPLACE FUNCTION get_avanco_real(p_project_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_result numeric;
BEGIN
  SELECT percentual_fisico INTO v_result
  FROM medicoes
  WHERE project_id = p_project_id
    AND status IN ('aprovada', 'faturada')
    AND percentual_fisico IS NOT NULL
  ORDER BY periodo_fim DESC, numero DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;


-- 5. Update calc_project_balance to also compute IFEC
CREATE OR REPLACE FUNCTION calc_project_balance(p_project_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_receita      numeric;
  v_custo        numeric;
  v_custo_rateio numeric;
  v_orcamento    numeric;
  v_custo_total  numeric;
  v_avanco_real  numeric;
  v_avanco_prev  numeric;
  v_ifec         numeric;
BEGIN
  -- Direct entries
  SELECT
    COALESCE(SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END), 0),
    COALESCE(ABS(SUM(CASE WHEN valor < 0 THEN valor ELSE 0 END)), 0)
  INTO v_receita, v_custo
  FROM project_financial_entries
  WHERE project_id = p_project_id;

  -- Rateio allocations (cost_allocations.valor_alocado is negative)
  SELECT COALESCE(ABS(SUM(valor_alocado)), 0)
  INTO v_custo_rateio
  FROM cost_allocations
  WHERE project_id = p_project_id;

  v_custo_total := v_custo + v_custo_rateio;

  SELECT COALESCE(orcamento_previsto, 0)
  INTO v_orcamento
  FROM projects WHERE id = p_project_id;

  -- IFEC calculation
  v_avanco_real := get_avanco_real(p_project_id);
  v_avanco_prev := get_avanco_previsto(p_project_id);
  v_ifec := CASE
    WHEN v_avanco_prev IS NOT NULL AND v_avanco_prev > 0 AND v_avanco_real IS NOT NULL
    THEN ROUND(v_avanco_real / v_avanco_prev, 4)
    ELSE NULL
  END;

  UPDATE projects SET
    saldo_atual        = v_receita - v_custo_total,
    custo_realizado    = v_custo_total,
    receita_realizada  = v_receita,
    margem_atual       = CASE WHEN v_receita > 0 THEN ((v_receita - v_custo_total) / v_receita * 100) ELSE 0 END,
    iec_atual          = CASE WHEN v_orcamento > 0 THEN (v_custo_total / v_orcamento) ELSE NULL END,
    avanco_real        = v_avanco_real,
    avanco_previsto    = v_avanco_prev,
    ifec_atual         = v_ifec
  WHERE id = p_project_id;
END;
$$;


-- 6. View: IFEC vs IEC side-by-side per project
CREATE OR REPLACE VIEW v_ifec_overview AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.status,
  p.start_date,
  p.end_date,
  p.orcamento_previsto,
  p.custo_realizado,
  p.iec_atual,
  p.avanco_real,
  p.avanco_previsto,
  p.ifec_atual,
  -- Classification
  CASE
    WHEN p.ifec_atual IS NULL THEN 'sem_dados'
    WHEN p.ifec_atual >= 1.0 THEN 'eficiente'
    WHEN p.ifec_atual >= 0.8 THEN 'atencao'
    ELSE 'critico'
  END AS ifec_status,
  CASE
    WHEN p.iec_atual IS NULL THEN 'sem_dados'
    WHEN p.iec_atual <= 1.0 THEN 'eficiente'
    WHEN p.iec_atual <= 1.15 THEN 'atencao'
    ELSE 'critico'
  END AS iec_status,
  -- Combined health score: both indices should be ≥ 1.0 (IFEC) and ≤ 1.0 (IEC)
  CASE
    WHEN p.ifec_atual IS NULL OR p.iec_atual IS NULL THEN 'incompleto'
    WHEN p.ifec_atual >= 1.0 AND p.iec_atual <= 1.0 THEN 'saudavel'
    WHEN p.ifec_atual >= 0.8 AND p.iec_atual <= 1.15 THEN 'atencao'
    ELSE 'critico'
  END AS saude_obra
FROM projects p
WHERE p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado');


-- 7. View: Progress baseline with actual comparison (for timeline chart)
CREATE OR REPLACE VIEW v_progress_timeline AS
SELECT
  pb.project_id,
  p.name AS project_name,
  pb.mes,
  pb.percentual_previsto,
  -- Get the closest real measurement for this month
  (
    SELECT m.percentual_fisico
    FROM medicoes m
    WHERE m.project_id = pb.project_id
      AND m.status IN ('aprovada', 'faturada')
      AND m.percentual_fisico IS NOT NULL
      AND m.periodo_fim <= (pb.mes + interval '1 month')::date
    ORDER BY m.periodo_fim DESC
    LIMIT 1
  ) AS percentual_real
FROM project_progress_baseline pb
JOIN projects p ON p.id = pb.project_id
ORDER BY pb.project_id, pb.mes;


-- 8. Anomaly detection for IFEC
-- Add IFEC anomaly type to detect_anomalies function
-- This will be picked up by the existing cron
-- 9. Update ai_build_context to include IFEC in project context
-- Replace the project context portion to include IFEC fields
CREATE OR REPLACE FUNCTION ai_build_context(
  p_context_type text DEFAULT 'general',
  p_context_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_result   jsonb := '{}'::jsonb;
  v_prefs    jsonb;
  v_knowledge jsonb;
  v_anomalies jsonb;
BEGIN
  -- 1. User preferences
  SELECT jsonb_build_object(
    'user_preferences', jsonb_build_object(
      'idioma', COALESCE(aup.idioma, 'pt-BR'),
      'nivel_detalhe', COALESCE(aup.nivel_detalhe, 'normal'),
      'apelidos', COALESCE(aup.apelidos, '{}'::jsonb)
    )
  ) INTO v_prefs
  FROM ai_user_preferences aup
  WHERE aup.user_id = p_user_id;

  v_result := COALESCE(v_prefs, jsonb_build_object('user_preferences', jsonb_build_object('idioma', 'pt-BR', 'nivel_detalhe', 'normal')));

  -- 2. Knowledge base
  SELECT jsonb_agg(jsonb_build_object(
    'tipo', ak.tipo,
    'conteudo', ak.conteudo,
    'confianca', ak.confianca
  )) INTO v_knowledge
  FROM ai_knowledge ak
  WHERE ak.ativo = true
    AND (scope_type = 'global'
      OR (scope_type = p_context_type AND scope_id = p_context_id)
      OR (scope_type = 'user' AND scope_id = p_user_id));

  v_result := v_result || jsonb_build_object('knowledge', COALESCE(v_knowledge, '[]'::jsonb));

  -- 3. Entity-specific context
  IF p_context_type = 'project' AND p_context_id IS NOT NULL THEN
    SELECT v_result || jsonb_build_object(
      'project', jsonb_build_object(
        'id', p.id, 'name', p.name, 'status', p.status,
        'client', c.name,
        'manager', p.project_manager,
        'start_date', p.start_date, 'end_date', p.end_date,
        'orcamento', p.orcamento_previsto,
        'receita', p.receita_realizada, 'custo', p.custo_realizado,
        'saldo', p.saldo_atual, 'margem', p.margem_atual, 'iec', p.iec_atual,
        'ifec', p.ifec_atual,
        'avanco_real', p.avanco_real,
        'avanco_previsto', p.avanco_previsto
      )
    ) INTO v_result
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.id = p_context_id;

  ELSIF p_context_type = 'supplier' AND p_context_id IS NOT NULL THEN
    SELECT v_result || jsonb_build_object(
      'supplier', row_to_json(vs.*)
    ) INTO v_result
    FROM v_supplier_summary vs
    WHERE vs.supplier_id = p_context_id;

  ELSIF p_context_type = 'general' OR p_context_type IS NULL THEN
    SELECT v_result || jsonb_build_object(
      'summary', jsonb_build_object(
        'total_obras', count(*),
        'receita_total', sum(COALESCE(receita_realizada, 0)),
        'custo_total', sum(COALESCE(custo_realizado, 0)),
        'saldo_total', sum(COALESCE(saldo_atual, 0))
      )
    ) INTO v_result
    FROM projects
    WHERE status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado');
  END IF;

  -- 4. Open anomalies
  SELECT jsonb_agg(jsonb_build_object(
    'titulo', a.titulo,
    'severidade', a.severidade
  )) INTO v_anomalies
  FROM anomalias a
  WHERE a.status = 'aberta'
    AND (p_context_id IS NULL OR a.project_id = p_context_id);

  v_result := v_result || jsonb_build_object('open_anomalies', COALESCE(v_anomalies, '[]'::jsonb));

  RETURN v_result;
END;
$$;

-- 10. Register AI tools for IFEC
INSERT INTO ai_tool_registry (name, display_name, description, function_type, function_name, parameters_schema, requires_confirmation, ativo)
VALUES (
  'query_ifec_overview',
  'Visão IFEC',
  'Consulta o IFEC (Índice Físico de Eficiência) de todas as obras com comparação IEC vs IFEC e classificação de saúde',
  'view',
  'v_ifec_overview',
  '{"type": "object", "properties": {}, "required": []}',
  false,
  true
) ON CONFLICT (name) DO NOTHING;

INSERT INTO ai_tool_registry (name, display_name, description, function_type, function_name, parameters_schema, requires_confirmation, ativo)
VALUES (
  'query_progress_timeline',
  'Timeline Avanço Físico',
  'Consulta a linha do tempo de progresso previsto vs real de uma obra específica (para gráfico de avanço físico)',
  'view',
  'v_progress_timeline',
  '{"type": "object", "properties": {"project_id": {"type": "string", "description": "ID da obra"}}, "required": ["project_id"]}',
  false,
  true
) ON CONFLICT (name) DO NOTHING;
