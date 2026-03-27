-- ══════════════════════════════════════════════════════════════
-- ANOMALY DETECTION — callable function that scans for issues
-- Run periodically or on-demand
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION detect_financial_anomalies()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer := 0;
  v_delta integer := 0;
  v_row RECORD;
BEGIN

  -- 1. Lançamentos sem conciliação > 7 dias
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, project_id, entry_id, detectado_por)
  SELECT
    'lancamento_sem_conciliacao',
    CASE WHEN pfe.created_at < now() - interval '30 days' THEN 'alta' ELSE 'media' END,
    'Lançamento sem conciliação há ' || EXTRACT(DAY FROM now() - pfe.created_at)::integer || ' dias',
    'O lançamento de ' || pfe.valor || ' na obra ' || p.name || ' está pendente de conciliação bancária.',
    pfe.project_id,
    pfe.id,
    'sistema'
  FROM project_financial_entries pfe
  JOIN projects p ON p.id = pfe.project_id
  WHERE pfe.situacao = 'pendente'
    AND pfe.created_at < now() - interval '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a
      WHERE a.entry_id = pfe.id
        AND a.tipo = 'lancamento_sem_conciliacao'
        AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 2. Orçamento estourado por categoria
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, project_id, valor_esperado, valor_encontrado, percentual_desvio, detectado_por)
  SELECT
    'orcamento_estourado',
    CASE WHEN bva.realizado > bva.orcamento * 1.5 THEN 'critica' ELSE 'alta' END,
    'Orçamento estourado: ' || bva.categoria || ' na obra ' || bva.project_name,
    'Realizado R$ ' || bva.realizado || ' vs orçamento R$ ' || bva.orcamento || ' (' || ROUND(bva.iec_categoria * 100) || '% do previsto).',
    bva.project_id,
    bva.orcamento,
    bva.realizado,
    ROUND((bva.iec_categoria - 1) * 100, 1),
    'sistema'
  FROM v_budget_vs_actual bva
  WHERE bva.orcamento > 0
    AND bva.iec_categoria > 1.0
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a
      WHERE a.project_id = bva.project_id
        AND a.tipo = 'orcamento_estourado'
        AND a.status IN ('aberta', 'em_analise')
        AND a.evidencia_json->>'category_id' = bva.category_id::text
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 3. Lançamento de alto valor sem NF-e
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, project_id, entry_id, valor_encontrado, detectado_por)
  SELECT
    'lancamento_sem_nfe',
    'media',
    'Pagamento de R$ ' || ABS(pfe.valor) || ' sem NF-e vinculada',
    'Lançamento na obra ' || p.name || ' de R$ ' || ABS(pfe.valor) || ' sem nota fiscal. Tipo: ' || pfe.tipo_documento,
    pfe.project_id,
    pfe.id,
    ABS(pfe.valor),
    'sistema'
  FROM project_financial_entries pfe
  JOIN projects p ON p.id = pfe.project_id
  WHERE pfe.valor < -1000  -- only flag costs > R$ 1000
    AND pfe.chave_nfe IS NULL
    AND pfe.nota_fiscal IS NULL
    AND pfe.tipo_documento != 'NF-e'
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a
      WHERE a.entry_id = pfe.id
        AND a.tipo = 'lancamento_sem_nfe'
        AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 4. Divergência contrato vs recebido (parcelas com desvio > 10%)
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, contract_id, valor_esperado, valor_encontrado, percentual_desvio, detectado_por)
  SELECT
    'divergencia_contrato',
    'alta',
    'Recebimento divergente: parcela do contrato ' || c.title,
    'Parcela esperava R$ ' || cp.expected_value || ' mas recebeu R$ ' || cp.received_value || '.',
    cp.contract_id,
    cp.expected_value,
    cp.received_value,
    ROUND(((cp.received_value - cp.expected_value) / NULLIF(cp.expected_value, 0)) * 100, 1),
    'sistema'
  FROM contract_payments cp
  JOIN contracts c ON c.id = cp.contract_id
  WHERE cp.status = 'recebido'
    AND cp.received_value IS NOT NULL
    AND cp.expected_value > 0
    AND ABS(cp.received_value - cp.expected_value) / cp.expected_value > 0.10
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a
      WHERE a.contract_id = cp.contract_id
        AND a.tipo = 'divergencia_contrato'
        AND a.status IN ('aberta', 'em_analise')
        AND a.valor_esperado = cp.expected_value
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  RETURN v_count;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- MARGIN SNAPSHOT — function to capture monthly margin snapshots
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION capture_margin_snapshots()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_mes date := date_trunc('month', now())::date;
  v_count integer;
BEGIN
  INSERT INTO margin_snapshots (project_id, mes, receita, custo, saldo, margem, iec)
  SELECT
    p.id,
    v_mes,
    COALESCE(p.receita_realizada, 0),
    COALESCE(p.custo_realizado, 0),
    COALESCE(p.saldo_atual, 0),
    COALESCE(p.margem_atual, 0),
    p.iec_atual
  FROM projects p
  WHERE p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')
  ON CONFLICT (project_id, mes) DO UPDATE SET
    receita = EXCLUDED.receita,
    custo = EXCLUDED.custo,
    saldo = EXCLUDED.saldo,
    margem = EXCLUDED.margem,
    iec = EXCLUDED.iec;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
