# Painel de Insights & Riscos + Otimização IA — Design Spec

## Goal

Two interconnected improvements:

1. **New "Insights" tab** in the Financeiro module — predictive intelligence and actionable risk alerts with direct shortcuts to resolve each issue
2. **AI efficiency overhaul** — activate the dormant RAG system, implement sliding window memory, filter tools dynamically, and reduce token usage by ~50%

Single AI model (Claude Sonnet via Bedrock), same ChatPanel, smarter context.

## Users

- **Nívea** (operator): sees pending work with SLA aging, resolves inline when possible, faster AI responses
- **Ana Lúcia** (manager): sees budget projections, margin trends, project health at a glance

---

# PART 1: Painel de Insights & Riscos

## Architecture

New page `/financeiro/insights` added to FinanceiroTabs. Three vertical blocks:

1. **Riscos Operacionais** — present-tense alerts with SLA countdown and action buttons
2. **Projeções Financeiras** — burn-rate forecasts and trend analysis per project
3. **Resolvidos Recentemente** — last 24h audit trail feed

Data updates via Supabase Realtime subscriptions (risks + resolved feed). Projections update via daily cron + on-demand recalculation.

## Tech Stack

- React + TypeScript + Tailwind + Shadcn UI (consistent with existing codebase)
- Supabase Realtime (channel subscriptions on 5 tables)
- React Query (cache invalidation on realtime events)
- PostgreSQL functions for projection calculations
- pg_cron for daily projection refresh

---

## Component 1: Riscos Operacionais

### Risk Types

| Risk | Detection Rule | Severity | Action Type |
|------|---------------|----------|-------------|
| NF-e pendente > 48h | `nfe_inbox.status = 'aguardando_revisao' AND created_at < now() - interval '48h'` | Alta (Crítica if > 5 days) | Navigate → NfeInbox |
| Conciliação atrasada > 7d | `project_financial_entries.situacao = 'pendente' AND created_at < now() - interval '7d'` | Média | Navigate → Conciliação filtered |
| Orçamento próximo do limite | `iec_atual > 0.85 AND iec_atual <= 1.0` | Média | Navigate → Indicadores filtered |
| Orçamento estourado | `iec_atual > 1.0` | Crítica | Navigate → Indicadores filtered |
| Obra sem medição > 45d | Latest `medicoes.periodo_fim < now() - interval '45d'`, project active | Alta | Navigate → Medições da obra |
| Rateio pendente > 5d | `project_financial_entries` with category prefix 'ADM', no `cost_allocations`, created > 5d ago | Média | Inline: ratear agora |
| Parcela vencida | `contract_payments.vencimento < CURRENT_DATE AND status != 'pago'` | Alta | Inline: marcar recebido / Navigate → Recebíveis |
| Obra sem orçamento | `orcamento_previsto IS NULL`, project active | Baixa | Inline: input to set budget |
| Fornecedor sem categoria | `categoria_padrao_id IS NULL` with 3+ entries | Baixa | Inline: select to assign category |

### Card Layout

Each risk card shows:
- Severity badge (color-coded: red/amber/yellow/gray)
- Description with project name and metric values
- Age indicator ("há 6 dias")
- Action button (inline or navigation with →)

Cards ordered by: severity DESC, then age DESC.

Header shows: "X riscos ativos (Y críticos)"

### SQL: View for risks

```sql
CREATE OR REPLACE VIEW v_insights_risks AS
-- Combines all 9 risk types into a unified view
-- Each row: risk_type, severity, project_id, project_name, description, age_hours, action_type, action_target, metadata
```

### Inline Actions

- **Definir orçamento**: Input field appears in card, saves to `projects.orcamento_previsto`, recalculates IEC
- **Atribuir categoria**: Select dropdown in card, saves to `suppliers.categoria_padrao_id`
- **Marcar parcela recebida**: Confirm button, updates `contract_payments.status = 'pago'`
- **Ratear lançamento**: Opens Rateio mini-dialog (project selection + method) within the card

### Navigation Actions

All navigation actions pass query params to pre-filter the target page:
- `?status=pendente` for NF-e
- `?project_id=xxx` for Indicadores/Conciliação
- `?vencido=true` for Recebíveis

---

## Component 2: Projeções Financeiras

### Calculations

```sql
CREATE OR REPLACE FUNCTION calc_project_projections(p_project_id uuid)
RETURNS jsonb
```

**Inputs:**
- `v_monthly_by_project` last 3 months of costs per project
- `projects.orcamento_previsto`, `custo_realizado`, `margem_atual`, `ifec_atual`

**Outputs (stored in `projects.projecao_json`):**

```json
{
  "burn_rate_mensal": 12400.00,
  "orcamento_restante": 15200.00,
  "meses_restantes": 1.22,
  "data_estouro_prevista": "2026-05-15",
  "tendencia_margem": "queda",
  "margem_3m": [32.1, 28.5, 24.0],
  "status": "alerta",
  "obra_parada": false,
  "ifec_status": "atencao",
  "updated_at": "2026-03-31T06:00:00Z"
}
```

**Status classification:**
- `critico`: meses_restantes < 1 OR iec > 1.0
- `alerta`: meses_restantes < 3 OR margem declining 3 months OR ifec < 0.8
- `saudavel`: everything else
- `parada`: zero entries in last 30 days, project active

### Card Layout

Each project gets a projection card:
- Status icon (red/amber/green/gray)
- Project name + headline ("Estoura em 38 dias")
- Supporting metrics (burn rate, remaining budget, margin trend)
- Action button: "Ver Financeiro →" or "Analisar com IA →"

Cards ordered: critical → alert → healthy.

"Analisar com IA" opens ChatPanel with contextual prompt about the specific project.

### Database Changes

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS projecao_json jsonb;
```

### Cron Job

Daily at 06h (alongside existing anomaly detection):

```sql
SELECT cron.schedule('calc-projections', '0 6 * * *',
  $$SELECT calc_all_projections()$$
);
```

`calc_all_projections()` iterates all active projects and calls `calc_project_projections()` for each.

---

## Component 3: Resolvidos Recentemente

### Data Source

Query `audit_log` table (already populated by triggers on all financial tables) for the last 24h.

Group by action type and show human-readable descriptions:
- "NF-e #1842 aprovada · Alvinópolis · há 2h"
- "3 lançamentos conciliados · Marcia Ramos · há 4h"
- "Rateio ADM executado · 3 obras · há 5h"
- "Orçamento definido · Belvedere R$ 280k · há 8h"

### Layout

Simple list with checkmark icon, description, and relative timestamp.
Header: "Resolvidos hoje (N)"
Collapsible "Ver mais" for items beyond the first 5.

---

## Component 4: useRealtimeInsights Hook

### Subscriptions

```typescript
const channels = [
  { table: 'nfe_inbox', events: ['UPDATE'] },
  { table: 'project_financial_entries', events: ['INSERT', 'UPDATE'] },
  { table: 'anomalias', events: ['INSERT', 'UPDATE'] },
  { table: 'cost_allocations', events: ['INSERT'] },
  { table: 'medicoes', events: ['INSERT', 'UPDATE'] },
];
```

### Behavior

On any event received:
1. Invalidate React Query cache for `insights-risks` and `insights-resolved`
2. Projections are NOT invalidated (cron-based, too expensive for realtime)
3. Show subtle pulse animation on the updated section

---

# PART 2: AI Efficiency Overhaul

## Problem

Current AI uses ~11,000 tokens per request. Key issues:
- `document_summaries` table is write-only (RAG built but never queried)
- `search_projects` and `search_suppliers` tools are referenced in prompt but don't exist in registry
- All 11+ tools sent every request (~500 tokens wasted)
- 20 messages loaded without summarization (~2,000-10,000 tokens)
- `ai_user_preferences.apelidos` stored but never used in searches
- `nivel_detalhe` preference ignored
- Knowledge base never deduplicated

## Target

~4,500 tokens per request (from ~11,000). Same quality, faster responses, lower cost.

---

## Change 1: Sliding Window Memory (L1)

**Current:** `getConversationHistory()` loads last 20 messages raw.

**New:** Load last 8 messages + a summary of older messages.

### Implementation

```typescript
async function getConversationHistory(supabase, conversationId, limit = 8) {
  // Get total message count
  const { count } = await supabase.from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  // If <= limit, return all
  if (count <= limit) return fetchMessages(limit);

  // Otherwise: fetch summary + last N messages
  const { data: conv } = await supabase.from("ai_conversations")
    .select("context_snapshot")
    .eq("id", conversationId).single();

  const summary = conv?.context_snapshot?.summary;
  const recentMessages = await fetchMessages(limit);

  if (summary) {
    return [
      { role: "system", content: `Resumo da conversa anterior: ${summary}` },
      ...recentMessages,
    ];
  }
  return recentMessages;
}
```

### Summarization Trigger

After every 10 messages in a conversation, call Bedrock (Haiku — cheap) to summarize the first messages and store in `ai_conversations.context_snapshot.summary`. This runs once per threshold, not every request.

**Savings:** ~1,500-7,000 tokens per request in long conversations.

---

## Change 2: Activate RAG Search (L3)

**Current:** `document_summaries` populated by `parse-nfe-xml` and `summarize-document` but never queried.

**New:** Create `search_documents` tool that queries `document_summaries` via full-text search (tsvector + GIN index already exist).

### Tool Registration

```sql
INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema)
VALUES (
  'search_documents',
  'Buscar Documentos',
  'Busca em notas fiscais, contratos e documentos indexados por texto, fornecedor ou projeto',
  'query',
  'direct_query',
  'document_summaries',
  '{"type":"object","properties":{"q":{"type":"string","description":"Termo de busca"},"project_id":{"type":"string"},"supplier_id":{"type":"string"}}}'
);
```

### Search Logic in `executeTool()`

For `search_documents`, use `textSearch()` instead of ILIKE:

```typescript
if (toolName === "search_documents") {
  let query = supabase.from("document_summaries").select("*");
  if (input.q) query = query.textSearch("content_text", input.q, { type: "websearch", config: "portuguese" });
  if (input.project_id) query = query.eq("project_id", input.project_id);
  if (input.supplier_id) query = query.eq("supplier_id", input.supplier_id);
  return query.limit(10);
}
```

---

## Change 3: Register Missing Search Tools

**Current:** System prompt says "use search_projects" and "use search_suppliers" but these tools don't exist in the registry.

### Register search_projects

```sql
INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema)
VALUES (
  'search_projects',
  'Buscar Obras',
  'Busca obras por nome parcial, status ou gestor',
  'query',
  'direct_query',
  'projects',
  '{"type":"object","properties":{"name":{"type":"string","description":"Nome parcial da obra"},"status":{"type":"string"}}}'
);
```

### Register search_suppliers

```sql
INSERT INTO ai_tool_registry (name, display_name, description, category, function_type, function_name, parameters_schema)
VALUES (
  'search_suppliers',
  'Buscar Fornecedores',
  'Busca fornecedores por nome, CNPJ ou cidade',
  'query',
  'direct_query',
  'suppliers',
  '{"type":"object","properties":{"trade_name":{"type":"string","description":"Nome parcial"},"document":{"type":"string","description":"CNPJ"}}}'
);
```

### Apelidos Integration

In `executeTool()`, before executing `search_projects` or `search_suppliers`, check `ai_user_preferences.apelidos`:

```typescript
// If input.name matches an apelido, resolve to the entity ID
const apelidos = contextData?.user_preferences?.apelidos || {};
const match = Object.entries(apelidos).find(([alias]) =>
  input.name?.toLowerCase().includes(alias.toLowerCase())
);
if (match) {
  // Replace text search with direct ID lookup
  input.id = match[1];
  delete input.name;
}
```

---

## Change 4: Dynamic Tool Filtering

**Current:** `loadTools()` sends all active tools every request.

**New:** Filter tools based on context_type and recent usage patterns.

### Logic

```typescript
async function loadTools(supabase, userRole, contextType) {
  let query = supabase.from("ai_tool_registry").select("*").eq("ativo", true);

  // Filter by role
  query = query.contains("required_roles", [userRole]);

  // Context-based filtering: if on a specific project, include project tools
  // If general context, include overview tools
  // Always include search tools
  const alwaysInclude = ['build_context', 'search_projects', 'search_suppliers', 'search_documents'];
  const projectTools = ['calc_project_balance', 'query_budget_vs_actual', 'query_monthly_by_project', 'query_progress_timeline'];
  const overviewTools = ['detect_anomalies', 'query_ifec_overview', 'query_cash_flow'];

  // Return filtered set based on context
}
```

**Savings:** ~200-300 tokens per request (send 6-8 tools instead of 11+).

---

## Change 5: Context Cache

**Current:** `ai_build_context()` RPC runs fresh on every request.

**New:** Cache the result for 60 seconds per conversation_id. If same conversation sends another message within 60s, reuse cached context.

### Implementation

In `index.ts`, before calling `buildSystemPrompt()`:

```typescript
const cacheKey = `ctx_${conversation.id}`;
const cached = contextCache.get(cacheKey);
if (cached && Date.now() - cached.ts < 60_000) {
  systemPrompt = cached.prompt;
  contextData = cached.data;
} else {
  const result = await buildSystemPrompt(...);
  contextCache.set(cacheKey, { ...result, ts: Date.now() });
}
```

Simple in-memory Map (edge function lifecycle is short, so no stale data risk).

**Savings:** 1 RPC call (~50ms) saved on follow-up messages.

---

## Change 6: Knowledge Deduplication

**Current:** Auto-learning inserts corrections without checking for existing similar entries.

**New:** Before inserting into `ai_knowledge`, check if a similar entry exists:

```sql
-- Check existing knowledge with same scope and similar content
SELECT id FROM ai_knowledge
WHERE scope_type = NEW.scope_type
  AND (scope_id = NEW.scope_id OR scope_id IS NULL)
  AND tipo = NEW.tipo
  AND similarity(conteudo, NEW.conteudo) > 0.6
LIMIT 1;
```

If match found, update `confianca` and `vezes_usado` instead of inserting duplicate.

Requires `pg_trgm` extension (likely already enabled for ILIKE).

---

## Change 7: Enforce nivel_detalhe

**Current:** `nivel_detalhe` loaded into prompt but responses don't vary.

**New:** Add explicit instructions per level in the system prompt:

```typescript
const detailInstructions = {
  resumido: "Responda em no máximo 2 frases. Só números e conclusão.",
  normal: "Responda de forma objetiva com dados e uma recomendação.",
  detalhado: "Inclua análise completa: dados, comparações, tendências e recomendações detalhadas.",
};
```

---

# FILES TO CREATE/MODIFY

## Part 1: Insights Panel

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/financeiro/Insights.tsx` | Create | Main page with 3 blocks |
| `src/components/financeiro/RiscosOperacionais.tsx` | Create | Risk cards with inline actions |
| `src/components/financeiro/ProjecoesFinanceiras.tsx` | Create | Projection cards per project |
| `src/components/financeiro/ResolvidosRecentemente.tsx` | Create | Audit trail feed |
| `src/hooks/useRealtimeInsights.ts` | Create | Supabase Realtime subscriptions |
| `src/pages/financeiro/Financeiro.tsx` | Modify | Add "Insights" tab to FinanceiroTabs |
| `src/App.tsx` | Modify | Add route `/financeiro/insights` |
| `supabase/migrations/YYYYMMDD_insights.sql` | Create | v_insights_risks, calc_project_projections(), projecao_json, cron |

## Part 2: AI Efficiency

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/ai-chat/memory.ts` | Modify | Sliding window + summarization trigger |
| `supabase/functions/ai-chat/tools.ts` | Modify | Dynamic filtering + apelidos resolution + search_documents handler |
| `supabase/functions/ai-chat/context.ts` | Modify | nivel_detalhe enforcement |
| `supabase/functions/ai-chat/index.ts` | Modify | Context cache + improved auto-learning |
| `supabase/migrations/YYYYMMDD_ai_efficiency.sql` | Create | Register search_projects, search_suppliers, search_documents tools + knowledge dedup trigger |

## Navigation Integration

- New tab "Insights" in FinanceiroTabs (primary tabs, with badge showing critical risk count)
- Navigation actions from risk cards pass query params for pre-filtering target pages
- Target pages (NfeInbox, Conciliação, Indicadores, Recebíveis, Medições) must read query params on mount and apply filters

## Out of Scope

- pgvector embeddings (future — full-text search covers 90% of NF-e use cases)
- Email/push notifications (future enhancement)
- Historical trend charts within Insights (Indicadores handles this)
- Custom risk threshold configuration (hardcoded thresholds for now)
- Multi-user task assignment (no ownership model yet)
