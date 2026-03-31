-- Insights Panel: risks view, projections function, cron

-- 1. Add projection cache column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS projecao_json jsonb;

-- 2. Unified risks view
CREATE OR REPLACE VIEW v_insights_risks AS

SELECT
  'nfe_pendente' AS risk_type,
  CASE WHEN EXTRACT(EPOCH FROM now() - n.created_at) / 3600 > 120 THEN 'critica'
       WHEN EXTRACT(EPOCH FROM now() - n.created_at) / 3600 > 48 THEN 'alta'
       ELSE 'media' END AS severidade,
  NULL::uuid AS project_id,
  n.razao_social AS project_name,
  'NF-e de ' || COALESCE(n.razao_social, 'desconhecido') || ' (R$ ' || COALESCE(n.valor_total::text, '?') || ') pendente' AS descricao,
  ROUND(EXTRACT(EPOCH FROM now() - n.created_at) / 3600)::int AS age_hours,
  'navigate' AS action_type,
  '/financeiro/nfe?status=pendente' AS action_target,
  jsonb_build_object('nfe_id', n.id, 'valor', n.valor_total, 'fornecedor', n.razao_social) AS metadata
FROM nfe_inbox n
WHERE n.status = 'aguardando_revisao'
  AND n.created_at < now() - interval '48 hours'

UNION ALL

SELECT
  'conciliacao_atrasada',
  'media',
  e.project_id,
  p.name,
  'Lancamento de R$ ' || ABS(e.valor)::text || ' em ' || p.name || ' sem conciliacao',
  ROUND(EXTRACT(EPOCH FROM now() - e.created_at) / 3600)::int,
  'navigate',
  '/financeiro/conciliacao?project_id=' || e.project_id::text,
  jsonb_build_object('entry_id', e.id, 'valor', e.valor)
FROM project_financial_entries e
JOIN projects p ON p.id = e.project_id
WHERE e.situacao = 'pendente'
  AND e.created_at < now() - interval '7 days'

UNION ALL

SELECT
  'orcamento_estourado',
  'critica',
  p.id,
  p.name,
  'Obra ' || p.name || ' com IEC ' || ROUND(p.iec_atual::numeric, 3)::text || ' — orcamento estourado',
  0,
  'navigate',
  '/financeiro/indicadores?project_id=' || p.id::text,
  jsonb_build_object('iec', p.iec_atual, 'custo', p.custo_realizado, 'orcamento', p.orcamento_previsto)
FROM projects p
WHERE p.iec_atual > 1.0
  AND p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')

UNION ALL

SELECT
  'orcamento_proximo',
  'media',
  p.id,
  p.name,
  'Obra ' || p.name || ' com IEC ' || ROUND(p.iec_atual::numeric, 3)::text || ' — proximo do limite',
  0,
  'navigate',
  '/financeiro/indicadores?project_id=' || p.id::text,
  jsonb_build_object('iec', p.iec_atual, 'custo', p.custo_realizado, 'orcamento', p.orcamento_previsto)
FROM projects p
WHERE p.iec_atual > 0.85 AND p.iec_atual <= 1.0
  AND p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')

UNION ALL

SELECT
  'sem_medicao',
  'alta',
  p.id,
  p.name,
  'Obra ' || p.name || ' sem medicao ha mais de 45 dias',
  COALESCE(ROUND(EXTRACT(EPOCH FROM now() - (SELECT MAX(periodo_fim) FROM medicoes WHERE project_id = p.id)) / 3600)::int, 9999),
  'navigate',
  '/obras/' || p.id::text || '/medicoes',
  jsonb_build_object('ultima_medicao', (SELECT MAX(periodo_fim) FROM medicoes WHERE project_id = p.id))
FROM projects p
WHERE p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')
  AND (
    NOT EXISTS (SELECT 1 FROM medicoes WHERE project_id = p.id)
    OR (SELECT MAX(periodo_fim) FROM medicoes WHERE project_id = p.id) < CURRENT_DATE - 45
  )

UNION ALL

SELECT
  'parcela_vencida',
  'alta',
  c.project_id,
  p.name,
  'Parcela de R$ ' || cp.expected_value::text || ' vencida em ' || to_char(cp.expected_date, 'DD/MM/YYYY') || ' — ' || p.name,
  ROUND(EXTRACT(EPOCH FROM now() - cp.expected_date::timestamptz) / 3600)::int,
  'inline',
  'marcar_recebido',
  jsonb_build_object('payment_id', cp.id, 'valor', cp.expected_value, 'vencimento', cp.expected_date)
FROM contract_payments cp
JOIN contracts c ON c.id = cp.contract_id
JOIN projects p ON p.id = c.project_id
WHERE cp.expected_date < CURRENT_DATE
  AND cp.status != 'pago'

UNION ALL

SELECT
  'sem_orcamento',
  'baixa',
  p.id,
  p.name,
  'Obra ' || p.name || ' sem orcamento previsto definido',
  0,
  'inline',
  'definir_orcamento',
  jsonb_build_object('project_id', p.id)
FROM projects p
WHERE p.orcamento_previsto IS NULL
  AND p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')

UNION ALL

SELECT
  'fornecedor_sem_categoria',
  'baixa',
  NULL,
  s.trade_name,
  'Fornecedor ' || s.trade_name || ' sem categoria padrao (' || cnt.total::text || ' lancamentos)',
  0,
  'inline',
  'atribuir_categoria',
  jsonb_build_object('supplier_id', s.id, 'trade_name', s.trade_name, 'total_lancamentos', cnt.total)
FROM suppliers s
JOIN (
  SELECT supplier_id, COUNT(*) AS total
  FROM project_financial_entries
  WHERE supplier_id IS NOT NULL
  GROUP BY supplier_id
  HAVING COUNT(*) >= 3
) cnt ON cnt.supplier_id = s.id
WHERE s.categoria_padrao_id IS NULL
  AND s.ativo = true;


-- 3. Projection calculation function
CREATE OR REPLACE FUNCTION calc_project_projections(p_project_id uuid)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_orcamento numeric;
  v_custo numeric;
  v_burn_rates numeric[];
  v_burn_rate numeric;
  v_restante numeric;
  v_meses_restantes numeric;
  v_data_estouro date;
  v_margem_3m numeric[];
  v_margem_atual numeric;
  v_tendencia text;
  v_status text;
  v_obra_parada boolean;
  v_ifec numeric;
  v_ifec_status text;
  rec record;
BEGIN
  SELECT orcamento_previsto, custo_realizado, margem_atual, ifec_atual
  INTO v_orcamento, v_custo, v_margem_atual, v_ifec
  FROM projects WHERE id = p_project_id;

  v_burn_rates := ARRAY[]::numeric[];
  FOR rec IN
    SELECT mes, SUM(custo) AS custo_mes
    FROM v_monthly_by_project
    WHERE project_id = p_project_id
      AND mes >= (date_trunc('month', CURRENT_DATE) - interval '3 months')::date
      AND mes < date_trunc('month', CURRENT_DATE)::date
    GROUP BY mes ORDER BY mes
  LOOP
    v_burn_rates := array_append(v_burn_rates, rec.custo_mes);
  END LOOP;

  IF array_length(v_burn_rates, 1) > 0 THEN
    v_burn_rate := 0;
    FOR i IN 1..array_length(v_burn_rates, 1) LOOP
      v_burn_rate := v_burn_rate + v_burn_rates[i];
    END LOOP;
    v_burn_rate := v_burn_rate / array_length(v_burn_rates, 1);
  ELSE
    v_burn_rate := 0;
  END IF;

  v_restante := COALESCE(v_orcamento, 0) - COALESCE(v_custo, 0);

  IF v_burn_rate > 0 AND v_restante > 0 THEN
    v_meses_restantes := v_restante / v_burn_rate;
    v_data_estouro := CURRENT_DATE + (v_meses_restantes * 30)::int;
  ELSIF v_restante <= 0 AND COALESCE(v_orcamento, 0) > 0 THEN
    v_meses_restantes := 0;
    v_data_estouro := CURRENT_DATE;
  ELSE
    v_meses_restantes := NULL;
    v_data_estouro := NULL;
  END IF;

  v_margem_3m := ARRAY[]::numeric[];
  FOR rec IN
    SELECT margem FROM margin_snapshots
    WHERE project_id = p_project_id
    ORDER BY mes DESC LIMIT 3
  LOOP
    v_margem_3m := array_append(v_margem_3m, rec.margem);
  END LOOP;

  IF array_length(v_margem_3m, 1) >= 3 AND v_margem_3m[1] < v_margem_3m[2] AND v_margem_3m[2] < v_margem_3m[3] THEN
    v_tendencia := 'queda';
  ELSIF array_length(v_margem_3m, 1) >= 3 AND v_margem_3m[1] > v_margem_3m[2] AND v_margem_3m[2] > v_margem_3m[3] THEN
    v_tendencia := 'alta';
  ELSE
    v_tendencia := 'estavel';
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM project_financial_entries
    WHERE project_id = p_project_id AND created_at > now() - interval '30 days'
  ) INTO v_obra_parada;

  IF v_ifec IS NULL THEN v_ifec_status := 'sem_dados';
  ELSIF v_ifec >= 1.0 THEN v_ifec_status := 'eficiente';
  ELSIF v_ifec >= 0.8 THEN v_ifec_status := 'atencao';
  ELSE v_ifec_status := 'critico';
  END IF;

  IF v_obra_parada THEN v_status := 'parada';
  ELSIF v_meses_restantes IS NOT NULL AND v_meses_restantes < 1 THEN v_status := 'critico';
  ELSIF v_meses_restantes IS NOT NULL AND v_meses_restantes < 3 THEN v_status := 'alerta';
  ELSIF v_tendencia = 'queda' THEN v_status := 'alerta';
  ELSIF v_ifec_status = 'critico' THEN v_status := 'alerta';
  ELSE v_status := 'saudavel';
  END IF;

  RETURN jsonb_build_object(
    'burn_rate_mensal', ROUND(COALESCE(v_burn_rate, 0), 2),
    'orcamento_restante', ROUND(COALESCE(v_restante, 0), 2),
    'meses_restantes', CASE WHEN v_meses_restantes IS NOT NULL THEN ROUND(v_meses_restantes, 2) ELSE NULL END,
    'data_estouro_prevista', v_data_estouro,
    'tendencia_margem', v_tendencia,
    'margem_3m', to_jsonb(v_margem_3m),
    'status', v_status,
    'obra_parada', v_obra_parada,
    'ifec_status', v_ifec_status,
    'updated_at', now()
  );
END;
$$;

-- 4. Batch projection calculation
CREATE OR REPLACE FUNCTION calc_all_projections()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT id FROM projects
    WHERE status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')
  LOOP
    UPDATE projects SET projecao_json = calc_project_projections(rec.id) WHERE id = rec.id;
  END LOOP;
END;
$$;

-- 5. Schedule daily cron
SELECT cron.schedule('calc-projections-daily', '5 6 * * *', $$SELECT calc_all_projections()$$);

-- 6. Run once now
SELECT calc_all_projections();
