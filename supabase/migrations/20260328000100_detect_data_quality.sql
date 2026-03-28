-- ══════════════════════════════════════════════════════════════
-- DATA QUALITY DETECTION — scans for incomplete/stale data
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION detect_data_quality_issues()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer := 0;
  v_delta integer;
BEGIN

  -- 1. Obra sem datas definidas
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, project_id, detectado_por)
  SELECT
    'outro', 'media',
    'Obra sem datas definidas: ' || p.name,
    'A obra ' || p.name || ' não possui data de início e/ou conclusão prevista. Isso compromete projeções de prazo e cronograma.',
    p.id, 'sistema'
  FROM projects p
  WHERE (p.start_date IS NULL OR p.end_date IS NULL)
    AND p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a WHERE a.project_id = p.id AND a.titulo LIKE 'Obra sem datas%' AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 2. Obra sem gestor responsável
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, project_id, detectado_por)
  SELECT
    'outro', 'baixa',
    'Obra sem gestor: ' || p.name,
    'A obra ' || p.name || ' não possui gestor responsável definido.',
    p.id, 'sistema'
  FROM projects p
  WHERE p.project_manager IS NULL
    AND p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a WHERE a.project_id = p.id AND a.titulo LIKE 'Obra sem gestor%' AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 3. Obra ativa sem contrato vinculado
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, project_id, detectado_por)
  SELECT
    'outro', 'alta',
    'Obra sem contrato: ' || p.name,
    'A obra ' || p.name || ' está ativa mas não possui nenhum contrato vinculado. Sem contrato não há cronograma de recebíveis.',
    p.id, 'sistema'
  FROM projects p
  WHERE p.status IN ('Em Andamento', 'em andamento', 'em_andamento', 'iniciado')
    AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.project_id = p.id)
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a WHERE a.project_id = p.id AND a.titulo LIKE 'Obra sem contrato%' AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 4. Obra parada >30 dias (sem lançamento, etapa ou medição recente)
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, project_id, detectado_por)
  SELECT
    'outro', 'alta',
    'Obra parada há mais de 30 dias: ' || p.name,
    'A obra ' || p.name || ' não registra atividade (lançamentos, etapas ou medições) nos últimos 30 dias.',
    p.id, 'sistema'
  FROM projects p
  WHERE p.status IN ('Em Andamento', 'em andamento', 'em_andamento', 'iniciado')
    AND NOT EXISTS (
      SELECT 1 FROM project_financial_entries pfe WHERE pfe.project_id = p.id AND pfe.created_at > now() - interval '30 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM stages s WHERE s.project_id = p.id AND s.created_at > now() - interval '30 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM medicoes m WHERE m.project_id = p.id AND m.created_at > now() - interval '30 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a WHERE a.project_id = p.id AND a.titulo LIKE 'Obra parada%' AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 5. Contrato sem valor total
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, contract_id, detectado_por)
  SELECT
    'divergencia_contrato', 'alta',
    'Contrato sem valor: ' || c.title,
    'O contrato "' || c.title || '" não possui valor total definido.',
    c.id, 'sistema'
  FROM contracts c
  WHERE (c.total IS NULL OR c.total = 0)
    AND c.status IN ('ativo', 'em_assinatura')
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a WHERE a.contract_id = c.id AND a.titulo LIKE 'Contrato sem valor%' AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 6. Fornecedor auto-criado incompleto
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, supplier_id, detectado_por)
  SELECT
    'outro', 'media',
    'Fornecedor incompleto: ' || s.trade_name,
    'O fornecedor ' || s.trade_name || ' foi criado automaticamente via NF-e e precisa de dados complementares (contato, endereço).',
    s.id, 'sistema'
  FROM suppliers s
  WHERE s.observacoes LIKE '%automatico%'
    AND (s.phone IS NULL AND s.email IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a WHERE a.supplier_id = s.id AND a.titulo LIKE 'Fornecedor incompleto%' AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 7. Cliente sem contato
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, detectado_por, evidencia_json)
  SELECT
    'outro', 'baixa',
    'Cliente sem contato: ' || cl.name,
    'O cliente ' || cl.name || ' não possui email nem telefone cadastrado.',
    'sistema',
    jsonb_build_object('client_id', cl.id)
  FROM clients cl
  WHERE cl.email IS NULL AND cl.phone IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a WHERE a.titulo LIKE 'Cliente sem contato: ' || cl.name AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 8. Proposta aberta vencida (validade expirada)
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, detectado_por, evidencia_json)
  SELECT
    'outro', 'media',
    'Proposta vencida em aberto: #' || p.number,
    'A proposta #' || p.number || ' para ' || COALESCE(c.name, 'cliente') || ' está aberta mas já passou da data de fechamento prevista.',
    'sistema',
    jsonb_build_object('proposal_id', p.id)
  FROM proposals p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.status NOT IN ('won', 'lost')
    AND p.expected_close_date IS NOT NULL
    AND p.expected_close_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a WHERE a.evidencia_json->>'proposal_id' = p.id::text AND a.titulo LIKE 'Proposta vencida%' AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 9. Lançamento >R$500 sem fornecedor
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, project_id, entry_id, valor_encontrado, detectado_por)
  SELECT
    'lancamento_sem_nfe', 'baixa',
    'Lançamento sem fornecedor: R$ ' || ABS(pfe.valor) || ' na obra ' || pr.name,
    'Lançamento de R$ ' || ABS(pfe.valor) || ' em ' || pfe.data || ' não possui fornecedor vinculado.',
    pfe.project_id, pfe.id, ABS(pfe.valor), 'sistema'
  FROM project_financial_entries pfe
  JOIN projects pr ON pr.id = pfe.project_id
  WHERE pfe.supplier_id IS NULL
    AND pfe.valor < -500
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a WHERE a.entry_id = pfe.id AND a.titulo LIKE 'Lançamento sem fornecedor%' AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  -- 10. Medição em rascunho atrasada (>15 dias após período)
  INSERT INTO anomalies (tipo, severidade, titulo, descricao, project_id, detectado_por)
  SELECT
    'medicao_vs_faturamento', 'alta',
    'Medição atrasada: #' || m.numero || ' da obra ' || pr.name,
    'A medição #' || m.numero || ' (período até ' || m.periodo_fim || ') está em rascunho há mais de 15 dias.',
    m.project_id, 'sistema'
  FROM medicoes m
  JOIN projects pr ON pr.id = m.project_id
  WHERE m.status = 'rascunho'
    AND m.periodo_fim < CURRENT_DATE - 15
    AND NOT EXISTS (
      SELECT 1 FROM anomalies a WHERE a.project_id = m.project_id AND a.titulo LIKE 'Medição atrasada: #' || m.numero || '%' AND a.status IN ('aberta', 'em_analise')
    );
  GET DIAGNOSTICS v_delta = ROW_COUNT;
  v_count := v_count + v_delta;

  RETURN v_count;
END;
$$;
