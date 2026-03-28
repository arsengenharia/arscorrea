# NF-e Plano A — Fundacao e Pre-Migrations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the existing database and frontend for the NF-e module — create `nfe_inbox` table, add UNIQUE constraint on supplier CNPJ, add `codigo` slugs to categories, create storage bucket, and add the NF-e tab to the financeiro UI.

**Architecture:** 4 DB migrations applied to Supabase, 1 storage bucket, frontend tab added. No edge functions, no external dependencies. This plan is fully self-contained and can be executed immediately.

**Tech Stack:** PostgreSQL (Supabase), React, TypeScript, Shadcn UI.

---

## Pre-requisites

- Branch: `redesign` at `/tmp/arscorrea`
- Supabase DB access: `db.qajzskxuvxsbvuyuvlnd.supabase.co`, user `postgres`, password `yRhLOCBDBAzTOKb9`
- Apply migrations via: `NODE_PATH=$(npm root -g) node -e "const{Client}=require('pg');..."`

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `supabase/migrations/20260327000200_nfe_inbox.sql` | Create `nfe_inbox` table with enums, indexes, RLS |
| `supabase/migrations/20260327000300_suppliers_document_unique.sql` | Partial UNIQUE index on `suppliers.document` |
| `supabase/migrations/20260327000400_financial_categories_codigo.sql` | Add `codigo` slug column + update seeds |
| `supabase/migrations/20260327000500_nfe_storage_bucket.sql` | Create `nfe-attachments` storage bucket + RLS |
| `src/pages/financeiro/NfeInbox.tsx` | Placeholder page for NF-e inbox (tab visible, content "em construcao") |

### Modified Files

| File | Change |
|---|---|
| `src/pages/financeiro/Financeiro.tsx` | Add "NF-e" tab between Rateio and Configuracoes |
| `src/App.tsx` | Add route `/financeiro/nfe` |

---

## Task 1: Create `nfe_inbox` table

**Files:**
- Create: `supabase/migrations/20260327000200_nfe_inbox.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260327000200_nfe_inbox.sql

CREATE TYPE nfe_status AS ENUM (
  'recebido',
  'processando',
  'aguardando_revisao',
  'aprovado',
  'rejeitado',
  'duplicata',
  'erro'
);

CREATE TYPE nfe_origem AS ENUM ('email', 'upload_manual');
CREATE TYPE nfe_arquivo_tipo AS ENUM ('xml', 'pdf');

CREATE TABLE nfe_inbox (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- pipeline
  status                 nfe_status       NOT NULL DEFAULT 'recebido',
  origem                 nfe_origem       NOT NULL,
  arquivo_path           text             NOT NULL,
  arquivo_tipo           nfe_arquivo_tipo NOT NULL,

  -- email metadata (null for upload_manual)
  email_remetente        text,
  email_assunto          text,
  email_recebido_em      timestamptz,

  -- extracted from XML
  cnpj                   text,
  razao_social           text,
  numero_nota            text,
  data_emissao           date,
  valor_total            numeric(12, 2),
  chave_nfe              text UNIQUE,

  -- parser + AI result
  supplier_id            uuid REFERENCES suppliers(id),
  categoria_sugerida     text,
  ai_confianca           numeric(3, 2),
  ai_justificativa       text,
  itens_json             jsonb,
  obras_ativas_json      jsonb,

  -- filled by user during review
  project_id_selecionado uuid REFERENCES projects(id),
  bank_account_id_selecionado uuid REFERENCES bank_accounts(id),
  categoria_final        text,

  -- after approval
  financial_entry_id     uuid REFERENCES project_financial_entries(id),
  revisado_por           uuid REFERENCES profiles(id),
  revisado_em            timestamptz,
  observacao             text,

  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nfe_inbox_status   ON nfe_inbox(status);
CREATE INDEX idx_nfe_inbox_supplier ON nfe_inbox(supplier_id);
CREATE INDEX idx_nfe_inbox_created  ON nfe_inbox(created_at DESC);

ALTER TABLE nfe_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_financeiro_nfe_inbox" ON nfe_inbox
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'financeiro')
    )
  );
```

Note: Added `bank_account_id_selecionado` (not in original spec) — needed because `projects.bank_account_id` is nullable, so the user may need to pick a bank account during approval.

- [ ] **Step 2: Apply migration to Supabase**

```bash
NODE_PATH=$(npm root -g) node -e "
const{Client}=require('pg');const fs=require('fs');
const sql=fs.readFileSync('/tmp/arscorrea/supabase/migrations/20260327000200_nfe_inbox.sql','utf8');
const c=new Client({host:'db.qajzskxuvxsbvuyuvlnd.supabase.co',port:5432,database:'postgres',user:'postgres',password:'yRhLOCBDBAzTOKb9',ssl:{rejectUnauthorized:false}});
(async()=>{await c.connect();await c.query(sql);console.log('nfe_inbox created');
const r=await c.query(\"SELECT count(*) FROM information_schema.tables WHERE table_name='nfe_inbox'\");
console.log('Exists:',r.rows[0].count);await c.end();})().catch(e=>{console.error(e.message);process.exit(1)});
"
```
Expected: `nfe_inbox created` + `Exists: 1`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327000200_nfe_inbox.sql
git commit -m "feat(db): create nfe_inbox table with enums and RLS"
```

---

## Task 2: Add UNIQUE constraint on `suppliers.document`

**Files:**
- Create: `supabase/migrations/20260327000300_suppliers_document_unique.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260327000300_suppliers_document_unique.sql
-- Partial unique index: only enforced when document is not null
-- Prevents duplicate suppliers from NF-e auto-creation race conditions
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_document_unique
  ON suppliers(document)
  WHERE document IS NOT NULL;
```

- [ ] **Step 2: Apply to Supabase**

Same pattern as Task 1. Verify:
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'suppliers' AND indexname = 'idx_suppliers_document_unique';
-- expect 1 row
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327000300_suppliers_document_unique.sql
git commit -m "feat(db): add partial UNIQUE index on suppliers.document"
```

---

## Task 3: Add `codigo` slug to `financial_categories`

**Files:**
- Create: `supabase/migrations/20260327000400_financial_categories_codigo.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260327000400_financial_categories_codigo.sql
-- Immutable slug for programmatic matching (AI classification, integrations)
-- The 'nome' field can be renamed by users; 'codigo' never changes.

ALTER TABLE financial_categories
  ADD COLUMN IF NOT EXISTS codigo text UNIQUE;

-- Update existing seed categories with slugs
UPDATE financial_categories SET codigo = 'mao_obra_direta'       WHERE nome = 'Mão de Obra Direta'       AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'materiais_obra'        WHERE nome = 'Materiais de Obra'        AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'servicos_prestados'    WHERE nome = 'Serviços Prestados'       AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'equipamentos'          WHERE nome = 'Equipamentos e Ferramentas' AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'reembolsos_despesas'   WHERE nome ILIKE '%Reembolsos%'          AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'aporte_clientes'       WHERE nome = 'Aporte de Clientes'       AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'servicos_receita'      WHERE nome ILIKE '%receita%'             AND codigo IS NULL;
UPDATE financial_categories SET codigo = 'custo_administrativo'  WHERE nome ILIKE '%Administrativo%'      AND codigo IS NULL;
```

- [ ] **Step 2: Apply to Supabase and verify**

```sql
SELECT nome, codigo FROM financial_categories ORDER BY prefixo, nome;
-- All 8 rows should have non-null codigo values
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327000400_financial_categories_codigo.sql
git commit -m "feat(db): add immutable codigo slug to financial_categories"
```

---

## Task 4: Create `nfe-attachments` storage bucket

**Files:**
- Create: `supabase/migrations/20260327000500_nfe_storage_bucket.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260327000500_nfe_storage_bucket.sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nfe-attachments',
  'nfe-attachments',
  false,
  5242880,  -- 5MB
  ARRAY['application/xml', 'text/xml', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: admin and financeiro can access
CREATE POLICY "admin_financeiro_nfe_storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'nfe-attachments'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'financeiro')
    )
  );
```

- [ ] **Step 2: Apply to Supabase**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260327000500_nfe_storage_bucket.sql
git commit -m "feat(db): create nfe-attachments storage bucket with RLS"
```

---

## Task 5: Add NF-e tab to Financeiro + placeholder page + route

**Files:**
- Modify: `src/pages/financeiro/Financeiro.tsx`
- Create: `src/pages/financeiro/NfeInbox.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update Financeiro.tsx — add NF-e tab**

In `src/pages/financeiro/Financeiro.tsx`, add `FileCheck` to the lucide-react import and add a new tab entry between Rateio and Configuracoes:

```typescript
import { LayoutDashboard, Receipt, GitMerge, Split, Settings, FileCheck } from "lucide-react";

const tabs = [
  { label: "Visão Geral", path: "/financeiro/visao-geral", icon: LayoutDashboard },
  { label: "Lançamentos", path: "/financeiro/lancamentos", icon: Receipt },
  { label: "Conciliação", path: "/financeiro/conciliacao", icon: GitMerge },
  { label: "Rateio", path: "/financeiro/rateio", icon: Split },
  { label: "NF-e", path: "/financeiro/nfe", icon: FileCheck },
  { label: "Configurações", path: "/financeiro/configuracoes", icon: Settings },
];
```

- [ ] **Step 2: Create NfeInbox.tsx placeholder**

```tsx
// src/pages/financeiro/NfeInbox.tsx
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";

export default function NfeInbox() {
  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />
        <h3 className="text-xl font-semibold">Notas Fiscais Eletrônicas</h3>
        <p className="text-muted-foreground py-8 text-center">
          Módulo NF-e — em construção. As notas fiscais recebidas por email aparecerão aqui para revisão e aprovação.
        </p>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: Add route in App.tsx**

Add import:
```typescript
import NfeInbox from "./pages/financeiro/NfeInbox";
```

Add route (before the configuracoes route):
```tsx
<Route path="/financeiro/nfe" element={<ProtectedRoute><NfeInbox /></ProtectedRoute>} />
```

- [ ] **Step 4: Verify build**

```bash
cd /tmp/arscorrea && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/financeiro/Financeiro.tsx src/pages/financeiro/NfeInbox.tsx src/App.tsx
git commit -m "feat: add NF-e tab and placeholder page to financeiro module"
```

---

## Summary

| Task | What | Effort |
|---|---|---|
| 1 | `nfe_inbox` table (18 columns, enums, RLS) | Low |
| 2 | UNIQUE index on `suppliers.document` | Trivial |
| 3 | `codigo` slug on `financial_categories` | Low |
| 4 | Storage bucket `nfe-attachments` | Trivial |
| 5 | NF-e tab + placeholder page + route | Low |

**Total: 5 tasks, ~20 steps. No external dependencies.**

After this plan: the system is ready for Plano B (edge functions) and Plano C (frontend inbox).
