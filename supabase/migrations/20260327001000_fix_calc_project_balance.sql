-- Fix: Include cost_allocations in project balance calculation
CREATE OR REPLACE FUNCTION calc_project_balance(p_project_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_receita    numeric;
  v_custo      numeric;
  v_custo_rateio numeric;
  v_orcamento  numeric;
  v_custo_total numeric;
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

  UPDATE projects SET
    saldo_atual        = v_receita - v_custo_total,
    custo_realizado    = v_custo_total,
    receita_realizada  = v_receita,
    margem_atual       = CASE WHEN v_receita > 0 THEN ((v_receita - v_custo_total) / v_receita * 100) ELSE 0 END,
    iec_atual          = CASE WHEN v_orcamento > 0 THEN (v_custo_total / v_orcamento) ELSE NULL END
  WHERE id = p_project_id;
END;
$$;
