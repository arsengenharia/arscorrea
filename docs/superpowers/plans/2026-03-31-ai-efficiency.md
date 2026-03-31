# AI Efficiency Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce AI token usage by ~50% (11k → 5k per request) by activating dormant RAG, implementing sliding window memory, registering missing tools, and filtering tools dynamically.

**Architecture:** All changes are in the `supabase/functions/ai-chat/` edge function and one SQL migration. No frontend changes. The AI model (Claude Sonnet via Bedrock) stays the same — we optimize the context sent to it.

**Tech Stack:** Deno (Supabase Edge Functions), PostgreSQL, AWS Bedrock (Claude Sonnet + Haiku for summarization)

---

### Task 1: Register Missing Search Tools (SQL Migration)

**Files:**
- Create: `supabase/migrations/20260331000100_ai_efficiency.sql`

- [ ] **Step 1: Create the migration file with tool registrations and knowledge dedup**

```sql
-- ============================================================================
-- AI Efficiency: Register missing tools + knowledge dedup
-- ============================================================================

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

-- 4. Enable pg_trgm for knowledge deduplication (may already exist)
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
    -- Update existing instead of inserting duplicate
    UPDATE ai_knowledge
    SET confianca = GREATEST(confianca, NEW.confianca),
        vezes_usado = vezes_usado + 1,
        updated_at = now()
    WHERE id = v_existing_id;
    RETURN NULL; -- Cancel the INSERT
  END IF;

  RETURN NEW; -- Allow the INSERT
END;
$$;

-- 6. Attach trigger
DROP TRIGGER IF EXISTS trg_knowledge_dedup ON ai_knowledge;
CREATE TRIGGER trg_knowledge_dedup
  BEFORE INSERT ON ai_knowledge
  FOR EACH ROW EXECUTE FUNCTION check_knowledge_dedup();
```

- [ ] **Step 2: Apply the migration**

```bash
SQL=$(cat supabase/migrations/20260331000100_ai_efficiency.sql)
curl -s -X POST "https://api.supabase.com/v1/projects/qajzskxuvxsbvuyuvlnd/database/query" \
  -H "Authorization: Bearer sbp_5d5999f0030b52ce5a1e852e15d15d07674d494f" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query: $q}')"
```

Expected: `[]` (empty result = success)

- [ ] **Step 3: Verify tools were registered**

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/qajzskxuvxsbvuyuvlnd/database/query" \
  -H "Authorization: Bearer sbp_5d5999f0030b52ce5a1e852e15d15d07674d494f" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT name, function_type FROM ai_tool_registry WHERE name IN ('\''search_projects'\'', '\''search_suppliers'\'', '\''search_documents'\'')"}'
```

Expected: 3 rows returned

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260331000100_ai_efficiency.sql
git commit -m "feat: register search_projects, search_suppliers, search_documents tools + knowledge dedup trigger"
```

---

### Task 2: Implement Document Search in executeTool

**Files:**
- Modify: `supabase/functions/ai-chat/tools.ts`

- [ ] **Step 1: Add full-text search handler for search_documents**

Replace the entire `executeTool` function in `supabase/functions/ai-chat/tools.ts` with:

```typescript
export async function executeTool(
  supabase: SupabaseClient,
  toolName: string,
  toolInput: any
): Promise<{ result: any; error?: string }> {
  // Load tool definition
  const { data: tool } = await supabase
    .from("ai_tool_registry")
    .select("function_type, function_name")
    .eq("name", toolName)
    .single();

  if (!tool) return { result: null, error: `Tool ${toolName} not found` };

  try {
    if (tool.function_type === "rpc") {
      const { data, error } = await supabase.rpc(tool.function_name, toolInput);
      if (error) return { result: null, error: error.message };
      return { result: data };
    }

    if (tool.function_type === "direct_query") {
      let query = supabase.from(tool.function_name).select("*");

      // Special handling for document full-text search
      if (toolName === "search_documents" && toolInput.q) {
        query = supabase.from("document_summaries")
          .select("source_type, filename, summary, keywords, project_id, supplier_id, created_at")
          .textSearch("content_text", toolInput.q, { type: "websearch", config: "portuguese" });
        if (toolInput.project_id) query = query.eq("project_id", toolInput.project_id);
        if (toolInput.supplier_id) query = query.eq("supplier_id", toolInput.supplier_id);
        query = query.limit(10);
        const { data, error } = await query;
        if (error) return { result: null, error: error.message };
        return { result: data };
      }

      // Apply filters — use ILIKE for text fields (partial match), eq for IDs
      const textFields = ["name", "trade_name", "legal_name", "titulo", "title", "descricao", "observacoes", "document", "cidade"];
      for (const [key, value] of Object.entries(toolInput)) {
        if (value && key !== "limit") {
          if (textFields.includes(key) && typeof value === "string") {
            query = query.ilike(key, `%${value}%`);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      query = query.limit(toolInput.limit || 50);
      const { data, error } = await query;
      if (error) return { result: null, error: error.message };
      return { result: data };
    }

    if (tool.function_type === "composite") {
      if (tool.function_name === "generate_report") {
        const { data: proj } = await supabase
          .from("projects")
          .select("name")
          .eq("id", toolInput.project_id)
          .single();
        const projectName = proj?.name || "Projeto";
        const reportType = toolInput.report_type || "financeiro";
        return {
          result: {
            action: "generate_report",
            project_id: toolInput.project_id,
            report_type: reportType,
            path: `/relatorio/${toolInput.project_id}?tipo=${reportType}`,
            description: `Relatório ${reportType} — ${projectName}`,
          },
        };
      }
      return { result: { action: tool.function_name, ...toolInput } };
    }

    if (tool.function_type === "edge_function") {
      const { data, error } = await supabase.functions.invoke(tool.function_name, {
        body: toolInput,
      });
      if (error) return { result: null, error: error.message };
      return { result: data };
    }

    return { result: null, error: `Unknown function type: ${tool.function_type}` };
  } catch (err) {
    return { result: null, error: String(err) };
  }
}
```

Key changes:
- Added `"document", "cidade"` to `textFields` array for supplier search
- Added special `search_documents` handler that uses `textSearch()` with Portuguese config
- Limited document results to `summary, keywords, filename` (not full `content_text`) to save tokens

- [ ] **Step 2: Deploy and verify**

```bash
cd /tmp/arscorrea && SUPABASE_ACCESS_TOKEN=sbp_5d5999f0030b52ce5a1e852e15d15d07674d494f supabase functions deploy ai-chat --no-verify-jwt --project-ref qajzskxuvxsbvuyuvlnd
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-chat/tools.ts
git commit -m "feat: add full-text document search + text fields for supplier/project search"
```

---

### Task 3: Sliding Window Memory (L1)

**Files:**
- Modify: `supabase/functions/ai-chat/memory.ts`

- [ ] **Step 1: Replace getConversationHistory with sliding window**

Replace the full content of `supabase/functions/ai-chat/memory.ts` with:

```typescript
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const RECENT_LIMIT = 8;
const SUMMARIZE_THRESHOLD = 16;

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  conversationId: string | null,
  userId: string,
  contextType?: string,
  contextId?: string
) {
  if (conversationId) {
    const { data } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();
    if (data) return data;
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: userId,
      context_type: contextType || "general",
      context_id: contextId || null,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  // Count total messages
  const { count } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"]);

  const totalMessages = count ?? 0;

  // If short conversation, return all
  if (totalMessages <= RECENT_LIMIT) {
    return fetchRecentMessages(supabase, conversationId, RECENT_LIMIT);
  }

  // Long conversation: get summary + recent messages
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("context_snapshot")
    .eq("id", conversationId)
    .single();

  const summary = (conv?.context_snapshot as any)?.summary;
  const recent = await fetchRecentMessages(supabase, conversationId, RECENT_LIMIT);

  if (summary) {
    return [
      { role: "user" as const, content: `[Resumo da conversa anterior: ${summary}]` },
      { role: "assistant" as const, content: "Entendido, tenho o contexto da conversa anterior." },
      ...recent,
    ];
  }

  // No summary yet — return recent only (avoids loading 20+ messages)
  return recent;
}

async function fetchRecentMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data } = await supabase
    .from("ai_messages")
    .select("role, content, tool_name, tool_output")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant", "tool"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  // Reverse to chronological order
  const reversed = [...data].reverse();

  return reversed.map((m: any) => {
    if (m.role === "tool" && m.tool_output) {
      const output = typeof m.tool_output === "string" ? m.tool_output : JSON.stringify(m.tool_output);
      return { role: "user" as const, content: `[Tool ${m.tool_name}]: ${output.substring(0, 500)}` };
    }
    return { role: (m.role === "tool" ? "user" : m.role) as "user" | "assistant", content: m.content || "" };
  });
}

export async function maybeSummarizeHistory(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<void> {
  // Check if we need to summarize
  const { count } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"]);

  const totalMessages = count ?? 0;
  if (totalMessages < SUMMARIZE_THRESHOLD) return;

  // Check if already summarized recently
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("context_snapshot")
    .eq("id", conversationId)
    .single();

  const lastSummarizedAt = (conv?.context_snapshot as any)?.summarized_at;
  if (lastSummarizedAt) {
    const elapsed = Date.now() - new Date(lastSummarizedAt).getTime();
    if (elapsed < 5 * 60 * 1000) return; // Don't re-summarize within 5 min
  }

  // Fetch older messages (skip the most recent RECENT_LIMIT)
  const { data: olderMessages } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(totalMessages - RECENT_LIMIT);

  if (!olderMessages || olderMessages.length < 4) return;

  // Build text to summarize
  const text = olderMessages
    .map((m: any) => `${m.role}: ${(m.content || "").substring(0, 200)}`)
    .join("\n");

  // Call Haiku via Bedrock for cheap summarization
  try {
    const { AwsClient } = await import("https://esm.sh/aws4fetch@1.0.20");
    const region = Deno.env.get("AWS_REGION") || "us-east-1";
    const aws = new AwsClient({
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
      region,
      service: "bedrock",
    });

    const resp = await aws.fetch(
      `https://bedrock-runtime.${region}.amazonaws.com/model/us.anthropic.claude-3-5-haiku-20241022-v1:0/invoke`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          system: "Resuma esta conversa em 2-3 frases em portugues. Foque nos temas discutidos, decisoes tomadas e dados mencionados. Seja conciso.",
          messages: [{ role: "user", content: text.substring(0, 3000) }],
          max_tokens: 200,
        }),
      }
    );

    if (resp.ok) {
      const result = await resp.json();
      const summary = result.content?.[0]?.text || "";

      if (summary.length > 10) {
        await supabase.from("ai_conversations").update({
          context_snapshot: {
            summary,
            summarized_at: new Date().toISOString(),
            messages_summarized: olderMessages.length,
          },
        }).eq("id", conversationId);
      }
    }
  } catch (err) {
    console.error("Summarization error:", err);
    // Non-critical — silently fail
  }
}

export async function saveMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: string,
  content: string,
  extra?: {
    model?: string;
    tokens_input?: number;
    tokens_output?: number;
    latency_ms?: number;
    tool_name?: string;
    tool_input?: any;
    tool_output?: any;
    sources?: any;
    context_used?: any;
  }
) {
  await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role,
    content,
    model: extra?.model,
    tokens_input: extra?.tokens_input,
    tokens_output: extra?.tokens_output,
    latency_ms: extra?.latency_ms,
    tool_name: extra?.tool_name,
    tool_input: extra?.tool_input,
    tool_output: extra?.tool_output,
    sources: extra?.sources,
    context_used: extra?.context_used,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/ai-chat/memory.ts
git commit -m "feat: sliding window memory — last 8 messages + Haiku summarization for long conversations"
```

---

### Task 4: Trigger Summarization + Context Cache in index.ts

**Files:**
- Modify: `supabase/functions/ai-chat/index.ts`

- [ ] **Step 1: Add imports and context cache**

At the top of `index.ts`, after existing imports, add:

```typescript
import { maybeSummarizeHistory } from "./memory.ts";
```

- [ ] **Step 2: Add context cache map**

After the `corsHeaders` declaration (line 8-11), add:

```typescript
const contextCache = new Map<string, { systemPrompt: string; contextData: any; ts: number }>();
```

- [ ] **Step 3: Use cached context when available**

Replace the current `buildSystemPrompt` call (around line 97-99):

```typescript
    // Build context (with 60s cache per conversation)
    const currentMessage = message || confirm_tool?.message || "";
    const cacheKey = `ctx_${conversation.id}`;
    const cached = contextCache.get(cacheKey);
    let systemPrompt: string;
    let contextData: any;

    if (cached && Date.now() - cached.ts < 60_000) {
      systemPrompt = cached.systemPrompt;
      contextData = cached.contextData;
    } else {
      const result = await buildSystemPrompt(
        supabase, conversation.context_type, conversation.context_id, user.id, currentMessage
      );
      systemPrompt = result.systemPrompt;
      contextData = result.contextData;
      contextCache.set(cacheKey, { systemPrompt, contextData, ts: Date.now() });
    }
```

- [ ] **Step 4: Trigger summarization after saving assistant response**

After the `saveMessage` call for the assistant response (around line 201-208), add:

```typescript
    // Trigger summarization in background (non-blocking)
    maybeSummarizeHistory(supabase, conversation.id).catch(() => {});
```

- [ ] **Step 5: Deploy**

```bash
cd /tmp/arscorrea && SUPABASE_ACCESS_TOKEN=sbp_5d5999f0030b52ce5a1e852e15d15d07674d494f supabase functions deploy ai-chat --no-verify-jwt --project-ref qajzskxuvxsbvuyuvlnd
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/ai-chat/index.ts
git commit -m "feat: context cache (60s) + trigger conversation summarization after responses"
```

---

### Task 5: Enforce nivel_detalhe in System Prompt

**Files:**
- Modify: `supabase/functions/ai-chat/context.ts`

- [ ] **Step 1: Add detail level instructions**

In `context.ts`, find the line where `prefs.nivel_detalhe` is used in the system prompt (near the end of `buildSystemPrompt()`). Replace:

```typescript
- Nivel de detalhe: ${prefs.nivel_detalhe || "normal"}
```

With:

```typescript
- Nivel de detalhe: ${prefs.nivel_detalhe || "normal"}
${(prefs.nivel_detalhe === "resumido")
  ? "IMPORTANTE: Responda em no maximo 2 frases. So numeros e conclusao. Sem explicacoes longas."
  : (prefs.nivel_detalhe === "detalhado")
    ? "IMPORTANTE: Inclua analise completa: dados, comparacoes, tendencias e recomendacoes detalhadas."
    : ""}
```

- [ ] **Step 2: Deploy**

```bash
cd /tmp/arscorrea && SUPABASE_ACCESS_TOKEN=sbp_5d5999f0030b52ce5a1e852e15d15d07674d494f supabase functions deploy ai-chat --no-verify-jwt --project-ref qajzskxuvxsbvuyuvlnd
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-chat/context.ts
git commit -m "feat: enforce nivel_detalhe preference in AI response format"
```

---

### Task 6: Push all changes to GitHub

**Files:**
- None (git only)

- [ ] **Step 1: Push**

```bash
cd /tmp/arscorrea && git push origin main
```

- [ ] **Step 2: Verify deployment**

Test the AI chat with: "buscar notas fiscais do fornecedor materiais"

Expected: The AI should use `search_documents` tool and return results from `document_summaries`.
