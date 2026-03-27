# NF-e Plano B — Edge Functions + Pipeline Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3 Supabase Edge Functions that form the NF-e processing pipeline: receive email webhook, parse XML with AI classification, and approve NF-e creating financial entries.

**Architecture:** 3 Deno edge functions. `receive-nfe-email` receives Resend webhooks, saves XML to storage, inserts into `nfe_inbox`. A Postgres trigger calls `parse-nfe-xml` which extracts data and classifies via Claude API. `approve-nfe` is called by the frontend to create `project_financial_entries` and update supplier data.

**Tech Stack:** Deno, Supabase Edge Functions, Claude API (Anthropic SDK), @xmldom/xmldom, pg_net extension.

---

## Pre-requisites

- **Plano A completed** (nfe_inbox table, storage bucket, codigo slugs exist)
- **DNS configured**: MX record for `arsengenharia.com.br` pointing to Resend
- **Resend Inbound**: webhook URL configured to `https://qajzskxuvxsbvuyuvlnd.supabase.co/functions/v1/receive-nfe-email`
- **Supabase Secrets set**: `RESEND_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`
- **Postgres app settings**: `app.supabase_url` and `app.service_role_key` set via `ALTER DATABASE`

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `supabase/functions/receive-nfe-email/index.ts` | Webhook receiver: validate HMAC, save file to storage, insert into nfe_inbox |
| `supabase/functions/parse-nfe-xml/index.ts` | XML parser: extract fields, match/create supplier, classify with Claude, update nfe_inbox |
| `supabase/functions/approve-nfe/index.ts` | Approval: create project_financial_entries, link supplier, recalculate balance |
| `supabase/migrations/20260327000600_pg_net_trigger.sql` | Enable pg_net, create trigger for auto-parsing |

### Important: Field Name Mapping

The v3 spec uses WRONG column names. The correct mapping for ALL edge functions:

| Spec says | Actual DB column | Table |
|---|---|---|
| `cpf_cnpj` | `document` | suppliers |
| `nome_fantasia` | `trade_name` | suppliers |
| `razao_social` | `legal_name` | suppliers |
| `telefone` | `phone` | suppliers |

**NEVER use the spec column names. Always use the actual DB column names.**

---

## Task 1: Edge Function `receive-nfe-email`

**Files:**
- Create: `supabase/functions/receive-nfe-email/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/receive-nfe-email/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyHmac(secret: string, body: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const body = await req.text();

  // 1. Validate HMAC signature from Resend
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (webhookSecret) {
    const sig = req.headers.get("resend-signature") ?? "";
    const valid = await verifyHmac(webhookSecret, body, sig);
    if (!valid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const payload = JSON.parse(body);
  const attachments: Array<{ filename: string; content: string; content_type: string }> =
    payload.attachments ?? [];

  // 2. Filter NF-e files: XML with 44-digit key or PDF
  const nfeFiles = attachments.filter(
    (a) =>
      a.filename?.match(/\d{44}\.xml$/i) ||
      a.content_type === "application/xml" ||
      a.content_type === "text/xml" ||
      (a.filename?.toLowerCase().endsWith(".pdf") && a.content_type === "application/pdf")
  );

  if (nfeFiles.length === 0) {
    return new Response("OK - no NF-e found", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 3. For each file: save to storage + enqueue
  for (const file of nfeFiles) {
    const fileBytes = Uint8Array.from(atob(file.content), (c) => c.charCodeAt(0));
    const filePath = `inbox/${Date.now()}-${file.filename}`;

    const { error: uploadErr } = await supabase.storage
      .from("nfe-attachments")
      .upload(filePath, fileBytes, { contentType: file.content_type });

    if (uploadErr) {
      console.error("Upload error:", uploadErr.message);
      continue;
    }

    const isXml = file.filename?.toLowerCase().endsWith(".xml");

    await supabase.from("nfe_inbox").insert({
      status: "recebido",
      origem: "email",
      arquivo_path: filePath,
      arquivo_tipo: isXml ? "xml" : "pdf",
      email_remetente: payload.from ?? payload.sender ?? null,
      email_assunto: payload.subject ?? null,
      email_recebido_em: new Date().toISOString(),
    });
    // The INSERT triggers parse-nfe-xml automatically via pg_net
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/receive-nfe-email/index.ts
git commit -m "feat: add receive-nfe-email edge function (Resend webhook)"
```

---

## Task 2: Postgres trigger for auto-parsing

**Files:**
- Create: `supabase/migrations/20260327000600_pg_net_trigger.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260327000600_pg_net_trigger.sql
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function: on INSERT into nfe_inbox with status='recebido',
-- call parse-nfe-xml edge function via HTTP POST
CREATE OR REPLACE FUNCTION trigger_parse_nfe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'recebido' THEN
    PERFORM net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/parse-nfe-xml',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := jsonb_build_object('nfe_inbox_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_nfe_inbox_insert
  AFTER INSERT ON nfe_inbox
  FOR EACH ROW EXECUTE FUNCTION trigger_parse_nfe();
```

**IMPORTANT:** Before applying this migration, the database must have these settings configured (one-time, via SQL Editor):

```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://qajzskxuvxsbvuyuvlnd.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhanpza3h1dnhzYnZ1eXV2bG5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU0ODU2MSwiZXhwIjoyMDg2MTI0NTYxfQ.8hA_77tCXz7hbMBrce0ohZvv_rllR2Xe58_Dq1anWbQ';
```

- [ ] **Step 2: Apply DB settings + migration**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327000600_pg_net_trigger.sql
git commit -m "feat(db): add pg_net trigger for auto-parsing NF-e on inbox insert"
```

---

## Task 3: Edge Function `parse-nfe-xml`

**Files:**
- Create: `supabase/functions/parse-nfe-xml/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/parse-nfe-xml/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://esm.sh/@xmldom/xmldom@0.8.10";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NFeItem {
  xProd: string;
  vProd: number;
  NCM: string;
  CFOP: string;
}

function getTagText(doc: Document, tagName: string): string {
  const el = doc.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() ?? "";
}

function extractItems(doc: Document): NFeItem[] {
  const dets = doc.getElementsByTagName("det");
  return Array.from(dets).map((det) => ({
    xProd: (det as any).getElementsByTagName("xProd")[0]?.textContent ?? "",
    vProd: parseFloat((det as any).getElementsByTagName("vProd")[0]?.textContent ?? "0"),
    NCM: (det as any).getElementsByTagName("NCM")[0]?.textContent ?? "",
    CFOP: (det as any).getElementsByTagName("CFOP")[0]?.textContent ?? "",
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { nfe_inbox_id } = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Mark as processing (prevent re-processing on retry)
  await supabase.from("nfe_inbox").update({ status: "processando" }).eq("id", nfe_inbox_id);

  try {
    const { data: inbox } = await supabase
      .from("nfe_inbox")
      .select("*")
      .eq("id", nfe_inbox_id)
      .single();

    if (!inbox) throw new Error("nfe_inbox record not found");

    // 1. Download file from storage
    const { data: fileData } = await supabase.storage
      .from("nfe-attachments")
      .download(inbox.arquivo_path);

    if (!fileData) throw new Error("File not found in storage");

    // PDF: queue for manual review
    if (inbox.arquivo_tipo === "pdf") {
      await supabase
        .from("nfe_inbox")
        .update({
          status: "aguardando_revisao",
          observacao: "PDF recebido — preencha os campos manualmente",
        })
        .eq("id", nfe_inbox_id);
      return new Response("PDF queued for manual review", { status: 200, headers: corsHeaders });
    }

    // 2. Parse XML
    const xmlContent = await fileData.text();
    const doc = new DOMParser().parseFromString(xmlContent, "text/xml");

    // 3. Extract chave_nfe and check for duplicates FIRST
    const rawId = doc.getElementsByTagName("infNFe")[0]?.getAttribute("Id") ?? "";
    const chaveNfe = rawId.replace("NFe", "");

    if (chaveNfe) {
      const { data: existing } = await supabase
        .from("project_financial_entries")
        .select("id")
        .eq("chave_nfe", chaveNfe)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("nfe_inbox")
          .update({
            status: "duplicata",
            chave_nfe: chaveNfe,
            observacao: `NF-e ja lancada — entry id: ${existing.id}`,
          })
          .eq("id", nfe_inbox_id);
        return new Response("duplicate", { status: 200, headers: corsHeaders });
      }
    }

    // 4. Extract main fields
    // NOTE: emit/CNPJ is the FIRST CNPJ tag (emitter), not dest/CNPJ (recipient)
    const emitNode = doc.getElementsByTagName("emit")[0];
    const cnpj = emitNode
      ? (emitNode as any).getElementsByTagName("CNPJ")[0]?.textContent ?? ""
      : getTagText(doc, "CNPJ");
    const razaoSocial = emitNode
      ? (emitNode as any).getElementsByTagName("xNome")[0]?.textContent ?? ""
      : getTagText(doc, "xNome");
    const numeroNota = getTagText(doc, "nNF");
    const dataEmissaoRaw = getTagText(doc, "dhEmi");
    const dataEmissao = dataEmissaoRaw ? dataEmissaoRaw.substring(0, 10) : null;
    const valorTotal = parseFloat(getTagText(doc, "vNF") || "0");
    const itens = extractItems(doc);

    // 5. Match or create supplier by CNPJ
    // IMPORTANT: field is `document` NOT `cpf_cnpj`
    let supplierId: string | null = null;

    if (cnpj) {
      const { data: existingSupplier } = await supabase
        .from("suppliers")
        .select("id, trade_name, categoria_padrao_id")
        .eq("document", cnpj)
        .maybeSingle();

      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        // Auto-create supplier with correct field names
        const { data: newSupplier } = await supabase
          .from("suppliers")
          .insert({
            document: cnpj,
            legal_name: razaoSocial,
            trade_name: razaoSocial,
            tipo: "Juridica",
            observacoes: "Cadastro automatico via NF-e - completar dados",
            ativo: true,
          } as any)
          .select("id")
          .single();
        supplierId = newSupplier?.id ?? null;
      }
    }

    // 6. AI Classification using Claude
    let aiData = { categoria_sugerida: "materiais_obra", confianca: 0.5, justificativa: "" };

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (anthropicKey && itens.length > 0) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey });

        // Use codigos (slugs) not names — immutable matching
        const categorias = [
          "mao_obra_direta — Mao de Obra Direta (servicos de mao de obra, pedreiros, pintores)",
          "materiais_obra — Materiais de Obra (cimento, areia, tijolos, tubos, fios)",
          "servicos_prestados — Servicos Prestados (servicos terceirizados, consultorias tecnicas)",
          "equipamentos — Equipamentos e Ferramentas (aluguel, compra de maquinas)",
          "reembolsos_despesas — Reembolsos e Outras Despesas (combustivel, alimentacao obra)",
          "custo_administrativo — Custo Administrativo (material escritorio, internet, aluguel sede)",
        ];

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content:
                `Voce classifica notas fiscais de construcao civil.\n\n` +
                `Fornecedor: ${razaoSocial} (CNPJ: ${cnpj})\n\n` +
                `Itens:\n` +
                itens
                  .map(
                    (it, i) =>
                      `${i + 1}. ${it.xProd} — R$ ${it.vProd.toFixed(2)} (NCM: ${it.NCM}, CFOP: ${it.CFOP})`
                  )
                  .join("\n") +
                `\n\nCategorias (use o CODIGO, nao o nome):\n${categorias.join("\n")}\n\n` +
                `Responda APENAS com JSON valido:\n{"categoria_sugerida":"codigo_aqui","confianca":0.0,"justificativa":"..."}`,
            },
          ],
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "{}";
        const parsed = JSON.parse(text);
        if (parsed.categoria_sugerida) aiData = parsed;
      } catch (aiErr) {
        console.error("AI classification error:", aiErr);
        // Keep fallback
      }
    }

    // 7. Fetch active projects for the review dropdown
    const { data: obrasAtivas } = await supabase
      .from("projects")
      .select("id, name")
      .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
      .order("name");

    // 8. Save draft awaiting review
    await supabase
      .from("nfe_inbox")
      .update({
        status: "aguardando_revisao",
        supplier_id: supplierId,
        razao_social: razaoSocial,
        cnpj,
        numero_nota: numeroNota,
        data_emissao: dataEmissao,
        valor_total: valorTotal,
        chave_nfe: chaveNfe || null,
        categoria_sugerida: aiData.categoria_sugerida,
        ai_confianca: aiData.confianca,
        ai_justificativa: aiData.justificativa,
        itens_json: itens,
        obras_ativas_json: obrasAtivas,
      })
      .eq("id", nfe_inbox_id);

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("Parse error:", err);
    await supabase
      .from("nfe_inbox")
      .update({ status: "erro", observacao: String(err) })
      .eq("id", nfe_inbox_id);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/parse-nfe-xml/index.ts
git commit -m "feat: add parse-nfe-xml edge function with AI classification"
```

---

## Task 4: Edge Function `approve-nfe`

**Files:**
- Create: `supabase/functions/approve-nfe/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/approve-nfe/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { nfe_inbox_id, project_id, bank_account_id, categoria_codigo, observacoes } =
    await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Fetch inbox record
  const { data: inbox, error: inboxErr } = await supabase
    .from("nfe_inbox")
    .select("*")
    .eq("id", nfe_inbox_id)
    .single();

  if (inboxErr || !inbox) {
    return new Response(JSON.stringify({ error: "NF-e nao encontrada" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Prevent double approval
  if (inbox.status !== "aguardando_revisao") {
    return new Response(JSON.stringify({ error: `Status invalido: ${inbox.status}` }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Resolve category by codigo (slug), NOT by name
  const { data: categoria } = await supabase
    .from("financial_categories")
    .select("id")
    .eq("codigo", categoria_codigo)
    .single();

  if (!categoria) {
    return new Response(JSON.stringify({ error: `Categoria nao encontrada: ${categoria_codigo}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Resolve bank account
  // Priority: explicit param > project default > error
  let resolvedBankAccountId = bank_account_id;

  if (!resolvedBankAccountId) {
    const { data: project } = await supabase
      .from("projects")
      .select("bank_account_id")
      .eq("id", project_id)
      .single();

    resolvedBankAccountId = project?.bank_account_id;
  }

  if (!resolvedBankAccountId) {
    return new Response(
      JSON.stringify({ error: "Projeto nao tem conta bancaria. Selecione uma conta." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 5. Get authenticated user
  const authHeader = req.headers.get("Authorization") ?? "";
  const {
    data: { user },
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

  // 6. Create financial entry
  const { data: entry, error: entryErr } = await supabase
    .from("project_financial_entries")
    .insert({
      project_id,
      bank_account_id: resolvedBankAccountId,
      category_id: categoria.id,
      supplier_id: inbox.supplier_id,
      data: inbox.data_emissao,
      valor: -(Math.abs(inbox.valor_total)), // always negative (expense)
      tipo_documento: "NF-e",
      numero_documento: inbox.numero_nota,
      nota_fiscal: inbox.numero_nota,
      chave_nfe: inbox.chave_nfe,
      arquivo_url: inbox.arquivo_path,
      situacao: "pendente", // awaits bank reconciliation
      observacoes: observacoes || `NF-e ${inbox.numero_nota} — ${inbox.razao_social}`,
      created_by: user?.id,
    } as any)
    .select()
    .single();

  if (entryErr) {
    return new Response(JSON.stringify({ error: entryErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 7. Update nfe_inbox
  await supabase
    .from("nfe_inbox")
    .update({
      status: "aprovado",
      project_id_selecionado: project_id,
      bank_account_id_selecionado: resolvedBankAccountId,
      categoria_final: categoria_codigo,
      financial_entry_id: entry.id,
      revisado_por: user?.id,
      revisado_em: new Date().toISOString(),
    })
    .eq("id", nfe_inbox_id);

  // 8. Update supplier default category (learning)
  if (inbox.supplier_id && categoria.id) {
    await supabase
      .from("suppliers")
      .update({ categoria_padrao_id: categoria.id } as any)
      .eq("id", inbox.supplier_id)
      .is("categoria_padrao_id", null); // only if not already set
  }

  // 9. Recalculate project balance
  await supabase.rpc("calc_project_balance", { p_project_id: project_id });

  return new Response(JSON.stringify({ entry_id: entry.id }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

Key differences from the original spec:
- Uses `categoria_codigo` (slug) instead of `categoria_final` (name string)
- Accepts `bank_account_id` param (fallback to project default)
- Uses correct field names (`document`, `trade_name`, `legal_name`)
- Calls `calc_project_balance` via RPC (not edge function)
- Proper error handling with specific messages

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/approve-nfe/index.ts
git commit -m "feat: add approve-nfe edge function with category slug matching"
```

---

## Summary

| Task | What | Depends on |
|---|---|---|
| 1 | `receive-nfe-email` (webhook receiver) | Resend + DNS configured |
| 2 | pg_net trigger (auto-parse on insert) | DB settings configured |
| 3 | `parse-nfe-xml` (XML parser + AI) | ANTHROPIC_API_KEY set |
| 4 | `approve-nfe` (create entries) | Plano A completed |

**Total: 4 tasks. Requires infrastructure (DNS, Resend, env vars).**

**Deploy order:** Functions must be deployed to Supabase before the trigger works:
```bash
supabase functions deploy receive-nfe-email
supabase functions deploy parse-nfe-xml
supabase functions deploy approve-nfe
```

After this plan: the backend pipeline is complete. Plano C builds the frontend.
