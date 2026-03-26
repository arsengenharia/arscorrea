# Modulo Financeiro v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full financial module (v2) for ARS Engenharia — replacing the old `project_costs`/`project_revenues` tables with a unified `project_financial_entries` system, adding bank account management, bank reconciliation, cost allocation, and a rich financial dashboard per project.

**Architecture:** 4 phases, each producing working software. Phase 1 = DB foundation + basic CRUD pages. Phase 2 = financial dashboard with charts. Phase 3 = bank reconciliation with CSV/XLSX import. Phase 4 = cost allocation + PDF report. All new tables live in Supabase (Postgres); frontend is React + TypeScript + Tailwind + Shadcn UI + Recharts; edge functions run on Deno.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, React Hook Form + Zod, React Query, Supabase (Postgres + Auth + Storage + Edge Functions), Recharts, @react-pdf/renderer.

---

## Scope

This plan covers **Phase 1** (foundation) and **Phase 2** (dashboard/charts). Phases 3 and 4 (bank reconciliation, cost allocation, PDF report) will be separate plans once Phase 1-2 is deployed and validated by the user (Nivea).

**Phase 1-2 delivers:**
- 6 new DB tables + 2 altered tables + 1 DB function + RLS policies
- 4 new pages: Categorias, Contas, Lancamentos, Financeiro dashboard per obra
- Updated sidebar, routing, supplier form, project form
- Updated edge function `project-management-report`

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `supabase/migrations/025_financial_categories.sql` | Create `financial_categories` table + seed 8 default categories |
| `supabase/migrations/026_bank_accounts.sql` | Create `bank_accounts` table |
| `supabase/migrations/027_project_financial_entries.sql` | Create `project_financial_entries` table + indexes |
| `supabase/migrations/028_alter_projects_v2.sql` | Add `bank_account_id`, `orcamento_previsto`, computed columns to `projects` |
| `supabase/migrations/029_alter_suppliers_v2.sql` | Add v2 columns to `suppliers` |
| `supabase/migrations/030_calc_project_balance.sql` | Create `calc_project_balance` PL/pgSQL function |
| `supabase/migrations/031_rls_financeiro.sql` | RLS policies for all new tables + `financeiro` role |
| `src/pages/financeiro/Categorias.tsx` | CRUD page for financial categories |
| `src/pages/financeiro/Contas.tsx` | CRUD page for bank accounts |
| `src/pages/financeiro/FinanceiroLayout.tsx` | Sub-router wrapper for `/financeiro/*` routes |
| `src/pages/obras/Lancamentos.tsx` | Financial entry form + list for a project |
| `src/pages/obras/FinanceiroDashboard.tsx` | Financial dashboard per project (cards, charts, tables) |
| `src/components/financeiro/CategoryForm.tsx` | Dialog form for creating/editing a financial category |
| `src/components/financeiro/BankAccountForm.tsx` | Dialog form for creating/editing a bank account |
| `src/components/financeiro/LancamentoForm.tsx` | Dialog form for creating/editing a financial entry |
| `src/components/financeiro/EntryFilters.tsx` | Filter bar for entries (date, category, supplier, situacao, tipo_doc) |
| `src/components/financeiro/FinanceiroCards.tsx` | Summary cards: Total Recebido, Total Gasto, Saldo, Margem |
| `src/components/financeiro/CostByCategoryChart.tsx` | Stacked bar chart: cost by category by month |
| `src/components/financeiro/CurvaSChart.tsx` | Line chart: cumulative revenue vs cost |
| `src/components/financeiro/CostDistributionPie.tsx` | Pie chart: cost distribution by category |
| `src/components/financeiro/TopSuppliersTable.tsx` | Table: top suppliers by total spent |
| `src/lib/formatters.ts` | BRL currency formatter + date formatter (reusable) |

### Modified Files

| File | Change |
|---|---|
| `src/App.tsx` | Add routes for `/financeiro/*`, `/obras/:id/financeiro`, `/obras/:id/lancamentos` |
| `src/components/layout/AppSidebar.tsx` | Add "Financeiro" menu item |
| `src/components/suppliers/SupplierForm.tsx` | Add v2 fields: `tipo`, `categoria_padrao_id`, `chave_pix`, `observacoes`, `ativo` |
| `src/components/suppliers/SuppliersList.tsx` | Show new columns, filter by `ativo` |
| `src/components/projects/ProjectForm.tsx` | Add `bank_account_id` and `orcamento_previsto` fields |
| `src/pages/ProjectDetails.tsx` | Replace Custos/Receitas buttons with Financeiro/Lancamentos buttons |
| `src/integrations/supabase/types.ts` | Add types for new tables (auto-generated, but we add manual types too) |
| `supabase/functions/project-management-report/index.ts` | Migrate from `project_costs`/`project_revenues` to `project_financial_entries` |

---

## Phase 1 — Foundation

### Task 1: Create `financial_categories` table with seed data

**Files:**
- Create: `supabase/migrations/025_financial_categories.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 025_financial_categories.sql
CREATE TABLE financial_categories (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL,
  prefixo   text NOT NULL CHECK (prefixo IN ('CV', 'ROP', 'ADM')),
  e_receita boolean NOT NULL DEFAULT false,
  cor_hex   text NOT NULL,
  ativo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_categories" ON financial_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "financeiro_read_categories" ON financial_categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'financeiro')
  );

-- Seed default categories
INSERT INTO financial_categories (nome, prefixo, e_receita, cor_hex) VALUES
  ('Mão de Obra Direta', 'CV', false, '#7C3AED'),
  ('Materiais de Obra', 'CV', false, '#D97706'),
  ('Serviços Prestados', 'CV', false, '#065F46'),
  ('Equipamentos e Ferramentas', 'CV', false, '#2563EB'),
  ('Reembolsos e Outras Despesas de Obras', 'CV', false, '#6B7280'),
  ('Aporte de Clientes', 'ROP', true, '#16A34A'),
  ('Serviços Prestados (receita)', 'ROP', true, '#0D9488'),
  ('Custo Administrativo (indireto)', 'ADM', false, '#EC4899');
```

- [ ] **Step 2: Apply migration to Supabase**

Run via Supabase dashboard SQL editor or `supabase db push`. Verify 8 rows exist:

```sql
SELECT count(*) FROM financial_categories; -- expect 8
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/025_financial_categories.sql
git commit -m "feat: create financial_categories table with seed data"
```

---

### Task 2: Create `bank_accounts` table

**Files:**
- Create: `supabase/migrations/026_bank_accounts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 026_bank_accounts.sql
CREATE TABLE bank_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banco               text NOT NULL,
  agencia             text,
  conta               text NOT NULL,
  descricao           text,
  saldo_inicial       numeric(12, 2) NOT NULL DEFAULT 0,
  data_saldo_inicial  date NOT NULL,
  ativo               boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_bank_accounts" ON bank_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "financeiro_read_bank_accounts" ON bank_accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'financeiro')
  );
```

- [ ] **Step 2: Apply migration, verify table exists**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/026_bank_accounts.sql
git commit -m "feat: create bank_accounts table"
```

---

### Task 3: Alter `projects` table — add v2 columns

**Files:**
- Create: `supabase/migrations/028_alter_projects_v2.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 028_alter_projects_v2.sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS bank_account_id   uuid REFERENCES bank_accounts(id),
  ADD COLUMN IF NOT EXISTS orcamento_previsto numeric(14, 2),
  ADD COLUMN IF NOT EXISTS saldo_atual       numeric(12, 2),
  ADD COLUMN IF NOT EXISTS custo_realizado   numeric(12, 2),
  ADD COLUMN IF NOT EXISTS receita_realizada numeric(12, 2),
  ADD COLUMN IF NOT EXISTS margem_atual      numeric(5, 2),
  ADD COLUMN IF NOT EXISTS iec_atual         numeric(8, 4);
```

- [ ] **Step 2: Apply migration, verify columns exist**

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'projects' AND column_name IN ('bank_account_id', 'orcamento_previsto', 'saldo_atual');
-- expect 3 rows
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/028_alter_projects_v2.sql
git commit -m "feat: add financial columns to projects table"
```

---

### Task 4: Create `project_financial_entries` table + `calc_project_balance` function

**Files:**
- Create: `supabase/migrations/027_project_financial_entries.sql`
- Create: `supabase/migrations/030_calc_project_balance.sql`

- [ ] **Step 1: Write the entries migration**

```sql
-- 027_project_financial_entries.sql
CREATE TABLE project_financial_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bank_account_id  uuid NOT NULL REFERENCES bank_accounts(id),
  category_id      uuid NOT NULL REFERENCES financial_categories(id),
  supplier_id      uuid REFERENCES suppliers(id),
  data             date NOT NULL,
  valor            numeric(12, 2) NOT NULL,
  tipo_documento   text NOT NULL CHECK (tipo_documento IN ('Pix', 'Boleto', 'Transferência', 'Dinheiro', 'Outros', 'NF-e')),
  numero_documento text,
  situacao         text NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente', 'conciliado', 'divergente')),
  is_comprometido  boolean NOT NULL DEFAULT false,
  nota_fiscal      text,
  chave_nfe        text UNIQUE,
  arquivo_url      text,
  observacoes      text,
  created_by       uuid REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pfe_project    ON project_financial_entries(project_id);
CREATE INDEX idx_pfe_category   ON project_financial_entries(category_id);
CREATE INDEX idx_pfe_supplier   ON project_financial_entries(supplier_id);
CREATE INDEX idx_pfe_data       ON project_financial_entries(data DESC);
CREATE INDEX idx_pfe_situacao   ON project_financial_entries(situacao);

ALTER TABLE project_financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_entries" ON project_financial_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "financeiro_crud_entries" ON project_financial_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'financeiro')
  );
```

- [ ] **Step 2: Write the calc_project_balance function**

```sql
-- 030_calc_project_balance.sql
CREATE OR REPLACE FUNCTION calc_project_balance(p_project_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_receita    numeric;
  v_custo      numeric;
  v_orcamento  numeric;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END), 0),
    COALESCE(ABS(SUM(CASE WHEN valor < 0 THEN valor ELSE 0 END)), 0)
  INTO v_receita, v_custo
  FROM project_financial_entries
  WHERE project_id = p_project_id;

  SELECT COALESCE(orcamento_previsto, 0)
  INTO v_orcamento
  FROM projects WHERE id = p_project_id;

  UPDATE projects SET
    saldo_atual        = v_receita - v_custo,
    custo_realizado    = v_custo,
    receita_realizada  = v_receita,
    margem_atual       = CASE WHEN v_receita > 0 THEN ((v_receita - v_custo) / v_receita * 100) ELSE 0 END,
    iec_atual          = CASE WHEN v_orcamento > 0 THEN (v_custo / v_orcamento) ELSE NULL END
  WHERE id = p_project_id;
END;
$$;
```

- [ ] **Step 3: Apply both migrations, test the function**

```sql
-- Create a test: insert a dummy entry then call the function
-- (manual test in Supabase SQL editor against a test project)
SELECT calc_project_balance('some-project-id'::uuid);
SELECT saldo_atual, custo_realizado, receita_realizada FROM projects WHERE id = 'some-project-id';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/027_project_financial_entries.sql supabase/migrations/030_calc_project_balance.sql
git commit -m "feat: create project_financial_entries table and calc_project_balance function"
```

---

### Task 5: Alter `suppliers` table — add v2 columns

**Files:**
- Create: `supabase/migrations/029_alter_suppliers_v2.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 029_alter_suppliers_v2.sql
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS tipo                text CHECK (tipo IS NULL OR tipo IN ('Pessoa Fisica', 'Juridica', 'Autonomo')),
  ADD COLUMN IF NOT EXISTS categoria_padrao_id uuid REFERENCES financial_categories(id),
  ADD COLUMN IF NOT EXISTS chave_pix           text,
  ADD COLUMN IF NOT EXISTS observacoes         text,
  ADD COLUMN IF NOT EXISTS ativo               boolean NOT NULL DEFAULT true;
```

- [ ] **Step 2: Apply migration, verify**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/029_alter_suppliers_v2.sql
git commit -m "feat: add v2 columns to suppliers table"
```

---

### Task 6: Add `financeiro` role to `user_roles`

**Files:**
- Create: `supabase/migrations/031_rls_financeiro.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 031_rls_financeiro.sql
-- Allow 'financeiro' role in user_roles
ALTER TABLE user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin', 'client', 'financeiro'));
```

- [ ] **Step 2: Apply migration**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/031_rls_financeiro.sql
git commit -m "feat: add financeiro role to user_roles constraint"
```

---

### Task 7: Create shared formatters utility

**Files:**
- Create: `src/lib/formatters.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/formatters.ts

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/formatters.ts
git commit -m "feat: add shared BRL/date/percent formatters"
```

---

### Task 8: Financial Categories CRUD page

**Files:**
- Create: `src/components/financeiro/CategoryForm.tsx`
- Create: `src/pages/financeiro/Categorias.tsx`

- [ ] **Step 1: Create CategoryForm dialog component**

```tsx
// src/components/financeiro/CategoryForm.tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  prefixo: z.enum(["CV", "ROP", "ADM"]),
  e_receita: z.boolean(),
  cor_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor hex inválida"),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: any | null;
  onSaved: () => void;
}

export function CategoryForm({ open, onOpenChange, category, onSaved }: CategoryFormProps) {
  const isEditing = !!category;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", prefixo: "CV", e_receita: false, cor_hex: "#6B7280", ativo: true },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        nome: category.nome,
        prefixo: category.prefixo,
        e_receita: category.e_receita,
        cor_hex: category.cor_hex,
        ativo: category.ativo,
      });
    } else {
      form.reset({ nome: "", prefixo: "CV", e_receita: false, cor_hex: "#6B7280", ativo: true });
    }
  }, [category, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("financial_categories" as any)
          .update(values as any)
          .eq("id", category.id);
        if (error) throw error;
        toast.success("Categoria atualizada!");
      } else {
        const { error } = await supabase.from("financial_categories" as any).insert(values as any);
        if (error) throw error;
        toast.success("Categoria criada!");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar categoria");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input placeholder="Ex: Mão de Obra Direta" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="prefixo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefixo *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="CV">CV (Custo da Venda)</SelectItem>
                      <SelectItem value="ROP">ROP (Receita)</SelectItem>
                      <SelectItem value="ADM">ADM (Administrativo)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cor_hex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 items-center">
                      <Input type="color" className="w-12 h-9 p-1 cursor-pointer" value={field.value} onChange={field.onChange} />
                      <Input className="flex-1" placeholder="#7C3AED" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex gap-6">
              <FormField control={form.control} name="e_receita" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">É receita</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="ativo" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Ativo</FormLabel>
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-4 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{isEditing ? "Salvar" : "Criar"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the Categorias page**

```tsx
// src/pages/financeiro/Categorias.tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { CategoryForm } from "@/components/financeiro/CategoryForm";

interface Category {
  id: string;
  nome: string;
  prefixo: string;
  e_receita: boolean;
  cor_hex: string;
  ativo: boolean;
}

export default function Categorias() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["financial-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories" as any)
        .select("*")
        .order("prefixo")
        .order("nome");
      if (error) throw error;
      return data as unknown as Category[];
    },
  });

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Categorias Financeiras</h2>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Categoria
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Cor</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Prefixo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><div className="w-5 h-5 rounded-full border" style={{ backgroundColor: c.cor_hex }} /></TableCell>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell><Badge variant="outline">{c.prefixo}</Badge></TableCell>
                  <TableCell>{c.e_receita ? "Entrada" : "Saída"}</TableCell>
                  <TableCell>{c.ativo ? <Badge className="bg-green-100 text-green-800">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <CategoryForm
          open={formOpen}
          onOpenChange={setFormOpen}
          category={editing}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["financial-categories"] })}
        />
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/financeiro/CategoryForm.tsx src/pages/financeiro/Categorias.tsx
git commit -m "feat: add financial categories CRUD page"
```

---

### Task 9: Bank Accounts CRUD page

**Files:**
- Create: `src/components/financeiro/BankAccountForm.tsx`
- Create: `src/pages/financeiro/Contas.tsx`

- [ ] **Step 1: Create BankAccountForm dialog**

```tsx
// src/components/financeiro/BankAccountForm.tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  banco: z.string().min(2, "Banco é obrigatório"),
  agencia: z.string().optional(),
  conta: z.string().min(1, "Conta é obrigatória"),
  descricao: z.string().optional(),
  saldo_inicial: z.coerce.number(),
  data_saldo_inicial: z.string().min(1, "Data é obrigatória"),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface BankAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any | null;
  onSaved: () => void;
}

export function BankAccountForm({ open, onOpenChange, account, onSaved }: BankAccountFormProps) {
  const isEditing = !!account;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { banco: "", agencia: "", conta: "", descricao: "", saldo_inicial: 0, data_saldo_inicial: new Date().toISOString().split("T")[0], ativo: true },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        banco: account.banco,
        agencia: account.agencia || "",
        conta: account.conta,
        descricao: account.descricao || "",
        saldo_inicial: Number(account.saldo_inicial),
        data_saldo_inicial: account.data_saldo_inicial,
        ativo: account.ativo,
      });
    } else {
      form.reset({ banco: "", agencia: "", conta: "", descricao: "", saldo_inicial: 0, data_saldo_inicial: new Date().toISOString().split("T")[0], ativo: true });
    }
  }, [account, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = { ...values, agencia: values.agencia || null, descricao: values.descricao || null };
      if (isEditing) {
        const { error } = await supabase.from("bank_accounts" as any).update(payload as any).eq("id", account.id);
        if (error) throw error;
        toast.success("Conta atualizada!");
      } else {
        const { error } = await supabase.from("bank_accounts" as any).insert(payload as any);
        if (error) throw error;
        toast.success("Conta criada!");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar conta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Conta" : "Nova Conta Bancária"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="banco" render={({ field }) => (
              <FormItem>
                <FormLabel>Banco *</FormLabel>
                <FormControl><Input placeholder="Ex: Banco Inter" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="agencia" render={({ field }) => (
                <FormItem>
                  <FormLabel>Agência</FormLabel>
                  <FormControl><Input placeholder="0001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="conta" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta *</FormLabel>
                  <FormControl><Input placeholder="12345-6" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="descricao" render={({ field }) => (
              <FormItem>
                <FormLabel>Apelido</FormLabel>
                <FormControl><Input placeholder="Ex: Conta principal obras" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="saldo_inicial" render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo Inicial *</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_saldo_inicial" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do Saldo *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="ativo" render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">Ativo</FormLabel>
              </FormItem>
            )} />
            <div className="flex justify-end gap-4 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{isEditing ? "Salvar" : "Criar"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the Contas page**

```tsx
// src/pages/financeiro/Contas.tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { BankAccountForm } from "@/components/financeiro/BankAccountForm";
import { formatBRL, formatDate } from "@/lib/formatters";

interface BankAccount {
  id: string;
  banco: string;
  agencia: string | null;
  conta: string;
  descricao: string | null;
  saldo_inicial: number;
  data_saldo_inicial: string;
  ativo: boolean;
}

export default function Contas() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("*")
        .order("banco");
      if (error) throw error;
      return data as unknown as BankAccount[];
    },
  });

  return (
    <Layout>
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Contas Bancárias</h2>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Conta
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Apelido</TableHead>
                <TableHead>Saldo Inicial</TableHead>
                <TableHead>Data Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : accounts.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma conta cadastrada</TableCell></TableRow>
              ) : accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.banco}</TableCell>
                  <TableCell>{a.agencia || "—"}</TableCell>
                  <TableCell>{a.conta}</TableCell>
                  <TableCell>{a.descricao || "—"}</TableCell>
                  <TableCell>{formatBRL(Number(a.saldo_inicial))}</TableCell>
                  <TableCell>{formatDate(a.data_saldo_inicial)}</TableCell>
                  <TableCell>{a.ativo ? <Badge className="bg-green-100 text-green-800">Ativa</Badge> : <Badge variant="secondary">Inativa</Badge>}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <BankAccountForm
          open={formOpen}
          onOpenChange={setFormOpen}
          account={editing}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["bank-accounts"] })}
        />
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/financeiro/BankAccountForm.tsx src/pages/financeiro/Contas.tsx
git commit -m "feat: add bank accounts CRUD page"
```

---

### Task 10: Financial Entries (Lancamentos) page

**Files:**
- Create: `src/components/financeiro/LancamentoForm.tsx`
- Create: `src/pages/obras/Lancamentos.tsx`

- [ ] **Step 1: Create LancamentoForm dialog**

```tsx
// src/components/financeiro/LancamentoForm.tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  bank_account_id: z.string().uuid("Selecione uma conta"),
  category_id: z.string().uuid("Selecione uma categoria"),
  supplier_id: z.string().optional(),
  data: z.string().min(1, "Data é obrigatória"),
  valor: z.coerce.number().refine((v) => v !== 0, "Valor não pode ser zero"),
  tipo_documento: z.enum(["Pix", "Boleto", "Transferência", "Dinheiro", "Outros", "NF-e"]),
  numero_documento: z.string().optional(),
  situacao: z.enum(["pendente", "conciliado", "divergente"]),
  is_comprometido: z.boolean(),
  nota_fiscal: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LancamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  entry: any | null;
  onSaved: () => void;
}

export function LancamentoForm({ open, onOpenChange, projectId, entry, onSaved }: LancamentoFormProps) {
  const isEditing = !!entry;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bank_account_id: "",
      category_id: "",
      supplier_id: "",
      data: new Date().toISOString().split("T")[0],
      valor: 0,
      tipo_documento: "Pix",
      numero_documento: "",
      situacao: "pendente",
      is_comprometido: false,
      nota_fiscal: "",
      observacoes: "",
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("id, banco, conta, descricao")
        .eq("ativo", true)
        .order("banco");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["financial-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories" as any)
        .select("id, nome, prefixo, e_receita")
        .eq("ativo", true)
        .order("prefixo")
        .order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .select("id, trade_name")
        .order("trade_name");
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    if (entry) {
      form.reset({
        bank_account_id: entry.bank_account_id,
        category_id: entry.category_id,
        supplier_id: entry.supplier_id || "",
        data: entry.data,
        valor: Number(entry.valor),
        tipo_documento: entry.tipo_documento,
        numero_documento: entry.numero_documento || "",
        situacao: entry.situacao,
        is_comprometido: entry.is_comprometido,
        nota_fiscal: entry.nota_fiscal || "",
        observacoes: entry.observacoes || "",
      });
    } else {
      form.reset({
        bank_account_id: "",
        category_id: "",
        supplier_id: "",
        data: new Date().toISOString().split("T")[0],
        valor: 0,
        tipo_documento: "Pix",
        numero_documento: "",
        situacao: "pendente",
        is_comprometido: false,
        nota_fiscal: "",
        observacoes: "",
      });
    }
  }, [entry, open]);

  // Auto-set category when supplier has a default
  const watchSupplier = form.watch("supplier_id");
  useEffect(() => {
    if (!watchSupplier || isEditing) return;
    const sup = suppliers.find((s: any) => s.id === watchSupplier);
    if (sup?.categoria_padrao_id) {
      form.setValue("category_id", sup.categoria_padrao_id);
    }
  }, [watchSupplier]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        project_id: projectId,
        supplier_id: values.supplier_id || null,
        numero_documento: values.numero_documento || null,
        nota_fiscal: values.nota_fiscal || null,
        observacoes: values.observacoes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("project_financial_entries" as any)
          .update(payload as any)
          .eq("id", entry.id);
        if (error) throw error;
        toast.success("Lançamento atualizado!");
      } else {
        const { error } = await supabase
          .from("project_financial_entries" as any)
          .insert(payload as any);
        if (error) throw error;
        toast.success("Lançamento registrado!");
      }

      // Recalculate project balance
      await supabase.rpc("calc_project_balance", { p_project_id: projectId });

      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar lançamento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="bank_account_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta Bancária *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {accounts.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.banco} - {a.conta}{a.descricao ? ` (${a.descricao})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>[{c.prefixo}] {c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="supplier_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Fornecedor</FormLabel>
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.trade_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="data" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="valor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor * (+ entrada, - saída)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tipo_documento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Documento *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["Pix", "Boleto", "Transferência", "Dinheiro", "Outros", "NF-e"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="numero_documento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº Documento</FormLabel>
                  <FormControl><Input placeholder="Comprovante Pix, nº boleto..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nota_fiscal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota Fiscal</FormLabel>
                  <FormControl><Input placeholder="Número da NF" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea placeholder="Descrição do lançamento" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-6">
              <FormField control={form.control} name="is_comprometido" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Comprometido</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="situacao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Situação</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="w-40"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="conciliado">Conciliado</SelectItem>
                      <SelectItem value="divergente">Divergente</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-4 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{isEditing ? "Salvar" : "Registrar"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the Lancamentos page**

```tsx
// src/pages/obras/Lancamentos.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LancamentoForm } from "@/components/financeiro/LancamentoForm";
import { formatBRL, formatDate } from "@/lib/formatters";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Entry {
  id: string;
  data: string;
  valor: number;
  tipo_documento: string;
  numero_documento: string | null;
  situacao: string;
  is_comprometido: boolean;
  observacoes: string | null;
  nota_fiscal: string | null;
  bank_account_id: string;
  category_id: string;
  supplier_id: string | null;
  category: { nome: string; prefixo: string; cor_hex: string } | null;
  supplier: { trade_name: string } | null;
  bank_account: { banco: string; conta: string } | null;
}

export default function Lancamentos() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["project-entries", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select("*, category:financial_categories(nome, prefixo, cor_hex), supplier:suppliers(trade_name), bank_account:bank_accounts(banco, conta)")
        .eq("project_id", projectId!)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as unknown as Entry[];
    },
  });

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("project_financial_entries" as any).delete().eq("id", deletingId);
    if (error) {
      toast.error("Erro ao excluir lançamento");
    } else {
      toast.success("Lançamento excluído");
      await supabase.rpc("calc_project_balance", { p_project_id: projectId });
      queryClient.invalidateQueries({ queryKey: ["project-entries", projectId] });
    }
    setDeletingId(null);
  };

  const situacaoBadge = (s: string) => {
    switch (s) {
      case "conciliado": return <Badge className="bg-green-100 text-green-800">Conciliado</Badge>;
      case "divergente": return <Badge className="bg-red-100 text-red-800">Divergente</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate(`/obras/${projectId}`)} className="rounded-full">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Lançamentos Financeiros</h2>
          </div>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Tipo Doc</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum lançamento registrado</TableCell></TableRow>
              ) : entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.data)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.category?.cor_hex }} />
                      <span className="text-xs text-muted-foreground">[{e.category?.prefixo}]</span>
                      {e.category?.nome}
                    </div>
                  </TableCell>
                  <TableCell>{e.supplier?.trade_name || "—"}</TableCell>
                  <TableCell>{e.tipo_documento}</TableCell>
                  <TableCell className={`text-right font-mono ${Number(e.valor) >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatBRL(Number(e.valor))}
                  </TableCell>
                  <TableCell>{situacaoBadge(e.situacao)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingId(e.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <LancamentoForm
          open={formOpen}
          onOpenChange={setFormOpen}
          projectId={projectId!}
          entry={editing}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["project-entries", projectId] })}
        />

        <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/financeiro/LancamentoForm.tsx src/pages/obras/Lancamentos.tsx
git commit -m "feat: add financial entries (lancamentos) page for projects"
```

---

### Task 11: Update routing, sidebar, and project details

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppSidebar.tsx`
- Modify: `src/pages/ProjectDetails.tsx`

- [ ] **Step 1: Update App.tsx — add new routes**

Add these imports at the top of `src/App.tsx`:

```typescript
import Categorias from "./pages/financeiro/Categorias";
import Contas from "./pages/financeiro/Contas";
import Lancamentos from "./pages/obras/Lancamentos";
import FinanceiroDashboard from "./pages/obras/FinanceiroDashboard";
```

Add these routes inside the admin `{/* Admin routes */}` section, before the `<Route path="*"` catch-all:

```tsx
<Route path="/financeiro/categorias" element={<ProtectedRoute><Categorias /></ProtectedRoute>} />
<Route path="/financeiro/contas" element={<ProtectedRoute><Contas /></ProtectedRoute>} />
<Route path="/obras/:projectId/lancamentos" element={<ProtectedRoute><Lancamentos /></ProtectedRoute>} />
<Route path="/obras/:projectId/financeiro" element={<ProtectedRoute><FinanceiroDashboard /></ProtectedRoute>} />
```

- [ ] **Step 2: Update AppSidebar.tsx — add Financeiro section**

In `src/components/layout/AppSidebar.tsx`, add to the `menuItems` array:

```typescript
// Add Wallet icon import
import { Building, Calendar, FileText, Home, LogOut, PanelLeftClose, PanelLeftOpen, Users, Truck, Wallet } from "lucide-react";

// Add before "Fornecedores" in menuItems:
{
  title: "Financeiro",
  icon: Wallet,
  path: "/financeiro/categorias",
},
```

- [ ] **Step 3: Update ProjectDetails.tsx — replace Custos/Receitas buttons**

In `src/pages/ProjectDetails.tsx`, replace the Receitas and Custos buttons (lines ~184-204) with:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-slate-600 hover:text-green-600 hover:bg-green-50 h-8 px-2 lg:px-3"
  onClick={() => navigate(`/obras/${projectId}/financeiro`)}
  title="Dashboard Financeiro"
>
  <TrendingUp className="w-4 h-4 lg:mr-2" />
  <span className="hidden lg:inline">Financeiro</span>
</Button>

<Button
  variant="ghost"
  size="sm"
  className="text-slate-600 hover:text-amber-600 hover:bg-amber-50 h-8 px-2 lg:px-3"
  onClick={() => navigate(`/obras/${projectId}/lancamentos`)}
  title="Lançamentos"
>
  <DollarSign className="w-4 h-4 lg:mr-2" />
  <span className="hidden lg:inline">Lançamentos</span>
</Button>
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/AppSidebar.tsx src/pages/ProjectDetails.tsx
git commit -m "feat: add financial routes, sidebar item, and update project detail buttons"
```

---

### Task 12: Update SupplierForm with v2 fields

**Files:**
- Modify: `src/components/suppliers/SupplierForm.tsx`

- [ ] **Step 1: Update the schema and form**

Add to the Zod schema in `src/components/suppliers/SupplierForm.tsx`:

```typescript
const schema = z.object({
  trade_name: z.string().min(2, "Nome fantasia é obrigatório"),
  legal_name: z.string().optional(),
  document: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  // v2 fields
  tipo: z.string().optional(),
  categoria_padrao_id: z.string().optional(),
  chave_pix: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().optional(),
});
```

Add a query for categories:

```typescript
const { data: categories = [] } = useQuery({
  queryKey: ["financial-categories-active"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("financial_categories" as any)
      .select("id, nome, prefixo")
      .eq("ativo", true)
      .order("nome");
    if (error) throw error;
    return data as any[];
  },
});
```

Add the new form fields after the existing `address` field:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <FormField control={form.control} name="tipo" render={({ field }) => (
    <FormItem>
      <FormLabel>Tipo</FormLabel>
      <Select value={field.value || ""} onValueChange={field.onChange}>
        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
        <SelectContent>
          <SelectItem value="">Não definido</SelectItem>
          <SelectItem value="Pessoa Fisica">Pessoa Física</SelectItem>
          <SelectItem value="Juridica">Jurídica</SelectItem>
          <SelectItem value="Autonomo">Autônomo</SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  )} />
  <FormField control={form.control} name="categoria_padrao_id" render={({ field }) => (
    <FormItem>
      <FormLabel>Categoria Padrão</FormLabel>
      <Select value={field.value || ""} onValueChange={field.onChange}>
        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
        <SelectContent>
          <SelectItem value="">Nenhuma</SelectItem>
          {categories.map((c: any) => (
            <SelectItem key={c.id} value={c.id}>[{c.prefixo}] {c.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )} />
</div>
<FormField control={form.control} name="chave_pix" render={({ field }) => (
  <FormItem>
    <FormLabel>Chave Pix</FormLabel>
    <FormControl><Input placeholder="CPF, CNPJ, email ou celular" {...field} /></FormControl>
  </FormItem>
)} />
```

Update default values to include new fields and the `reset` calls in useEffect.

- [ ] **Step 2: Commit**

```bash
git add src/components/suppliers/SupplierForm.tsx
git commit -m "feat: add v2 fields to supplier form (tipo, categoria, chave_pix)"
```

---

### Task 13: Update ProjectForm with bank_account_id and orcamento_previsto

**Files:**
- Modify: `src/components/projects/ProjectForm.tsx`

- [ ] **Step 1: Update schema and form**

Add to the Zod schema:

```typescript
const projectFormSchema = z.object({
  client_id: z.string().uuid("Selecione um cliente"),
  status: z.string().min(1, "Status é obrigatório"),
  project_manager: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  bank_account_id: z.string().optional(),
  orcamento_previsto: z.coerce.number().optional(),
});
```

Add a query for bank accounts:

```typescript
const { data: bankAccounts = [] } = useQuery({
  queryKey: ["bank-accounts-active"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bank_accounts" as any)
      .select("id, banco, conta, descricao")
      .eq("ativo", true)
      .order("banco");
    if (error) throw error;
    return data as any[];
  },
});
```

Add form fields after existing fields:

```tsx
<FormField control={form.control} name="bank_account_id" render={({ field }) => (
  <FormItem>
    <FormLabel>Conta Bancária</FormLabel>
    <Select value={field.value || ""} onValueChange={field.onChange}>
      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
      <SelectContent>
        <SelectItem value="">Nenhuma</SelectItem>
        {bankAccounts.map((a: any) => (
          <SelectItem key={a.id} value={a.id}>{a.banco} - {a.conta}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </FormItem>
)} />
<FormField control={form.control} name="orcamento_previsto" render={({ field }) => (
  <FormItem>
    <FormLabel>Orçamento Previsto (R$)</FormLabel>
    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
  </FormItem>
)} />
```

Include in `projectData` on the mutation:

```typescript
bank_account_id: values.bank_account_id || null,
orcamento_previsto: values.orcamento_previsto || null,
```

- [ ] **Step 2: Commit**

```bash
git add src/components/projects/ProjectForm.tsx
git commit -m "feat: add bank account and budget fields to project form"
```

---

## Phase 2 — Dashboard & Charts

### Task 14: Financial Dashboard Cards component

**Files:**
- Create: `src/components/financeiro/FinanceiroCards.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/financeiro/FinanceiroCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";
import { formatBRL, formatPercent } from "@/lib/formatters";

interface FinanceiroCardsProps {
  totalRecebido: number;
  totalGasto: number;
  saldo: number;
  margem: number;
  iecAtual: number | null;
}

export function FinanceiroCards({ totalRecebido, totalGasto, saldo, margem, iecAtual }: FinanceiroCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">{formatBRL(totalRecebido)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700">{formatBRL(totalGasto)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo da Obra</CardTitle>
          <Wallet className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${saldo >= 0 ? "text-green-700" : "text-red-700"}`}>{formatBRL(saldo)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Margem Bruta</CardTitle>
          <BarChart3 className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(margem)}</div>
          {iecAtual !== null && (
            <p className={`text-xs mt-1 ${iecAtual > 1 ? "text-red-600" : "text-green-600"}`}>
              IEC: {iecAtual.toFixed(3)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/financeiro/FinanceiroCards.tsx
git commit -m "feat: add financial summary cards component"
```

---

### Task 15: Cost by Category chart (stacked bars)

**Files:**
- Create: `src/components/financeiro/CostByCategoryChart.tsx`

- [ ] **Step 1: Create the chart component**

```tsx
// src/components/financeiro/CostByCategoryChart.tsx
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Entry {
  data: string;
  valor: number;
  category: { nome: string; cor_hex: string } | null;
}

interface CostByCategoryChartProps {
  entries: Entry[];
}

export function CostByCategoryChart({ entries }: CostByCategoryChartProps) {
  const { chartData, categoryNames, categoryColors } = useMemo(() => {
    const costs = entries.filter((e) => Number(e.valor) < 0);
    const catSet = new Map<string, string>();
    const monthMap = new Map<string, Record<string, number>>();

    for (const e of costs) {
      const catName = e.category?.nome || "Outros";
      const catColor = e.category?.cor_hex || "#6B7280";
      catSet.set(catName, catColor);

      const [y, m] = e.data.split("-");
      const key = `${m}/${y}`;
      if (!monthMap.has(key)) monthMap.set(key, {});
      const month = monthMap.get(key)!;
      month[catName] = (month[catName] || 0) + Math.abs(Number(e.valor));
    }

    const sorted = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const data = sorted.map(([mes, cats]) => ({ mes, ...cats }));
    const names = [...catSet.keys()];
    const colors = Object.fromEntries(catSet.entries());

    return { chartData: data, categoryNames: names, categoryColors: colors };
  }, [entries]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Custo por Categoria por Mês</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm text-center py-8">Sem dados de custo</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Custo por Categoria por Mês</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            <Legend />
            {categoryNames.map((name) => (
              <Bar key={name} dataKey={name} stackId="a" fill={categoryColors[name]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/financeiro/CostByCategoryChart.tsx
git commit -m "feat: add cost by category stacked bar chart"
```

---

### Task 16: Curva S financial chart (cumulative lines)

**Files:**
- Create: `src/components/financeiro/CurvaSChart.tsx`

- [ ] **Step 1: Create the chart**

```tsx
// src/components/financeiro/CurvaSChart.tsx
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Entry {
  data: string;
  valor: number;
}

interface CurvaSChartProps {
  entries: Entry[];
}

export function CurvaSChart({ entries }: CurvaSChartProps) {
  const chartData = useMemo(() => {
    const monthMap = new Map<string, { receita: number; custo: number }>();

    for (const e of entries) {
      const [y, m] = e.data.split("-");
      const key = `${m}/${y}`;
      if (!monthMap.has(key)) monthMap.set(key, { receita: 0, custo: 0 });
      const bucket = monthMap.get(key)!;
      const val = Number(e.valor);
      if (val > 0) bucket.receita += val;
      else bucket.custo += Math.abs(val);
    }

    const sorted = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let acumReceita = 0;
    let acumCusto = 0;

    return sorted.map(([mes, { receita, custo }]) => {
      acumReceita += receita;
      acumCusto += custo;
      return { mes, "Receita Acumulada": acumReceita, "Custo Acumulado": acumCusto };
    });
  }, [entries]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Curva S Financeira</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm text-center py-8">Sem dados</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Curva S Financeira</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            <Legend />
            <Line type="monotone" dataKey="Receita Acumulada" stroke="#16A34A" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Custo Acumulado" stroke="#DC2626" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/financeiro/CurvaSChart.tsx
git commit -m "feat: add financial Curva S chart (cumulative revenue vs cost)"
```

---

### Task 17: Cost distribution pie chart

**Files:**
- Create: `src/components/financeiro/CostDistributionPie.tsx`

- [ ] **Step 1: Create the chart**

```tsx
// src/components/financeiro/CostDistributionPie.tsx
import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Entry {
  valor: number;
  category: { nome: string; cor_hex: string } | null;
}

interface CostDistributionPieProps {
  entries: Entry[];
}

export function CostDistributionPie({ entries }: CostDistributionPieProps) {
  const data = useMemo(() => {
    const map = new Map<string, { value: number; color: string }>();
    for (const e of entries) {
      if (Number(e.valor) >= 0) continue;
      const name = e.category?.nome || "Outros";
      const color = e.category?.cor_hex || "#6B7280";
      const existing = map.get(name) || { value: 0, color };
      existing.value += Math.abs(Number(e.valor));
      map.set(name, existing);
    }
    return [...map.entries()].map(([name, { value, color }]) => ({ name, value, color }));
  }, [entries]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Distribuição de Custos</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm text-center py-8">Sem dados de custo</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Distribuição de Custos</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/financeiro/CostDistributionPie.tsx
git commit -m "feat: add cost distribution pie chart"
```

---

### Task 18: Top Suppliers table

**Files:**
- Create: `src/components/financeiro/TopSuppliersTable.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/financeiro/TopSuppliersTable.tsx
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/formatters";

interface Entry {
  valor: number;
  supplier: { trade_name: string } | null;
}

interface TopSuppliersTableProps {
  entries: Entry[];
}

export function TopSuppliersTable({ entries }: TopSuppliersTableProps) {
  const ranked = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (Number(e.valor) >= 0 || !e.supplier) continue;
      const name = e.supplier.trade_name;
      map.set(name, (map.get(name) || 0) + Math.abs(Number(e.valor)));
    }
    return [...map.entries()]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [entries]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Top Fornecedores</CardTitle></CardHeader>
      <CardContent>
        {ranked.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Sem dados</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Total Gasto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((r, i) => (
                <TableRow key={r.nome}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(r.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/financeiro/TopSuppliersTable.tsx
git commit -m "feat: add top suppliers table component"
```

---

### Task 19: Financial Dashboard page (assembles everything)

**Files:**
- Create: `src/pages/obras/FinanceiroDashboard.tsx`

- [ ] **Step 1: Create the dashboard page**

```tsx
// src/pages/obras/FinanceiroDashboard.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { FinanceiroCards } from "@/components/financeiro/FinanceiroCards";
import { CostByCategoryChart } from "@/components/financeiro/CostByCategoryChart";
import { CurvaSChart } from "@/components/financeiro/CurvaSChart";
import { CostDistributionPie } from "@/components/financeiro/CostDistributionPie";
import { TopSuppliersTable } from "@/components/financeiro/TopSuppliersTable";

export default function FinanceiroDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name, saldo_atual, custo_realizado, receita_realizada, margem_atual, iec_atual, orcamento_previsto")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["project-entries-full", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select("*, category:financial_categories(nome, prefixo, cor_hex), supplier:suppliers(trade_name), bank_account:bank_accounts(banco, conta)")
        .eq("project_id", projectId!)
        .order("data", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const totalRecebido = Number(project?.receita_realizada) || 0;
  const totalGasto = Number(project?.custo_realizado) || 0;
  const saldo = Number(project?.saldo_atual) || 0;
  const margem = Number(project?.margem_atual) || 0;
  const iecAtual = project?.iec_atual != null ? Number(project.iec_atual) : null;

  // Alerts
  const alerts: { text: string; color: string }[] = [];
  if (saldo < 0) alerts.push({ text: "Saldo negativo", color: "bg-red-100 text-red-800" });
  if (iecAtual !== null && iecAtual > 1) alerts.push({ text: `IEC ${iecAtual.toFixed(3)} — acima do orçamento`, color: "bg-orange-100 text-orange-800" });
  const pendingCount = entries.filter((e: any) => e.situacao === "pendente").length;
  if (pendingCount > 0) alerts.push({ text: `${pendingCount} lançamento(s) não conciliado(s)`, color: "bg-yellow-100 text-yellow-800" });

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate(`/obras/${projectId}`)} className="rounded-full">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Dashboard Financeiro</h2>
              <p className="text-muted-foreground">{project?.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(`/obras/${projectId}/lancamentos`)}>
            Ver Lançamentos
          </Button>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <Badge key={i} className={a.color}>
                <AlertTriangle className="w-3 h-3 mr-1" />
                {a.text}
              </Badge>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando dados financeiros...</p>
        ) : (
          <>
            <FinanceiroCards
              totalRecebido={totalRecebido}
              totalGasto={totalGasto}
              saldo={saldo}
              margem={margem}
              iecAtual={iecAtual}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <CostByCategoryChart entries={entries} />
              <CurvaSChart entries={entries} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <CostDistributionPie entries={entries} />
              <TopSuppliersTable entries={entries} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Verify the route was already added in Task 11**

The route `/obras/:projectId/financeiro` pointing to `FinanceiroDashboard` should already exist from Task 11.

- [ ] **Step 3: Commit**

```bash
git add src/pages/obras/FinanceiroDashboard.tsx
git commit -m "feat: add project financial dashboard with cards, charts, and alerts"
```

---

### Task 20: Update edge function `project-management-report` to use new tables

**Files:**
- Modify: `supabase/functions/project-management-report/index.ts`

- [ ] **Step 1: Replace cost/revenue queries with project_financial_entries**

In `supabase/functions/project-management-report/index.ts`, replace lines 46-55 (the `project_costs` and `project_revenues` queries) with:

```typescript
    // Fetch financial entries (v2 — replaces project_costs + project_revenues)
    const { data: entries } = await supabase
      .from("project_financial_entries")
      .select("*, category:financial_categories(nome, prefixo, e_receita)")
      .eq("project_id", project_id);

    const allEntries = entries || [];
```

Replace the financial calculation section (lines 106-114) with:

```typescript
    // Financial — derived from project_financial_entries
    const custoDiretoPrev = 0; // v2 does not track "previsto" per entry — uses orcamento_previsto
    const custoIndiretoPrev = 0;
    const custoDiretoReal = allEntries
      .filter((e) => Number(e.valor) < 0 && e.category?.prefixo === "CV")
      .reduce((s, e) => s + Math.abs(Number(e.valor)), 0);
    const custoIndiretoReal = allEntries
      .filter((e) => Number(e.valor) < 0 && e.category?.prefixo === "ADM")
      .reduce((s, e) => s + Math.abs(Number(e.valor)), 0);
    const custoTotalPrev = Number(project.orcamento_previsto) || 0;
    const custoTotalReal = custoDiretoReal + custoIndiretoReal;

    const receitaPrev = 0; // v2 tracks only realized values
    const receitaReal = allEntries
      .filter((e) => Number(e.valor) > 0)
      .reduce((s, e) => s + Number(e.valor), 0);
```

The rest of the calculations (saldo, margem, IEC) remain the same since they use the same variable names.

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/project-management-report/index.ts
git commit -m "feat: migrate project-management-report to use project_financial_entries"
```

---

### Task 21: Final integration verification

- [ ] **Step 1: Run the frontend build**

```bash
cd /tmp/arscorrea && npm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 2: Manual test checklist**

1. Navigate to `/financeiro/categorias` — 8 seeded categories visible
2. Create a new bank account at `/financeiro/contas`
3. Navigate to an existing project, click "Lançamentos"
4. Create a new entry (negative value = cost)
5. Create a new entry (positive value = revenue)
6. Navigate to the project's financial dashboard — cards show correct totals
7. Charts render with data
8. Sidebar shows "Financeiro" link

- [ ] **Step 3: Commit any fixes, then tag Phase 1-2 complete**

```bash
git add -A
git commit -m "fix: integration fixes for financial module v2 phase 1-2"
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|---|---|---|
| Phase 1 | Tasks 1–13 | DB tables, migrations, RLS, CRUD pages (categorias, contas, lançamentos), updated forms |
| Phase 2 | Tasks 14–21 | Financial dashboard, 3 chart types, top suppliers, alerts, edge function migration |

**Total: 21 tasks, ~65 steps**

**What's NOT in this plan (future plans):**
- Phase 3: Bank reconciliation (`bank_transactions`, `bank_reconciliations`, `import-bank-statement` edge function, `/financeiro/conciliacao` page)
- Phase 4: Cost allocation (`cost_allocations`, `/financeiro/rateio`, `generate-financial-report` edge function, PDF export)
