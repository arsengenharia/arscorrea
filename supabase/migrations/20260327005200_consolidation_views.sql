-- ══════════════════════════════════════════════════════════════
-- ANALYTICAL VIEWS — pre-aggregated data for dashboards and AI
-- ══════════════════════════════════════════════════════════════

-- 1. Monthly consolidation by project
CREATE OR REPLACE VIEW v_monthly_by_project AS
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
ORDER BY mes DESC, p.name;

-- 2. Consolidation by supplier
CREATE OR REPLACE VIEW v_supplier_summary AS
SELECT
  s.id AS supplier_id,
  s.trade_name,
  s.document AS cnpj,
  COUNT(DISTINCT pfe.project_id) AS qtd_obras,
  COUNT(pfe.id) AS qtd_lancamentos,
  SUM(ABS(pfe.valor)) AS total_pago,
  MIN(pfe.data) AS primeiro_lancamento,
  MAX(pfe.data) AS ultimo_lancamento,
  AVG(ABS(pfe.valor)) AS ticket_medio
FROM suppliers s
LEFT JOIN project_financial_entries pfe ON pfe.supplier_id = s.id AND pfe.valor < 0
GROUP BY s.id, s.trade_name, s.document;

-- 3. Consolidation by category
CREATE OR REPLACE VIEW v_category_summary AS
SELECT
  fc.id AS category_id,
  fc.nome,
  fc.prefixo,
  fc.codigo,
  fc.e_receita,
  COUNT(pfe.id) AS qtd_lancamentos,
  SUM(CASE WHEN pfe.valor > 0 THEN pfe.valor ELSE 0 END) AS total_receita,
  SUM(CASE WHEN pfe.valor < 0 THEN ABS(pfe.valor) ELSE 0 END) AS total_custo,
  COUNT(DISTINCT pfe.project_id) AS qtd_obras,
  COUNT(DISTINCT pfe.supplier_id) AS qtd_fornecedores
FROM financial_categories fc
LEFT JOIN project_financial_entries pfe ON pfe.category_id = fc.id
GROUP BY fc.id, fc.nome, fc.prefixo, fc.codigo, fc.e_receita;

-- 4. Budget vs Actual by category per project
CREATE OR REPLACE VIEW v_budget_vs_actual AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  fc.id AS category_id,
  fc.nome AS categoria,
  fc.prefixo,
  COALESCE(pb.valor_previsto, 0) AS orcamento,
  COALESCE(SUM(ABS(pfe.valor)), 0) AS realizado,
  COALESCE(pb.valor_previsto, 0) - COALESCE(SUM(ABS(pfe.valor)), 0) AS diferenca,
  CASE
    WHEN COALESCE(pb.valor_previsto, 0) > 0
    THEN COALESCE(SUM(ABS(pfe.valor)), 0) / pb.valor_previsto
    ELSE NULL
  END AS iec_categoria  -- IEC per category
FROM projects p
CROSS JOIN financial_categories fc
LEFT JOIN project_budgets pb ON pb.project_id = p.id AND pb.category_id = fc.id
LEFT JOIN project_financial_entries pfe ON pfe.project_id = p.id AND pfe.category_id = fc.id AND pfe.valor < 0
WHERE fc.e_receita = false  -- only cost categories
GROUP BY p.id, p.name, fc.id, fc.nome, fc.prefixo, pb.valor_previsto;

-- 5. Cash flow projection (next 90 days from contract_payments)
CREATE OR REPLACE VIEW v_cash_flow_projection AS
SELECT
  cp.expected_date AS data_prevista,
  p.id AS project_id,
  p.name AS project_name,
  c.title AS contrato,
  cl.name AS cliente,
  cp.kind AS tipo,
  cp.expected_value AS valor_previsto,
  COALESCE(cp.received_value, 0) AS valor_recebido,
  cp.expected_value - COALESCE(cp.received_value, 0) AS saldo_a_receber,
  cp.status,
  CASE
    WHEN cp.expected_date < CURRENT_DATE AND cp.status != 'recebido' THEN 'vencido'
    WHEN cp.expected_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 THEN 'proximo_30d'
    WHEN cp.expected_date BETWEEN CURRENT_DATE + 31 AND CURRENT_DATE + 60 THEN 'proximo_60d'
    WHEN cp.expected_date BETWEEN CURRENT_DATE + 61 AND CURRENT_DATE + 90 THEN 'proximo_90d'
    ELSE 'futuro'
  END AS faixa
FROM contract_payments cp
JOIN contracts c ON c.id = cp.contract_id
JOIN projects p ON p.id = c.project_id
JOIN clients cl ON cl.id = c.client_id
WHERE cp.status != 'recebido'
ORDER BY cp.expected_date;

-- 6. Item price analysis (from nfe_items)
CREATE OR REPLACE VIEW v_item_price_analysis AS
SELECT
  ic.id AS catalog_id,
  ic.nome_padrao,
  ic.ncm,
  ic.categoria,
  ic.unidade_padrao,
  s.id AS supplier_id,
  s.trade_name AS fornecedor,
  COUNT(ni.id) AS qtd_compras,
  AVG(ni.valor_unitario) AS preco_medio,
  MIN(ni.valor_unitario) AS preco_minimo,
  MAX(ni.valor_unitario) AS preco_maximo,
  STDDEV(ni.valor_unitario) AS desvio_padrao,
  MAX(nfe.data_emissao) AS ultima_compra
FROM item_catalog ic
JOIN nfe_items ni ON ni.item_catalog_id = ic.id
JOIN nfe_inbox nfe ON nfe.id = ni.nfe_inbox_id
LEFT JOIN suppliers s ON s.id = ni.supplier_id
WHERE ni.valor_unitario > 0
GROUP BY ic.id, ic.nome_padrao, ic.ncm, ic.categoria, ic.unidade_padrao, s.id, s.trade_name;
