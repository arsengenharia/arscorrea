# NF-e Plano B — Edge Functions + Pipeline Backend (IMAP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NF-e processing pipeline: IMAP email fetcher (cron every 5 min), XML parser with AI classification, and approval function that creates financial entries.

**Architecture:** 3 Deno edge functions + 1 cron trigger. `fetch-nfe-from-email` connects via IMAP to `nfe@ars.eng.br` (Hostinger), fetches UNSEEN emails with XML/PDF attachments, saves to storage, inserts into `nfe_inbox`. A Postgres trigger calls `parse-nfe-xml` which extracts data and classifies via Claude API. `approve-nfe` is called by the frontend to create `project_financial_entries`.

**Tech Stack:** Deno, Supabase Edge Functions, IMAP (via `npm:imapflow`), Claude API (`npm:@anthropic-ai/sdk`), `@xmldom/xmldom`, pg_net, pg_cron.

---

## Pre-requisites

- **Plano A completed** (nfe_inbox table, storage bucket, codigo slugs)
- **Supabase Secrets configured:**
  - `IMAP_HOST` = `imap.hostinger.com`
  - `IMAP_PORT` = `993`
  - `IMAP_USER` = `nfe@ars.eng.br`
  - `IMAP_PASS` = `Arscorreia2026@`
  - `ANTHROPIC_API_KEY` = (from vault credentials)
- **Postgres app settings** for pg_net trigger (one-time SQL)

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `supabase/functions/fetch-nfe-from-email/index.ts` | IMAP agent: connect, fetch UNSEEN, download attachments, insert nfe_inbox, mark SEEN |
| `supabase/functions/parse-nfe-xml/index.ts` | XML parser: extract NF-e fields, match/create supplier, classify with Claude, update nfe_inbox |
| `supabase/functions/approve-nfe/index.ts` | Approval: create project_financial_entries, link supplier, recalculate balance |
| `supabase/migrations/20260327000600_pg_net_trigger.sql` | pg_net trigger for auto-parsing on nfe_inbox INSERT |
| `supabase/migrations/20260327000700_nfe_email_cron.sql` | pg_cron job: call fetch-nfe-from-email every 5 min |

### CRITICAL: Field Name Mapping

The original v3 spec uses WRONG column names. Always use ACTUAL names:

| Spec says | Actual DB column | Table |
|---|---|---|
| `cpf_cnpj` | `document` | suppliers |
| `nome_fantasia` | `trade_name` | suppliers |
| `razao_social` | `legal_name` | suppliers |
| `telefone` | `phone` | suppliers |

---

## Task 1: Edge Function `fetch-nfe-from-email`

**Files:**
- Create: `supabase/functions/fetch-nfe-from-email/index.ts`

- [ ] **Step 1: Create the IMAP fetcher edge function**

```typescript
// supabase/functions/fetch-nfe-from-email/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1.0.162";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const client = new ImapFlow({
    host: Deno.env.get("IMAP_HOST") || "imap.hostinger.com",
    port: Number(Deno.env.get("IMAP_PORT") || "993"),
    secure: true,
    auth: {
      user: Deno.env.get("IMAP_USER") || "nfe@ars.eng.br",
      pass: Deno.env.get("IMAP_PASS")!,
    },
    logger: false,
  });

  let processed = 0;
  let errors = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Search UNSEEN (unread) messages
      const messages = client.fetch(
        { seen: false },
        {
          uid: true,
          envelope: true,
          bodyStructure: true,
          source: true,
        }
      );

      for await (const msg of messages) {
        try {
          const from = msg.envelope?.from?.[0]?.address ?? "unknown";
          const subject = msg.envelope?.subject ?? "";
          const dateReceived = msg.envelope?.date?.toISOString() ?? new Date().toISOString();

          // Parse the email to extract attachments
          // ImapFlow provides the raw source; we parse MIME parts
          const source = msg.source?.toString() ?? "";

          // Extract attachments from bodyStructure
          const attachments = findAttachments(msg.bodyStructure);

          let hasNfe = false;

          for (const att of attachments) {
            const isXml =
              att.type === "application/xml" ||
              att.type === "text/xml" ||
              att.filename?.toLowerCase().endsWith(".xml");
            const isPdf =
              att.type === "application/pdf" ||
              att.filename?.toLowerCase().endsWith(".pdf");

            if (!isXml && !isPdf) continue;

            // Download the specific attachment part
            const { content } = await client.download(msg.uid.toString(), att.part, {
              uid: true,
            });

            // Read the stream into a buffer
            const chunks: Uint8Array[] = [];
            for await (const chunk of content) {
              chunks.push(chunk);
            }
            const fileBytes = concatUint8Arrays(chunks);

            if (fileBytes.length === 0) continue;

            // Save to Supabase Storage
            const safeName = (att.filename || `attachment-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
            const filePath = `inbox/${Date.now()}-${safeName}`;

            const { error: uploadErr } = await supabase.storage
              .from("nfe-attachments")
              .upload(filePath, fileBytes, {
                contentType: att.type || (isXml ? "application/xml" : "application/pdf"),
              });

            if (uploadErr) {
              console.error(`Upload error for ${safeName}:`, uploadErr.message);
              errors++;
              continue;
            }

            // Insert into nfe_inbox — this triggers parse-nfe-xml via pg_net
            const { error: insertErr } = await supabase.from("nfe_inbox").insert({
              status: "recebido",
              origem: "email",
              arquivo_path: filePath,
              arquivo_tipo: isXml ? "xml" : "pdf",
              email_remetente: from,
              email_assunto: subject,
              email_recebido_em: dateReceived,
            });

            if (insertErr) {
              console.error(`Insert error:`, insertErr.message);
              errors++;
            } else {
              hasNfe = true;
              processed++;
            }
          }

          // Mark email as SEEN (read) regardless of whether it had NF-e
          // This prevents re-processing on next cron run
          await client.messageFlagsAdd(msg.uid.toString(), ["\\Seen"], { uid: true });

        } catch (msgErr) {
          console.error("Error processing message:", msgErr);
          errors++;
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error("IMAP connection error:", err);
    return new Response(
      JSON.stringify({ error: err.message, processed, errors }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ processed, errors, message: `${processed} NF-e(s) encontrada(s)` }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

// ─── Helpers ──────────────────────────────────────────

interface AttachmentInfo {
  part: string;
  filename: string | null;
  type: string;
}

function findAttachments(structure: any, partPrefix = ""): AttachmentInfo[] {
  const results: AttachmentInfo[] = [];

  if (!structure) return results;

  if (structure.childNodes) {
    for (let i = 0; i < structure.childNodes.length; i++) {
      const child = structure.childNodes[i];
      const part = partPrefix ? `${partPrefix}.${i + 1}` : `${i + 1}`;
      results.push(...findAttachments(child, part));
    }
  } else {
    const disp = structure.disposition;
    const filename =
      structure.dispositionParameters?.filename ||
      structure.parameters?.name ||
      null;
    const type = `${structure.type || "application"}/${structure.subtype || "octet-stream"}`.toLowerCase();

    if (
      disp === "attachment" ||
      filename?.match(/\.(xml|pdf)$/i) ||
      type.includes("xml") ||
      (type === "application/pdf" && filename)
    ) {
      const part = partPrefix || "1";
      results.push({ part, filename, type });
    }
  }

  return results;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/fetch-nfe-from-email/index.ts
git commit -m "feat: add IMAP email fetcher for NF-e (Hostinger)"
```

---

## Task 2: Cron job (pg_cron) to call fetcher every 5 minutes

**Files:**
- Create: `supabase/migrations/20260327000700_nfe_email_cron.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260327000700_nfe_email_cron.sql
-- Enable pg_cron if not already active
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: every 5 minutes, call fetch-nfe-from-email edge function
SELECT cron.schedule(
  'fetch-nfe-emails',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/fetch-nfe-from-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

**IMPORTANT:** Before applying, ensure these DB settings exist (from Plano B Task 2):
```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://qajzskxuvxsbvuyuvlnd.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhanpza3h1dnhzYnZ1eXV2bG5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU0ODU2MSwiZXhwIjoyMDg2MTI0NTYxfQ.8hA_77tCXz7hbMBrce0ohZvv_rllR2Xe58_Dq1anWbQ';
```

- [ ] **Step 2: Apply DB settings + migration**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327000700_nfe_email_cron.sql
git commit -m "feat(db): add pg_cron job to fetch NF-e emails every 5 min"
```

---

## Task 3: pg_net trigger for auto-parsing

**Files:**
- Create: `supabase/migrations/20260327000600_pg_net_trigger.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260327000600_pg_net_trigger.sql
CREATE EXTENSION IF NOT EXISTS pg_net;

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

- [ ] **Step 2: Apply migration**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327000600_pg_net_trigger.sql
git commit -m "feat(db): add pg_net trigger for auto-parsing NF-e on inbox insert"
```

---

## Task 4: Edge Function `parse-nfe-xml`

**Files:**
- Create: `supabase/functions/parse-nfe-xml/index.ts`

- [ ] **Step 1: Create the parser edge function**

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

function getTagText(parent: any, tagName: string): string {
  const el = parent.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() ?? "";
}

function extractItems(doc: Document): NFeItem[] {
  const dets = doc.getElementsByTagName("det");
  return Array.from(dets).map((det) => ({
    xProd: getTagText(det, "xProd"),
    vProd: parseFloat(getTagText(det, "vProd") || "0"),
    NCM: getTagText(det, "NCM"),
    CFOP: getTagText(det, "CFOP"),
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

  await supabase.from("nfe_inbox").update({ status: "processando" }).eq("id", nfe_inbox_id);

  try {
    const { data: inbox } = await supabase
      .from("nfe_inbox").select("*").eq("id", nfe_inbox_id).single();

    if (!inbox) throw new Error("nfe_inbox record not found");

    // Download file
    const { data: fileData } = await supabase.storage
      .from("nfe-attachments").download(inbox.arquivo_path);

    if (!fileData) throw new Error("File not found in storage");

    // PDF → manual review (no XML to parse)
    if (inbox.arquivo_tipo === "pdf") {
      await supabase.from("nfe_inbox").update({
        status: "aguardando_revisao",
        observacao: "PDF recebido — preencha os campos manualmente",
      }).eq("id", nfe_inbox_id);
      return new Response("PDF queued", { status: 200, headers: corsHeaders });
    }

    // Parse XML
    const xmlContent = await fileData.text();
    const doc = new DOMParser().parseFromString(xmlContent, "text/xml");

    // Extract chave NF-e → deduplication
    const rawId = doc.getElementsByTagName("infNFe")[0]?.getAttribute("Id") ?? "";
    const chaveNfe = rawId.replace("NFe", "");

    if (chaveNfe) {
      const { data: existing } = await supabase
        .from("project_financial_entries")
        .select("id").eq("chave_nfe", chaveNfe).maybeSingle();

      if (existing) {
        await supabase.from("nfe_inbox").update({
          status: "duplicata",
          chave_nfe: chaveNfe,
          observacao: `NF-e ja lancada — entry id: ${existing.id}`,
        }).eq("id", nfe_inbox_id);
        return new Response("duplicate", { status: 200, headers: corsHeaders });
      }
    }

    // Extract fields — emit = emitter (supplier)
    const emitNode = doc.getElementsByTagName("emit")[0];
    const cnpj = emitNode ? getTagText(emitNode, "CNPJ") : getTagText(doc, "CNPJ");
    const razaoSocial = emitNode ? getTagText(emitNode, "xNome") : getTagText(doc, "xNome");
    const nomeFantasia = emitNode ? getTagText(emitNode, "xFant") : "";
    const numeroNota = getTagText(doc, "nNF");
    const dataEmissaoRaw = getTagText(doc, "dhEmi");
    const dataEmissao = dataEmissaoRaw ? dataEmissaoRaw.substring(0, 10) : null;
    const valorTotal = parseFloat(getTagText(doc, "vNF") || "0");
    const itens = extractItems(doc);

    // Extract emitter address (for auto-created suppliers)
    const enderEmit = emitNode?.getElementsByTagName("enderEmit")[0];
    const emitEndereco = enderEmit ? {
      rua: getTagText(enderEmit, "xLgr"),
      numero: getTagText(enderEmit, "nro"),
      bairro: getTagText(enderEmit, "xBairro"),
      cidade: getTagText(enderEmit, "xMun"),
      estado: getTagText(enderEmit, "UF"),
      cep: getTagText(enderEmit, "CEP"),
      phone: emitNode ? getTagText(emitNode, "fone") : "",
    } : null;

    // Match or create supplier — CORRECT field names
    let supplierId: string | null = null;

    if (cnpj) {
      const { data: existingSupplier } = await supabase
        .from("suppliers")
        .select("id, trade_name, categoria_padrao_id")
        .eq("document", cnpj)  // NOT cpf_cnpj
        .maybeSingle();

      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        const supplierData: any = {
          document: cnpj,               // NOT cpf_cnpj
          legal_name: razaoSocial,      // NOT razao_social
          trade_name: nomeFantasia || razaoSocial,  // NOT nome_fantasia
          tipo: "Juridica",
          observacoes: "Cadastro automatico via NF-e - completar dados",
          ativo: true,
        };

        // Add address from XML if available
        if (emitEndereco) {
          if (emitEndereco.rua) supplierData.rua = emitEndereco.rua;
          if (emitEndereco.numero) supplierData.numero = emitEndereco.numero;
          if (emitEndereco.bairro) supplierData.bairro = emitEndereco.bairro;
          if (emitEndereco.cidade) supplierData.cidade = emitEndereco.cidade;
          if (emitEndereco.estado) supplierData.estado = emitEndereco.estado;
          if (emitEndereco.cep) supplierData.cep = emitEndereco.cep;
          if (emitEndereco.phone) supplierData.phone = emitEndereco.phone; // NOT telefone
        }

        const { data: newSupplier } = await supabase
          .from("suppliers")
          .insert(supplierData)
          .select("id")
          .single();

        supplierId = newSupplier?.id ?? null;
      }
    }

    // AI Classification
    let aiData = { categoria_sugerida: "materiais_obra", confianca: 0.5, justificativa: "" };

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (anthropicKey && itens.length > 0) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey });

        const categorias = [
          "mao_obra_direta — Mao de Obra Direta (pedreiros, pintores, eletricistas)",
          "materiais_obra — Materiais de Obra (cimento, areia, tijolos, tubos, fios)",
          "servicos_prestados — Servicos Prestados (terceirizados, consultorias)",
          "equipamentos — Equipamentos e Ferramentas (aluguel, compra de maquinas)",
          "reembolsos_despesas — Reembolsos e Despesas (combustivel, alimentacao)",
          "custo_administrativo — Custo Administrativo (escritorio, internet, aluguel sede)",
        ];

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [{
            role: "user",
            content:
              `Classifique esta NF-e de construcao civil.\n\n` +
              `Fornecedor: ${razaoSocial} (CNPJ: ${cnpj})\n` +
              `Itens:\n${itens.map((it, i) => `${i + 1}. ${it.xProd} R$${it.vProd.toFixed(2)} NCM:${it.NCM} CFOP:${it.CFOP}`).join("\n")}\n\n` +
              `Categorias (responda com o CODIGO):\n${categorias.join("\n")}\n\n` +
              `JSON apenas: {"categoria_sugerida":"codigo","confianca":0.0,"justificativa":"..."}`,
          }],
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "{}";
        const parsed = JSON.parse(text);
        if (parsed.categoria_sugerida) aiData = parsed;
      } catch (aiErr) {
        console.error("AI error:", aiErr);
      }
    }

    // Active projects snapshot
    const { data: obrasAtivas } = await supabase
      .from("projects")
      .select("id, name")
      .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
      .order("name");

    // Save draft
    await supabase.from("nfe_inbox").update({
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
    }).eq("id", nfe_inbox_id);

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("Parse error:", err);
    await supabase.from("nfe_inbox").update({
      status: "erro", observacao: String(err),
    }).eq("id", nfe_inbox_id);
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

## Task 5: Edge Function `approve-nfe`

**Files:**
- Create: `supabase/functions/approve-nfe/index.ts`

- [ ] **Step 1: Create the approval edge function**

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

  const { nfe_inbox_id, project_id, bank_account_id, categoria_codigo, observacoes } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Fetch inbox record
  const { data: inbox, error: inboxErr } = await supabase
    .from("nfe_inbox").select("*").eq("id", nfe_inbox_id).single();

  if (inboxErr || !inbox) {
    return new Response(JSON.stringify({ error: "NF-e nao encontrada" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (inbox.status !== "aguardando_revisao") {
    return new Response(JSON.stringify({ error: `Status invalido: ${inbox.status}` }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Resolve category by codigo (slug)
  const { data: categoria } = await supabase
    .from("financial_categories")
    .select("id")
    .eq("codigo", categoria_codigo)
    .single();

  if (!categoria) {
    return new Response(JSON.stringify({ error: `Categoria nao encontrada: ${categoria_codigo}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Resolve bank account (explicit > project default)
  let resolvedBankAccountId = bank_account_id;
  if (!resolvedBankAccountId) {
    const { data: project } = await supabase
      .from("projects").select("bank_account_id").eq("id", project_id).single();
    resolvedBankAccountId = project?.bank_account_id;
  }

  if (!resolvedBankAccountId) {
    return new Response(JSON.stringify({ error: "Selecione uma conta bancaria" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Get user
  const authHeader = req.headers.get("Authorization") ?? "";
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

  // 5. Create financial entry
  const { data: entry, error: entryErr } = await supabase
    .from("project_financial_entries")
    .insert({
      project_id,
      bank_account_id: resolvedBankAccountId,
      category_id: categoria.id,
      supplier_id: inbox.supplier_id,
      data: inbox.data_emissao,
      valor: -(Math.abs(inbox.valor_total)),
      tipo_documento: "NF-e",
      numero_documento: inbox.numero_nota,
      nota_fiscal: inbox.numero_nota,
      chave_nfe: inbox.chave_nfe,
      arquivo_url: inbox.arquivo_path,
      situacao: "pendente",
      observacoes: observacoes || `NF-e ${inbox.numero_nota} — ${inbox.razao_social}`,
      created_by: user?.id,
    } as any)
    .select().single();

  if (entryErr) {
    return new Response(JSON.stringify({ error: entryErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 6. Update nfe_inbox
  await supabase.from("nfe_inbox").update({
    status: "aprovado",
    project_id_selecionado: project_id,
    bank_account_id_selecionado: resolvedBankAccountId,
    categoria_final: categoria_codigo,
    financial_entry_id: entry.id,
    revisado_por: user?.id,
    revisado_em: new Date().toISOString(),
  }).eq("id", nfe_inbox_id);

  // 7. Update supplier default category (learning)
  if (inbox.supplier_id && categoria.id) {
    await supabase.from("suppliers")
      .update({ categoria_padrao_id: categoria.id } as any)
      .eq("id", inbox.supplier_id)
      .is("categoria_padrao_id", null);
  }

  // 8. Recalculate project balance
  await supabase.rpc("calc_project_balance", { p_project_id: project_id });

  return new Response(JSON.stringify({ entry_id: entry.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/approve-nfe/index.ts
git commit -m "feat: add approve-nfe edge function"
```

---

## Summary

| Task | What | Depends on |
|---|---|---|
| 1 | `fetch-nfe-from-email` — IMAP fetcher (Hostinger) | IMAP secrets configured |
| 2 | pg_cron job (every 5 min) | DB settings + pg_cron extension |
| 3 | pg_net trigger (auto-parse on insert) | DB settings + pg_net extension |
| 4 | `parse-nfe-xml` — XML parser + Claude AI | ANTHROPIC_API_KEY |
| 5 | `approve-nfe` — create financial entries | Plano A completed |

**Total: 5 tasks. Deploy order:**
```bash
supabase functions deploy fetch-nfe-from-email
supabase functions deploy parse-nfe-xml
supabase functions deploy approve-nfe
```

**IMAP connection details:**
- Host: `imap.hostinger.com`
- Port: `993` (SSL)
- User: `nfe@ars.eng.br`
- Pass: stored in Supabase secrets
