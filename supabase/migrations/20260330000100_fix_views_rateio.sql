-- Drop views first to allow column order changes
DROP VIEW IF EXISTS v_budget_vs_actual;
DROP VIEW IF EXISTS v_category_summary;
DROP VIEW IF EXISTS v_monthly_by_project;

-- Fix v_monthly_by_project: include rateio
CREATE VIEW v_monthly_by_project AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  date_trunc('month', pfe.data)::date AS mes,
  fc.prefixo AS tipo,
  fc.nome AS categoria,
  fc.id AS category_id,
  SUM(CASE WHEN pfe.valor > 0 THEN pfe.valor ELSE 0 END) AS receita,
  SUM(CASE WHEN pfe.valor < 0 THEN ABS(pfe.valor) ELSE 0 END) AS custo,
  SUM(pfe.valor) AS saldo,
  COUNT(*) AS qtd_lancamentos
FROM project_financial_entries pfe
JOIN projects p ON p.id = pfe.project_id
JOIN financial_categories fc ON fc.id = pfe.category_id
GROUP BY p.id, p.name, date_trunc('month', pfe.data), fc.prefixo, fc.nome, fc.id

UNION ALL

-- Add rateio allocations
SELECT
  ca.project_id,
  p.name AS project_name,
  date_trunc('month', ca.data_rateio)::date AS mes,
  'ADM' AS tipo,
  'Rateio ADM' AS categoria,
  NULL AS category_id,
  0 AS receita,
  ABS(ca.valor_alocado) AS custo,
  ca.valor_alocado AS saldo,
  1 AS qtd_lancamentos
FROM cost_allocations ca
JOIN projects p ON p.id = ca.project_id

ORDER BY mes DESC, project_name;

-- Fix v_category_summary: include rateio and cor_hex
CREATE VIEW v_category_summary AS
SELECT
  fc.id AS category_id,
  fc.nome,
  fc.prefixo,
  fc.codigo,
  fc.e_receita,
  fc.cor_hex,
  COUNT(pfe.id) AS qtd_lancamentos,
  SUM(CASE WHEN pfe.valor > 0 THEN pfe.valor ELSE 0 END) AS total_receita,
  SUM(CASE WHEN pfe.valor < 0 THEN ABS(pfe.valor) ELSE 0 END) AS total_custo,
  COUNT(DISTINCT pfe.project_id) AS qtd_obras,
  COUNT(DISTINCT pfe.supplier_id) AS qtd_fornecedores
FROM financial_categories fc
LEFT JOIN project_financial_entries pfe ON pfe.category_id = fc.id
GROUP BY fc.id, fc.nome, fc.prefixo, fc.codigo, fc.e_receita, fc.cor_hex;

-- Fix v_budget_vs_actual: include rateio in realizado and add cor_hex
CREATE VIEW v_budget_vs_actual AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  fc.id AS category_id,
  fc.nome AS categoria,
  fc.prefixo,
  fc.cor_hex,
  COALESCE(pb.valor_previsto, 0) AS orcamento,
  COALESCE(costs.total, 0) + COALESCE(rateio.total, 0) AS realizado,
  COALESCE(pb.valor_previsto, 0) - (COALESCE(costs.total, 0) + COALESCE(rateio.total, 0)) AS diferenca,
  CASE
    WHEN COALESCE(pb.valor_previsto, 0) > 0
    THEN (COALESCE(costs.total, 0) + COALESCE(rateio.total, 0)) / pb.valor_previsto
    ELSE NULL
  END AS iec_categoria
FROM projects p
CROSS JOIN financial_categories fc
LEFT JOIN project_budgets pb ON pb.project_id = p.id AND pb.category_id = fc.id
LEFT JOIN LATERAL (
  SELECT SUM(ABS(pfe.valor)) AS total
  FROM project_financial_entries pfe
  WHERE pfe.project_id = p.id AND pfe.category_id = fc.id AND pfe.valor < 0
) costs ON true
LEFT JOIN LATERAL (
  SELECT SUM(ABS(ca.valor_alocado)) AS total
  FROM cost_allocations ca
  WHERE ca.project_id = p.id
  -- Rateio goes to ADM category
) rateio ON fc.prefixo = 'ADM'
WHERE fc.e_receita = false
GROUP BY p.id, p.name, fc.id, fc.nome, fc.prefixo, fc.cor_hex, pb.valor_previsto, costs.total, rateio.total;
