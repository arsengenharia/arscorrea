# Visão Completa IA — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformar o sistema ARS de um ERP com chat para um sistema operacional inteligente com 3 camadas: motor de inteligência (auditor contínuo), motor de ação (IA executa), interface conversacional (contextual + proativa).

**Tech Stack:** Supabase (Postgres + Edge Functions + Realtime), AWS Bedrock (Claude), React, Recharts.

---

## Fase 1 — Motor de Inteligência: Auditor Contínuo (sem frontend)

**Objetivo:** O sistema detecta problemas sozinho, sem o usuário perguntar.

### Etapa 1.1: Detecção de qualidade de dados

**Migration:** `detect_data_quality_issues()` — função PL/pgSQL que escaneia:

| Regra | Tabela | Condição | Severidade |
|---|---|---|---|
| Obra sem datas | projects | `start_date IS NULL OR end_date IS NULL` | média |
| Obra sem gestor | projects | `project_manager IS NULL` | baixa |
| Obra sem contrato | projects | `NOT EXISTS (SELECT 1 FROM contracts WHERE project_id = p.id)` | alta |
| Obra parada >30 dias | projects + entries | Nenhum lançamento ou etapa nos últimos 30 dias | alta |
| Contrato sem valor | contracts | `total IS NULL OR total = 0` | alta |
| Fornecedor incompleto | suppliers | `document IS NULL AND observacoes LIKE '%automatico%'` | média |
| Cliente sem contato | clients | `email IS NULL AND phone IS NULL` | baixa |
| Proposta vencida aberta | proposals | `status NOT IN ('won','lost') AND validity expira` | média |
| Lançamento sem fornecedor >R$500 | entries | `supplier_id IS NULL AND ABS(valor) > 500 AND valor < 0` | baixa |
| Medição atrasada | medicoes | `status = 'rascunho' AND periodo_fim < now() - 15 days` | alta |

Cada detecção insere em `anomalies` (tabela já existe).

**Files:**
- Create: `supabase/migrations/20260328000100_detect_data_quality.sql`

### Etapa 1.2: Cron de auditoria diária

**Migration:** pg_cron jobs que rodam automaticamente:

```sql
-- Diário às 06:00 BRT (09:00 UTC)
SELECT cron.schedule('daily-anomaly-scan', '0 9 * * *', $$
  SELECT detect_financial_anomalies();
  SELECT detect_data_quality_issues();
$$);

-- Mensal no dia 1 às 07:00 BRT
SELECT cron.schedule('monthly-margin-snapshot', '0 10 1 * *', $$
  SELECT capture_margin_snapshots();
$$);
```

**Files:**
- Create: `supabase/migrations/20260328000200_cron_auditoria.sql`

**Nota:** Requer `pg_cron` habilitado no Supabase Dashboard.

### Etapa 1.3: Comparação de preços com detecção de outlier

**Migration:** Adicionar regra ao `detect_financial_anomalies()`:

```sql
-- Item com preço > 2x a média para o mesmo NCM
INSERT INTO anomalies (tipo, severidade, titulo, descricao, ...)
SELECT 'preco_acima_media', 'alta', ...
FROM nfe_items ni
JOIN v_item_price_analysis vpa ON vpa.catalog_id = ni.item_catalog_id AND vpa.supplier_id = ni.supplier_id
WHERE ni.valor_unitario > vpa.preco_medio * 2
AND NOT EXISTS (... anomalia já registrada ...);
```

**Files:**
- Create: `supabase/migrations/20260328000300_detect_price_outliers.sql`

---

## Fase 2 — Motor de Ação: IA Executa no Sistema

**Objetivo:** A IA não só responde — ela navega, filtra, gera relatórios, resume documentos.

### Etapa 2.1: Navegação contextual (ChatPanel → React Router)

O ChatPanel envia comandos de navegação para o frontend.

**Como funciona:**
1. A IA retorna uma resposta com `action: { type: "navigate", path: "/obras/uuid/financeiro" }`
2. O ChatPanel detecta e chama `navigate(path)`

**Implementação:**
- Adicionar campo `action` no response do ai-chat
- Registrar tool `navigate_to_page` no `ai_tool_registry`
- ChatPanel usa `useNavigate()` para executar

**Files:**
- Modify: `supabase/functions/ai-chat/index.ts` — adicionar action no response
- Modify: `src/components/ai/ChatPanel.tsx` — executar navegação
- Modify: `src/hooks/useAiChat.ts` — expor action
- Migration: INSERT tool `navigate_to_page` no registry

### Etapa 2.2: Filtros inteligentes

A IA aplica filtros na tela atual sem o usuário navegar.

**Tools:**
- `filter_entries` — aplica filtro de projeto/categoria/período na tela de Lançamentos
- `filter_recebiveis` — aplica filtro de status/projeto na tela de Recebíveis

**Implementação:**
- Criar um sistema de "comandos" que o ChatPanel emite via callback
- As páginas escutam esses comandos e aplicam filtros

**Files:**
- Create: `src/hooks/useAiCommands.ts` — pub/sub para comandos IA
- Modify: `src/pages/financeiro/LancamentosGlobal.tsx` — escutar comandos
- Migration: INSERT tools no registry

### Etapa 2.3: Resumo de documentos (PDF/XML)

Edge function que lê um documento do Storage e resume com Claude.

**Fluxo:**
1. IA recebe "resuma o contrato da obra X"
2. Tool `summarize_document` busca `contracts.pdf_path` ou `project_documents`
3. Edge function baixa do Storage, extrai texto, envia para Claude
4. Retorna resumo estruturado

**Files:**
- Create: `supabase/functions/summarize-document/index.ts`
- Migration: INSERT tool no registry

### Etapa 2.4: Geração de relatório por comando

A IA gera o PDF financeiro quando solicitada.

**Fluxo:**
1. "Gere o relatório financeiro da obra Juvenal"
2. Tool `generate_report` retorna URL do PDF
3. ChatPanel mostra link para download

**Files:**
- Modify: `supabase/functions/ai-chat/tools.ts` — suportar tool que retorna URL
- Modify: `src/components/ai/ChatPanel.tsx` — renderizar links de download
- Migration: INSERT tool no registry

---

## Fase 3 — Interface: Contextual + Proativa

**Objetivo:** O sistema mostra insights sem o usuário perguntar, e o chat sabe onde o usuário está.

### Etapa 3.1: Context-awareness por tela

O ChatPanel recebe `contextType` e `contextId` da rota atual automaticamente.

**Implementação:**
- Criar um React Context `AiContextProvider` que lê a URL e determina:
  - `/obras/:id/*` → context_type="project", context_id=id
  - `/fornecedores/:id` → context_type="supplier", context_id=id
  - `/financeiro/*` → context_type="general"
- Envolver Layout com o provider
- ChatPanel consome o context automaticamente

**Files:**
- Create: `src/contexts/AiContext.tsx`
- Modify: `src/components/layout/Layout.tsx` — envolver com provider
- Modify: `src/components/ai/ChatPanel.tsx` — consumir context

### Etapa 3.2: Insights proativos no Dashboard

Card no Dashboard principal mostrando top 3 riscos detectados + recomendações.

**Implementação:**
- Novo componente `ProactiveInsights` que consulta:
  - `anomalies` WHERE status='aberta' ORDER BY severidade, created_at LIMIT 5
  - Últimos `margin_snapshots` com queda de margem
  - `v_cash_flow_projection` com parcelas vencidas

**Files:**
- Create: `src/components/dashboard/ProactiveInsights.tsx`
- Modify: `src/pages/Index.tsx` — adicionar na aba Financeiro

### Etapa 3.3: Assistente contextual por tela

Botão "Analisar esta obra" / "Analisar este fornecedor" em cada página de detalhe.

**Implementação:**
- Botão que abre o ChatPanel com mensagem pré-definida:
  - Obra: "Faça uma análise completa desta obra"
  - Fornecedor: "Analise o histórico deste fornecedor"
  - Contrato: "Resuma este contrato e destaque riscos"

**Files:**
- Create: `src/components/ai/AnalyzeButton.tsx` — botão genérico
- Modify: `src/pages/ProjectDetails.tsx` — adicionar botão
- Modify: `src/pages/SupplierDetail.tsx` — adicionar botão

### Etapa 3.4: Busca global inteligente

Barra de busca no topo do sistema que aceita linguagem natural.

**Implementação:**
- Substituir ou adicionar ao lado da barra de busca existente um input que:
  - Se parece query estruturada ("obra alvinópolis") → busca normal
  - Se parece pergunta ("quanto gastamos com cimento?") → envia para ai-chat
- Resultado: ou navega para a entidade, ou abre o ChatPanel com a resposta

**Files:**
- Create: `src/components/ai/SmartSearch.tsx`
- Modify: `src/components/layout/TopNavigation.tsx` — adicionar smart search

### Etapa 3.5: Modo investigação (painel lateral)

Painel lateral que mostra para qualquer obra:
- Resumo executivo (gerado pela IA)
- Timeline de eventos (últimos lançamentos, medições, anomalias)
- Documentos relacionados
- Ações sugeridas

**Files:**
- Create: `src/components/ai/InvestigationPanel.tsx`
- Create: `src/hooks/useInvestigation.ts`
- Modify: `src/pages/ProjectDetails.tsx` — botão "Investigar"

---

## Fase 4 — Prompt Engineering: Resposta Estruturada

**Objetivo:** Toda resposta da IA segue o formato achado→evidência→impacto→recomendação.

### Etapa 4.1: Refinar system prompt

Atualizar `context.ts` para incluir instruções de formato:

```
## Formato de Resposta

Para análises e alertas, use sempre este formato:

**Achado:** [o que foi detectado]
**Evidência:** [dados que sustentam — cite tabela, valores, datas]
**Impacto:** [consequência para a obra/empresa]
**Recomendação:** [o que fazer — ação específica]

Para perguntas simples (saldo, valor, data), responda direto sem esse formato.
```

### Etapa 4.2: Prompt contextual por tipo de pergunta

Detectar o tipo de pergunta e ajustar o prompt:
- Pergunta de dado → resposta curta com valor
- Pedido de análise → formato estruturado completo
- Pedido de ação → confirmar antes de executar
- Pedido de comparação → tabela comparativa
- Pedido de projeção → dados + ressalvas

**Files:**
- Modify: `supabase/functions/ai-chat/context.ts`

---

## Resumo e Prioridades

| Fase | Etapa | O que | Impacto | Esforço |
|---|---|---|---|---|
| **1** | 1.1 | Detecção de qualidade de dados | Alto — auditor contínuo | Médio |
| **1** | 1.2 | Cron diário de auditoria | Alto — funciona sozinho | Baixo |
| **1** | 1.3 | Detecção de preço outlier | Médio | Baixo |
| **2** | 2.1 | Navegação contextual | Alto — IA controla o sistema | Médio |
| **2** | 2.2 | Filtros inteligentes | Médio | Médio |
| **2** | 2.3 | Resumo de documentos | Alto — diferencial competitivo | Médio |
| **2** | 2.4 | Relatório por comando | Médio | Baixo |
| **3** | 3.1 | Context-awareness por tela | **Crítico** — base para tudo | Baixo |
| **3** | 3.2 | Insights proativos no Dashboard | **Alto** — visibilidade imediata | Médio |
| **3** | 3.3 | Botão "Analisar" por tela | Médio | Baixo |
| **3** | 3.4 | Busca global inteligente | Alto — experiência diferenciada | Médio-Alto |
| **3** | 3.5 | Modo investigação | Alto — power users | Alto |
| **4** | 4.1 | Prompt estruturado | Alto — qualidade das respostas | Baixo |
| **4** | 4.2 | Prompt por tipo de pergunta | Médio | Baixo |

## Ordem de execução recomendada

```
Sprint 1 (imediato):
  3.1 Context-awareness ← base para tudo
  4.1 Prompt estruturado ← qualidade imediata
  1.1 + 1.2 Detecção + cron ← auditor funciona sozinho

Sprint 2 (próxima semana):
  3.2 Insights proativos ← Dashboard ganha inteligência
  2.1 Navegação contextual ← IA controla o sistema
  3.3 Botão "Analisar" ← experiência contextual

Sprint 3 (semana seguinte):
  2.3 Resumo de documentos ← diferencial
  1.3 Preço outlier ← anomalias mais ricas
  3.4 Busca global ← experiência unificada

Sprint 4 (polimento):
  2.2 Filtros inteligentes
  2.4 Relatório por comando
  3.5 Modo investigação
  4.2 Prompt por tipo
```

## Dependências

```
3.1 (context) ← necessário para 2.1, 3.3, 3.5
1.1 (detecção) ← necessário para 3.2 (insights)
Deploy edge functions ← necessário para 2.1, 2.3, 2.4
pg_cron habilitado ← necessário para 1.2
```

## Resultado final

O sistema terá:
- **Reativo:** responde perguntas com dados e fontes citadas
- **Proativo:** mostra riscos e inconsistências no Dashboard sem perguntar
- **Operacional:** navega, filtra, gera relatórios, resume documentos
- **Explicativo:** formato achado→evidência→impacto→recomendação
- **Confiável:** toda ação é logada, toda resposta tem fonte, ações de risco pedem confirmação
