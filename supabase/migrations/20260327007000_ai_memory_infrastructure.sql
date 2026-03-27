-- =============================================================================
-- AI Memory Infrastructure
-- 5 tables + 2 functions for conversational AI with persistent memory
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 ai_conversations — Session Management
-- ---------------------------------------------------------------------------
CREATE TABLE ai_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id),
  title           text,                              -- auto-gerado da 1a mensagem
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'archived', 'deleted')),

  -- Contexto da sessao
  context_type    text,                              -- 'project', 'supplier', 'nfe', 'general'
  context_id      uuid,                              -- ID da entidade foco (se houver)
  context_snapshot jsonb,                            -- snapshot dos dados no inicio da conversa

  -- Metadados
  message_count   integer NOT NULL DEFAULT 0,
  total_tokens    integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

CREATE INDEX idx_ai_conv_user      ON ai_conversations(user_id);
CREATE INDEX idx_ai_conv_status    ON ai_conversations(status);
CREATE INDEX idx_ai_conv_context   ON ai_conversations(context_type, context_id);
CREATE INDEX idx_ai_conv_last_msg  ON ai_conversations(last_message_at DESC);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Usuarios so veem suas proprias conversas
CREATE POLICY "own_conversations" ON ai_conversations
  FOR ALL USING (user_id = auth.uid());

-- Admin ve todas (para auditoria)
CREATE POLICY "admin_all_conversations" ON ai_conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 3.2 ai_messages — Individual Messages
-- ---------------------------------------------------------------------------
CREATE TABLE ai_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content         text NOT NULL,

  -- Contexto usado para gerar a resposta (so para role='assistant')
  context_used    jsonb,                             -- quais tabelas/views/rows foram consultados
  sources         jsonb,                             -- [{table, id, field, value}] para citacoes

  -- Tool calls (quando a IA executa acoes)
  tool_name       text,                              -- 'create_entry', 'approve_nfe', etc.
  tool_input      jsonb,
  tool_output     jsonb,

  -- Metricas (so para role='assistant')
  model           text,
  tokens_input    integer,
  tokens_output   integer,
  latency_ms      integer,

  -- Link para acao resultante
  action_audit_id bigint,                            -- FK para audit_log.id se gerou acao

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_msg_conv     ON ai_messages(conversation_id, created_at);
CREATE INDEX idx_ai_msg_role     ON ai_messages(role);
CREATE INDEX idx_ai_msg_tool     ON ai_messages(tool_name) WHERE tool_name IS NOT NULL;
CREATE INDEX idx_ai_msg_action   ON ai_messages(action_audit_id) WHERE action_audit_id IS NOT NULL;

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Herda permissao da conversa pai
CREATE POLICY "own_messages" ON ai_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM ai_conversations WHERE id = conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "admin_all_messages" ON ai_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Trigger para atualizar contadores na conversa
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE ai_conversations SET
    message_count = message_count + 1,
    total_tokens = total_tokens + COALESCE(NEW.tokens_input, 0) + COALESCE(NEW.tokens_output, 0),
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ai_message_stats
  AFTER INSERT ON ai_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_stats();

-- ---------------------------------------------------------------------------
-- 3.3 ai_user_preferences — Per-User Preferences
-- ---------------------------------------------------------------------------
CREATE TABLE ai_user_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) UNIQUE,

  -- Preferencias de interacao
  idioma          text NOT NULL DEFAULT 'pt-BR',
  formato_moeda   text NOT NULL DEFAULT 'BRL',
  projeto_padrao  uuid REFERENCES projects(id),       -- projeto que o usuario mais acessa
  nivel_detalhe   text NOT NULL DEFAULT 'normal'
                  CHECK (nivel_detalhe IN ('resumido', 'normal', 'detalhado')),

  -- Notificacoes IA
  alertar_anomalias boolean NOT NULL DEFAULT true,
  alertar_vencimentos boolean NOT NULL DEFAULT true,
  resumo_diario   boolean NOT NULL DEFAULT false,

  -- Contexto aprendido (JSON flexivel)
  apelidos        jsonb DEFAULT '{}',                 -- {"obra do joao": "uuid-do-projeto", "zezinho": "uuid-fornecedor"}
  preferencias_extra jsonb DEFAULT '{}',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_preferences" ON ai_user_preferences
  FOR ALL USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3.4 ai_knowledge — Learned Knowledge Base
-- ---------------------------------------------------------------------------
CREATE TABLE ai_knowledge (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            text NOT NULL CHECK (tipo IN (
    'correcao',           -- usuario corrigiu uma resposta da IA
    'fato',               -- fato confirmado ("o fornecedor X sempre atrasa")
    'regra',              -- regra de negocio ("cimento so compra do fornecedor Y")
    'apelido',            -- nome alternativo ("obra do shopping" = projeto X)
    'padrao'              -- padrao identificado ("gastos com eletrica sobem em dezembro")
  )),

  -- Conteudo
  conteudo        text NOT NULL,                      -- descricao legivel
  -- Use text for now; enable pgvector later and ALTER COLUMN to vector(1536)
  embedding text,  -- future: vector(1536) with pgvector

  -- Escopo
  scope_type      text CHECK (scope_type IN ('global', 'project', 'supplier', 'category', 'user')),
  scope_id        uuid,                               -- ID da entidade se escopo nao for global
  user_id         uuid REFERENCES profiles(id),       -- quem ensinou (NULL = sistema)

  -- Validade
  ativo           boolean NOT NULL DEFAULT true,
  confianca       numeric(3, 2) NOT NULL DEFAULT 1.0, -- 0.00 a 1.00
  vezes_usado     integer NOT NULL DEFAULT 0,
  ultimo_uso      timestamptz,

  -- Origem
  conversation_id uuid REFERENCES ai_conversations(id),
  message_id      uuid REFERENCES ai_messages(id),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

CREATE INDEX idx_ai_knowledge_tipo   ON ai_knowledge(tipo);
CREATE INDEX idx_ai_knowledge_scope  ON ai_knowledge(scope_type, scope_id);
CREATE INDEX idx_ai_knowledge_active ON ai_knowledge(ativo) WHERE ativo = true;

-- Index for semantic search (requires pgvector):
-- CREATE INDEX idx_ai_knowledge_embedding ON ai_knowledge USING ivfflat (embedding vector_cosine_ops);

COMMENT ON COLUMN ai_knowledge.embedding IS 'enable pgvector and ALTER COLUMN to vector(1536) when ready';

ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_financeiro_knowledge" ON ai_knowledge
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro'))
  );

-- ---------------------------------------------------------------------------
-- 3.5 ai_tool_registry — Available Tools/Functions
-- ---------------------------------------------------------------------------
CREATE TABLE ai_tool_registry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,               -- 'create_financial_entry'
  display_name    text NOT NULL,                      -- 'Criar Lancamento Financeiro'
  description     text NOT NULL,                      -- descricao para o LLM entender quando usar
  category        text NOT NULL CHECK (category IN ('query', 'action', 'analysis')),

  -- Definicao tecnica
  function_type   text NOT NULL CHECK (function_type IN ('rpc', 'edge_function', 'direct_query', 'composite')),
  function_name   text NOT NULL,                      -- nome da RPC ou edge function
  parameters_schema jsonb NOT NULL,                   -- JSON Schema dos parametros aceitos
  return_schema   jsonb,                              -- JSON Schema do retorno

  -- Permissoes
  required_roles  text[] NOT NULL DEFAULT '{admin}',  -- quais roles podem usar esta tool

  -- Controle
  ativo           boolean NOT NULL DEFAULT true,
  requires_confirmation boolean NOT NULL DEFAULT false, -- acao destrutiva requer confirmacao do usuario
  risk_level      text NOT NULL DEFAULT 'low'
                  CHECK (risk_level IN ('low', 'medium', 'high')),

  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_tool_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_read_tools" ON ai_tool_registry
  FOR SELECT USING (true);  -- todos podem ver quais tools existem

CREATE POLICY "admin_manage_tools" ON ai_tool_registry
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- Seed ai_tool_registry
-- ---------------------------------------------------------------------------
INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema, required_roles, requires_confirmation, risk_level) VALUES
  ('calc_project_balance', 'Recalcular Saldo da Obra', 'Recalcula saldo, custo, receita, margem e IEC de uma obra especifica', 'action', 'rpc', 'calc_project_balance', '{"type":"object","properties":{"p_project_id":{"type":"string","format":"uuid"}},"required":["p_project_id"]}', '{admin,financeiro}', false, 'medium'),

  ('detect_anomalies', 'Detectar Anomalias Financeiras', 'Escaneia todas as obras em busca de anomalias: lancamentos sem conciliacao, orcamento estourado, pagamentos sem NF-e, divergencias contratuais', 'analysis', 'rpc', 'detect_financial_anomalies', '{"type":"object","properties":{}}', '{admin}', false, 'low'),

  ('capture_margin_snapshots', 'Capturar Snapshots de Margem', 'Registra snapshot mensal de margem, receita, custo e IEC de todas as obras ativas', 'action', 'rpc', 'capture_margin_snapshots', '{"type":"object","properties":{}}', '{admin}', false, 'low'),

  ('build_context', 'Montar Contexto', 'Monta pacote de contexto completo para uma entidade (projeto, fornecedor, geral)', 'query', 'rpc', 'ai_build_context', '{"type":"object","properties":{"p_context_type":{"type":"string","enum":["project","supplier","general"]},"p_context_id":{"type":"string","format":"uuid"},"p_user_id":{"type":"string","format":"uuid"}}}', '{admin,financeiro}', false, 'low'),

  ('query_monthly_by_project', 'Consultar Mensal por Obra', 'Retorna consolidado mensal de receita/custo/saldo agrupado por obra e categoria', 'query', 'direct_query', 'v_monthly_by_project', '{"type":"object","properties":{"project_id":{"type":"string","format":"uuid"}}}', '{admin,financeiro}', false, 'low'),

  ('query_supplier_summary', 'Consultar Resumo de Fornecedor', 'Retorna total pago, ticket medio, qtd obras por fornecedor', 'query', 'direct_query', 'v_supplier_summary', '{"type":"object","properties":{"supplier_id":{"type":"string","format":"uuid"}}}', '{admin,financeiro}', false, 'low'),

  ('query_budget_vs_actual', 'Consultar Orcamento vs Realizado', 'Retorna comparativo orcamento vs realizado por categoria por obra com IEC', 'query', 'direct_query', 'v_budget_vs_actual', '{"type":"object","properties":{"project_id":{"type":"string","format":"uuid"}}}', '{admin,financeiro}', false, 'low'),

  ('query_cash_flow', 'Consultar Fluxo de Caixa', 'Retorna projecao de fluxo de caixa baseada em parcelas futuras', 'query', 'direct_query', 'v_cash_flow_projection', '{"type":"object","properties":{}}', '{admin,financeiro}', false, 'low'),

  ('query_item_prices', 'Consultar Precos de Itens', 'Retorna analise de precos por item NCM por fornecedor (media, min, max, desvio)', 'query', 'direct_query', 'v_item_price_analysis', '{"type":"object","properties":{"ncm":{"type":"string"}}}', '{admin,financeiro}', false, 'low'),

  ('approve_nfe', 'Aprovar NF-e', 'Aprova uma NF-e da fila, criando lancamento financeiro e atualizando fornecedor', 'action', 'edge_function', 'approve-nfe', '{"type":"object","properties":{"nfe_inbox_id":{"type":"string","format":"uuid"},"project_id":{"type":"string","format":"uuid"},"bank_account_id":{"type":"string","format":"uuid"},"categoria_codigo":{"type":"string"}},"required":["nfe_inbox_id","project_id","categoria_codigo"]}', '{admin,financeiro}', true, 'high'),

  ('normalize_items', 'Normalizar Itens NF-e', 'Classifica itens de NF-e sem catalogo, usando IA para sugerir nome padronizado e categoria', 'action', 'edge_function', 'normalize-nfe-items', '{"type":"object","properties":{}}', '{admin}', false, 'low')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3.6 ai_build_context() — Context Packet Builder RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ai_build_context(
  p_context_type text,
  p_context_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result jsonb := '{}';
  v_prefs jsonb;
  v_knowledge jsonb;
BEGIN
  -- 1. User preferences
  IF p_user_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'idioma', idioma,
      'nivel_detalhe', nivel_detalhe,
      'projeto_padrao', projeto_padrao,
      'apelidos', apelidos
    ) INTO v_prefs
    FROM ai_user_preferences WHERE user_id = p_user_id;

    v_result := v_result || jsonb_build_object('user_preferences', COALESCE(v_prefs, '{}'::jsonb));
  END IF;

  -- 2. Relevant knowledge
  SELECT jsonb_agg(jsonb_build_object('tipo', tipo, 'conteudo', conteudo, 'confianca', confianca))
  INTO v_knowledge
  FROM ai_knowledge
  WHERE ativo = true
    AND (scope_type = 'global'
      OR (scope_type = p_context_type AND scope_id = p_context_id)
      OR (scope_type = 'user' AND scope_id = p_user_id));

  v_result := v_result || jsonb_build_object('knowledge', COALESCE(v_knowledge, '[]'::jsonb));

  -- 3. Entity-specific context
  IF p_context_type = 'project' AND p_context_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'project', jsonb_build_object(
        'id', p.id, 'name', p.name, 'status', p.status,
        'client', c.name,
        'manager', p.project_manager,
        'start_date', p.start_date, 'end_date', p.end_date,
        'orcamento', p.orcamento_previsto,
        'receita', p.receita_realizada, 'custo', p.custo_realizado,
        'saldo', p.saldo_atual, 'margem', p.margem_atual, 'iec', p.iec_atual
      )
    ) INTO v_result
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.id = p_context_id;

  ELSIF p_context_type = 'supplier' AND p_context_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'supplier', row_to_json(vs.*)
    ) INTO v_result
    FROM v_supplier_summary vs
    WHERE vs.supplier_id = p_context_id;

  ELSIF p_context_type = 'general' OR p_context_type IS NULL THEN
    -- Global financial summary
    SELECT jsonb_build_object(
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

  -- 4. Available tools for context
  SELECT v_result || jsonb_build_object(
    'available_tools',
    COALESCE(jsonb_agg(jsonb_build_object('name', name, 'description', description, 'category', category)), '[]'::jsonb)
  ) INTO v_result
  FROM ai_tool_registry
  WHERE ativo = true;

  -- 5. Recent anomalies (always include)
  SELECT v_result || jsonb_build_object(
    'open_anomalies',
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('tipo', tipo, 'titulo', titulo, 'severidade', severidade))
      FROM (SELECT tipo, titulo, severidade FROM anomalies WHERE status = 'aberta' ORDER BY created_at DESC LIMIT 5) sub
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
