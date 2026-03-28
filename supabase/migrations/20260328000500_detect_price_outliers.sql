-- Add price outlier detection to the anomaly detection system
-- Items where unit price > 2x the average for the same NCM

CREATE OR REPLACE FUNCTION detect_price_outliers()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer := 0;
  v_delta integer;
BEGIN

  -- Items with price > 2x average for same NCM (with at least 3 data points)
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, supplier_id, project_id, valor_esperado, valor_encontrado, percentual_desvio, detectado_por, evidencia_json)
  SELECT
    'preco_acima_media',
    CASE WHEN ni.valor_unitario > avg_stats.preco_medio * 3 THEN 'alta' ELSE 'media' END,
    'Preço acima da média: ' || ni.descricao_original,
    'O item "' || ni.descricao_original || '" (NCM ' || ni.ncm || ') do fornecedor ' || COALESCE(s.trade_name, 'desconhecido') ||
    ' custou R$ ' || ROUND(ni.valor_unitario::numeric, 2) || '/un, enquanto a média é R$ ' || ROUND(avg_stats.preco_medio::numeric, 2) ||
    '/un (' || ROUND(((ni.valor_unitario / NULLIF(avg_stats.preco_medio, 0)) * 100)::numeric - 100) || '% acima).',
    ni.supplier_id,
    ni.project_id,
    ROUND(avg_stats.preco_medio::numeric, 2),
    ROUND(ni.valor_unitario::numeric, 2),
    ROUND(((ni.valor_unitario / NULLIF(avg_stats.preco_medio, 0)) - 1) * 100, 1),
    'sistema',
    jsonb_build_object(
      'ncm', ni.ncm,
      'item_catalog_id', ni.item_catalog_id,
      'nfe_inbox_id', ni.nfe_inbox_id,
      'preco_medio', ROUND(avg_stats.preco_medio::numeric, 2),
      'preco_minimo', ROUND(avg_stats.preco_minimo::numeric, 2),
      'preco_maximo', ROUND(avg_stats.preco_maximo::numeric, 2),
      'qtd_amostras', avg_stats.qtd_amostras
    )
  FROM nfe_items ni
  LEFT JOIN suppliers s ON s.id = ni.supplier_id
  CROSS JOIN LATERAL (
    SELECT
      AVG(ni2.valor_unitario) as preco_medio,
      MIN(ni2.valor_unitario) as preco_minimo,
      MAX(ni2.valor_unitario) as preco_maximo,
      COUNT(*) as qtd_amostras
    FROM nfe_items ni2
    WHERE ni2.ncm = ni.ncm
      AND ni2.valor_unitario > 0
      AND ni2.id != ni.id
  ) avg_stats
  WHERE ni.valor_unitario > 0
    AND avg_stats.qtd_amostras >= 2  -- need at least 2 other data points
    AND ni.valor_unitario > avg_stats.preco_medio * 2  -- > 2x average
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a
      WHERE a.tipo = 'preco_acima_media'
        AND a.evidencia_json->>'nfe_inbox_id' = ni.nfe_inbox_id::text
        AND a.valor_encontrado = ROUND(ni.valor_unitario::numeric, 2)
        AND a.status IN ('aberta', 'em_analise')
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Update the daily cron to also call detect_price_outliers
-- (Note: this requires pg_cron to be enabled)
