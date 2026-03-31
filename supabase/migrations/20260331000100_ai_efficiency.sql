-- AI Efficiency: Register missing tools + knowledge dedup

-- 1. Register search_projects tool
INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema, requires_confirmation, ativo)
VALUES (
  'search_projects',
  'Buscar Obras',
  'Busca obras por nome parcial, status ou gestor. Use para encontrar obras por nome.',
  'query',
  'direct_query',
  'projects',
  '{"type":"object","properties":{"name":{"type":"string","description":"Nome parcial da obra"},"status":{"type":"string","description":"Status da obra"}},"required":[]}',
  false,
  true
) ON CONFLICT (name) DO NOTHING;

-- 2. Register search_suppliers tool
INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema, requires_confirmation, ativo)
VALUES (
  'search_suppliers',
  'Buscar Fornecedores',
  'Busca fornecedores por nome parcial, CNPJ ou cidade.',
  'query',
  'direct_query',
  'suppliers',
  '{"type":"object","properties":{"trade_name":{"type":"string","description":"Nome parcial do fornecedor"},"document":{"type":"string","description":"CNPJ completo ou parcial"},"cidade":{"type":"string","description":"Cidade do fornecedor"}},"required":[]}',
  false,
  true
) ON CONFLICT (name) DO NOTHING;

-- 3. Register search_documents tool (activates RAG)
INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema, requires_confirmation, ativo)
VALUES (
  'search_documents',
  'Buscar Documentos',
  'Busca em notas fiscais, contratos e documentos indexados. Usa busca por texto completo em portugues.',
  'query',
  'direct_query',
  'document_summaries',
  '{"type":"object","properties":{"q":{"type":"string","description":"Termo de busca em texto livre"},"project_id":{"type":"string","description":"ID da obra para filtrar"},"supplier_id":{"type":"string","description":"ID do fornecedor para filtrar"}},"required":[]}',
  false,
  true
) ON CONFLICT (name) DO NOTHING;

-- 4. Enable pg_trgm for knowledge deduplication
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 5. Function to check knowledge similarity before insert
CREATE OR REPLACE FUNCTION check_knowledge_dedup()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_existing_id uuid;
BEGIN
  SELECT id INTO v_existing_id
  FROM ai_knowledge
  WHERE scope_type = NEW.scope_type
    AND tipo = NEW.tipo
    AND ativo = true
    AND (scope_id = NEW.scope_id OR (scope_id IS NULL AND NEW.scope_id IS NULL))
    AND similarity(conteudo, NEW.conteudo) > 0.6
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE ai_knowledge
    SET confianca = GREATEST(confianca, NEW.confianca),
        vezes_usado = vezes_usado + 1,
        updated_at = now()
    WHERE id = v_existing_id;
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Attach trigger
DROP TRIGGER IF EXISTS trg_knowledge_dedup ON ai_knowledge;
CREATE TRIGGER trg_knowledge_dedup
  BEFORE INSERT ON ai_knowledge
  FOR EACH ROW EXECUTE FUNCTION check_knowledge_dedup();
