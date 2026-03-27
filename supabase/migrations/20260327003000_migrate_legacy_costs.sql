-- Migrate legacy project_costs to project_financial_entries
INSERT INTO project_financial_entries (
  project_id, bank_account_id, category_id, data, valor,
  tipo_documento, situacao, observacoes, created_at
)
SELECT
  pc.project_id,
  COALESCE(p.bank_account_id, (SELECT id FROM bank_accounts WHERE ativo = true LIMIT 1)),
  CASE
    WHEN pc.cost_type = 'Direto' THEN (SELECT id FROM financial_categories WHERE codigo = 'materiais_obra' LIMIT 1)
    WHEN pc.cost_type = 'Indireto' THEN (SELECT id FROM financial_categories WHERE codigo = 'custo_administrativo' LIMIT 1)
    ELSE (SELECT id FROM financial_categories WHERE codigo = 'materiais_obra' LIMIT 1)
  END,
  COALESCE(pc.record_date, pc.created_at::date),
  -ABS(COALESCE(pc.actual_value, pc.expected_value, 0)),
  'Outros',
  'pendente',
  CONCAT('Migrado de project_costs: ', COALESCE(pc.description, pc.cost_type)),
  pc.created_at
FROM project_costs pc
JOIN projects p ON p.id = pc.project_id
WHERE COALESCE(pc.actual_value, pc.expected_value, 0) != 0
AND NOT EXISTS (
  SELECT 1 FROM project_financial_entries pfe
  WHERE pfe.project_id = pc.project_id
    AND pfe.data = COALESCE(pc.record_date, pc.created_at::date)
    AND ABS(pfe.valor) = ABS(COALESCE(pc.actual_value, pc.expected_value, 0))
    AND pfe.observacoes LIKE '%Migrado de project_costs%'
);

-- Migrate legacy project_revenues to project_financial_entries
INSERT INTO project_financial_entries (
  project_id, bank_account_id, category_id, data, valor,
  tipo_documento, situacao, observacoes, created_at
)
SELECT
  pr.project_id,
  COALESCE(p.bank_account_id, (SELECT id FROM bank_accounts WHERE ativo = true LIMIT 1)),
  (SELECT id FROM financial_categories WHERE codigo = 'aporte_clientes' LIMIT 1),
  COALESCE(pr.record_date, pr.created_at::date),
  ABS(COALESCE(pr.actual_value, pr.expected_value, 0)),
  'Outros',
  'pendente',
  CONCAT('Migrado de project_revenues: ', COALESCE(pr.description, pr.revenue_type)),
  pr.created_at
FROM project_revenues pr
JOIN projects p ON p.id = pr.project_id
WHERE COALESCE(pr.actual_value, pr.expected_value, 0) != 0
AND NOT EXISTS (
  SELECT 1 FROM project_financial_entries pfe
  WHERE pfe.project_id = pr.project_id
    AND pfe.data = COALESCE(pr.record_date, pr.created_at::date)
    AND ABS(pfe.valor) = ABS(COALESCE(pr.actual_value, pr.expected_value, 0))
    AND pfe.observacoes LIKE '%Migrado de project_revenues%'
);

-- Recalculate all project balances
DO $$
DECLARE proj RECORD;
BEGIN
  FOR proj IN SELECT DISTINCT id FROM projects LOOP
    PERFORM calc_project_balance(proj.id);
  END LOOP;
END $$;

-- Mark legacy tables as deprecated
COMMENT ON TABLE project_costs IS 'DEPRECATED v0 — dados migrados para project_financial_entries em 2026-03-27';
COMMENT ON TABLE project_revenues IS 'DEPRECATED v0 — dados migrados para project_financial_entries em 2026-03-27';
COMMENT ON TABLE contract_financial IS 'DEPRECATED v1 — substituído por contract_payments + project_financial_entries';
