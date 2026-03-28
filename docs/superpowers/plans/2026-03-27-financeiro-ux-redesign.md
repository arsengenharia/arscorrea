# Financeiro UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the `/financeiro` module from a config-first layout to a work-first layout, adding a global financial dashboard, global lancamentos page, and merging config pages — following the UX analysis in `02-Empresas/ARS-Oren/Analise-UX-Financeiro-v2.md`.

**Architecture:** The new tab order is: Visão Geral (global dashboard) > Lançamentos (global) > Conciliação (existing, improved) > Rateio (existing, improved) > Configurações (merged Categorias + Contas). The existing per-project pages (`/obras/:id/financeiro` and `/obras/:id/lancamentos`) are kept as-is.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Shadcn UI, React Query, Supabase, Recharts.

---

## Current State

```
/financeiro → redirects to /financeiro/categorias
  ├── Categorias (config, rarely used — CURRENT LANDING)
  ├── Contas Bancárias (config)
  ├── Conciliação (operational)
  └── Rateio (operational)
```

## Target State

```
/financeiro → /financeiro/visao-geral (NEW LANDING)
  ├── Visão Geral (global dashboard — NEW)
  ├── Lançamentos (global entries table — NEW)
  ├── Conciliação (improved — project name in match dialog)
  ├── Rateio (improved — "rateado" flag)
  └── Configurações (merged Categorias + Contas — NEW)
```

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `src/pages/financeiro/VisaoGeral.tsx` | Global financial dashboard: KPIs across all projects, summary table by project (clickable), pending actions |
| `src/pages/financeiro/LancamentosGlobal.tsx` | Global entries table with filters (project, category, period, status), "Novo Lançamento" with project selector |
| `src/pages/financeiro/Configuracoes.tsx` | Merged page with two sections: Categorias + Contas Bancárias (reuses existing components) |

### Modified Files

| File | Change |
|---|---|
| `src/pages/financeiro/Financeiro.tsx` | New tab array, new redirect target, `isActive` logic for nested paths |
| `src/App.tsx` | Add 3 new routes, update redirect, remove standalone categorias/contas routes |
| `src/components/financeiro/LancamentoForm.tsx` | Make `projectId` optional, add project selector when not provided |
| `src/pages/financeiro/Conciliacao.tsx` | Add project name to MatchDialog entries query |
| `src/pages/financeiro/Rateio.tsx` | Add "Rateado" flag column to ADM entries table |

### Deleted Files (routes removed, files kept for reference)

| File | Action |
|---|---|
| `src/pages/financeiro/Categorias.tsx` | Keep file, remove standalone route (embedded in Configuracoes) |
| `src/pages/financeiro/Contas.tsx` | Keep file, remove standalone route (embedded in Configuracoes) |

---

## Task 1: Update FinanceiroTabs and routing

**Files:**
- Modify: `src/pages/financeiro/Financeiro.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite Financeiro.tsx with new tabs**

Replace the entire content of `src/pages/financeiro/Financeiro.tsx`:

```tsx
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Receipt, GitMerge, Split, Settings } from "lucide-react";

const tabs = [
  { label: "Visão Geral", path: "/financeiro/visao-geral", icon: LayoutDashboard },
  { label: "Lançamentos", path: "/financeiro/lancamentos", icon: Receipt },
  { label: "Conciliação", path: "/financeiro/conciliacao", icon: GitMerge },
  { label: "Rateio", path: "/financeiro/rateio", icon: Split },
  { label: "Configurações", path: "/financeiro/configuracoes", icon: Settings },
];

export default function Financeiro() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/financeiro") {
    navigate("/financeiro/visao-geral", { replace: true });
    return null;
  }

  return null;
}

export function FinanceiroTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex gap-1 border-b mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path
          || (tab.path === "/financeiro/configuracoes" && (location.pathname === "/financeiro/categorias" || location.pathname === "/financeiro/contas"));
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx routes**

In `src/App.tsx`:

Add imports:
```tsx
import VisaoGeral from "./pages/financeiro/VisaoGeral";
import LancamentosGlobal from "./pages/financeiro/LancamentosGlobal";
import Configuracoes from "./pages/financeiro/Configuracoes";
```

Replace the financeiro route block (lines 81-85) with:
```tsx
<Route path="/financeiro" element={<ProtectedRoute><Navigate to="/financeiro/visao-geral" replace /></ProtectedRoute>} />
<Route path="/financeiro/visao-geral" element={<ProtectedRoute><VisaoGeral /></ProtectedRoute>} />
<Route path="/financeiro/lancamentos" element={<ProtectedRoute><LancamentosGlobal /></ProtectedRoute>} />
<Route path="/financeiro/conciliacao" element={<ProtectedRoute><Conciliacao /></ProtectedRoute>} />
<Route path="/financeiro/rateio" element={<ProtectedRoute><Rateio /></ProtectedRoute>} />
<Route path="/financeiro/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
{/* Keep old routes as aliases for bookmarks */}
<Route path="/financeiro/categorias" element={<ProtectedRoute><Navigate to="/financeiro/configuracoes" replace /></ProtectedRoute>} />
<Route path="/financeiro/contas" element={<ProtectedRoute><Navigate to="/financeiro/configuracoes" replace /></ProtectedRoute>} />
```

Remove the standalone Categorias and Contas route imports if no longer needed directly (they'll be imported by Configuracoes).

- [ ] **Step 3: Create placeholder files so build passes**

Create minimal placeholder pages so the build doesn't break (actual implementation follows in later tasks):

`src/pages/financeiro/VisaoGeral.tsx`:
```tsx
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
export default function VisaoGeral() {
  return <Layout><div className="w-full max-w-6xl mx-auto space-y-6"><h2 className="text-3xl font-bold tracking-tight">Financeiro</h2><FinanceiroTabs /><p className="text-muted-foreground">Visão Geral — em construção</p></div></Layout>;
}
```

`src/pages/financeiro/LancamentosGlobal.tsx`:
```tsx
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
export default function LancamentosGlobal() {
  return <Layout><div className="w-full max-w-6xl mx-auto space-y-6"><h2 className="text-3xl font-bold tracking-tight">Financeiro</h2><FinanceiroTabs /><p className="text-muted-foreground">Lançamentos — em construção</p></div></Layout>;
}
```

`src/pages/financeiro/Configuracoes.tsx`:
```tsx
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
export default function Configuracoes() {
  return <Layout><div className="w-full max-w-6xl mx-auto space-y-6"><h2 className="text-3xl font-bold tracking-tight">Financeiro</h2><FinanceiroTabs /><p className="text-muted-foreground">Configurações — em construção</p></div></Layout>;
}
```

- [ ] **Step 4: Verify build**

```bash
cd /tmp/arscorrea && npm run build
```
Expected: build passes, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/financeiro/Financeiro.tsx src/pages/financeiro/VisaoGeral.tsx src/pages/financeiro/LancamentosGlobal.tsx src/pages/financeiro/Configuracoes.tsx src/App.tsx
git commit -m "feat: restructure financeiro tabs (Visão Geral > Lançamentos > Conciliação > Rateio > Config)"
```

---

## Task 2: Configurações page (merge Categorias + Contas)

**Files:**
- Modify: `src/pages/financeiro/Configuracoes.tsx`

- [ ] **Step 1: Implement Configuracoes with embedded Categorias and Contas**

The idea: import the content from existing pages as components. Both Categorias.tsx and Contas.tsx are self-contained pages with `<Layout>` wrapper. We need to extract their inner content.

The simplest approach: Configuracoes renders both sections in one page with section headers and a toggle.

Replace `src/pages/financeiro/Configuracoes.tsx` with:

```tsx
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { CategoryForm } from "@/components/financeiro/CategoryForm";
import { BankAccountForm } from "@/components/financeiro/BankAccountForm";
import { formatBRL, formatDate } from "@/lib/formatters";

// ─── Types ───
interface FinancialCategory {
  id: string;
  nome: string;
  prefixo: "CV" | "ROP" | "ADM";
  e_receita: boolean;
  cor_hex: string;
  ativo: boolean;
}

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

export default function Configuracoes() {
  const queryClient = useQueryClient();

  // ─── Categories state ───
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<FinancialCategory | null>(null);

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["financial-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories" as any)
        .select("*")
        .order("prefixo")
        .order("nome");
      if (error) throw error;
      return data as unknown as FinancialCategory[];
    },
  });

  // ─── Bank Accounts state ───
  const [accFormOpen, setAccFormOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<BankAccount | null>(null);

  const { data: accounts = [], isLoading: loadingAccs } = useQuery({
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
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />

        {/* ── Section: Categorias ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Categorias Financeiras</h3>
            <Button size="sm" onClick={() => { setEditingCat(null); setCatFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nova Categoria
            </Button>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]">Cor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[64px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCats ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><div className="h-5 w-5 rounded-full border" style={{ backgroundColor: c.cor_hex }} /></TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell><Badge variant="outline">{c.prefixo}</Badge></TableCell>
                    <TableCell>{c.e_receita ? "Entrada" : "Saída"}</TableCell>
                    <TableCell>{c.ativo ? <Badge className="bg-green-100 text-green-800">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingCat(c); setCatFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Section: Contas Bancárias ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Contas Bancárias</h3>
            <Button size="sm" onClick={() => { setEditingAcc(null); setAccFormOpen(true); }}>
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
                  <TableHead className="w-[64px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAccs ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Nenhuma conta cadastrada</TableCell></TableRow>
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
                      <Button variant="ghost" size="icon" onClick={() => { setEditingAcc(a); setAccFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Dialogs */}
        <CategoryForm open={catFormOpen} onOpenChange={setCatFormOpen} category={editingCat} onSaved={() => queryClient.invalidateQueries({ queryKey: ["financial-categories"] })} />
        <BankAccountForm open={accFormOpen} onOpenChange={setAccFormOpen} account={editingAcc} onSaved={() => queryClient.invalidateQueries({ queryKey: ["bank-accounts"] })} />
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Verify build**

- [ ] **Step 3: Commit**

```bash
git add src/pages/financeiro/Configuracoes.tsx
git commit -m "feat: implement Configurações page merging Categorias + Contas"
```

---

## Task 3: Global Financial Dashboard (Visão Geral)

**Files:**
- Modify: `src/pages/financeiro/VisaoGeral.tsx`

- [ ] **Step 1: Implement the global dashboard**

Replace `src/pages/financeiro/VisaoGeral.tsx` with full implementation:

```tsx
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Clock, BarChart3 } from "lucide-react";
import { formatBRL, formatPercent } from "@/lib/formatters";
import { FinanceiroTabs } from "./Financeiro";

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  orcamento_previsto: number | null;
  custo_realizado: number | null;
  receita_realizada: number | null;
  saldo_atual: number | null;
  margem_atual: number | null;
  iec_atual: number | null;
}

export default function VisaoGeral() {
  const navigate = useNavigate();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects-financial-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, orcamento_previsto, custo_realizado, receita_realizada, saldo_atual, margem_atual, iec_atual")
        .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
        .order("name");
      if (error) throw error;
      return data as ProjectSummary[];
    },
  });

  // Pending actions counts
  const { data: pendingCounts } = useQuery({
    queryKey: ["financial-pending-counts"],
    queryFn: async () => {
      const [entriesRes, txRes] = await Promise.all([
        supabase.from("project_financial_entries" as any).select("id", { count: "exact", head: true }).eq("situacao", "pendente"),
        supabase.from("bank_transactions" as any).select("id", { count: "exact", head: true }).eq("status_conciliacao", "pendente"),
      ]);
      return {
        entriesPendentes: entriesRes.count || 0,
        txPendentes: txRes.count || 0,
      };
    },
  });

  // Aggregated KPIs
  const totalReceita = projects.reduce((s, p) => s + (Number(p.receita_realizada) || 0), 0);
  const totalCusto = projects.reduce((s, p) => s + (Number(p.custo_realizado) || 0), 0);
  const totalSaldo = totalReceita - totalCusto;
  const margemMedia = totalReceita > 0 ? ((totalReceita - totalCusto) / totalReceita) * 100 : 0;
  const obrasNegativas = projects.filter((p) => (Number(p.saldo_atual) || 0) < 0).length;
  const obrasIecAlto = projects.filter((p) => p.iec_atual != null && Number(p.iec_atual) > 1).length;

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatBRL(totalReceita)}</div>
              <p className="text-xs text-muted-foreground mt-1">{projects.length} obras ativas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{formatBRL(totalCusto)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Global</CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalSaldo >= 0 ? "text-green-700" : "text-red-700"}`}>{formatBRL(totalSaldo)}</div>
              <p className="text-xs text-muted-foreground mt-1">Margem média: {formatPercent(margemMedia)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendências</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {pendingCounts?.entriesPendentes ? (
                  <p className="text-sm"><span className="font-semibold text-amber-700">{pendingCounts.entriesPendentes}</span> lançamentos não conciliados</p>
                ) : null}
                {pendingCounts?.txPendentes ? (
                  <p className="text-sm"><span className="font-semibold text-amber-700">{pendingCounts.txPendentes}</span> transações bancárias pendentes</p>
                ) : null}
                {!pendingCounts?.entriesPendentes && !pendingCounts?.txPendentes && (
                  <p className="text-sm text-green-600 font-medium">Tudo em dia</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {(obrasNegativas > 0 || obrasIecAlto > 0) && (
          <div className="flex flex-wrap gap-2">
            {obrasNegativas > 0 && (
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {obrasNegativas} obra{obrasNegativas > 1 ? "s" : ""} com saldo negativo
              </Badge>
            )}
            {obrasIecAlto > 0 && (
              <Badge className="bg-orange-100 text-orange-800">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {obrasIecAlto} obra{obrasIecAlto > 1 ? "s" : ""} acima do orçamento (IEC &gt; 1)
              </Badge>
            )}
          </div>
        )}

        {/* Projects Summary Table */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Resumo por Obra</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obra</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">IEC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : projects.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma obra ativa</TableCell></TableRow>
                ) : projects.map((p) => {
                  const saldo = Number(p.saldo_atual) || 0;
                  const margem = Number(p.margem_atual) || 0;
                  const iec = p.iec_atual != null ? Number(p.iec_atual) : null;
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/obras/${p.id}/financeiro`)}
                    >
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      <TableCell className="text-right text-muted-foreground">{p.orcamento_previsto ? formatBRL(Number(p.orcamento_previsto)) : "—"}</TableCell>
                      <TableCell className="text-right text-green-700">{formatBRL(Number(p.receita_realizada) || 0)}</TableCell>
                      <TableCell className="text-right text-red-700">{formatBRL(Number(p.custo_realizado) || 0)}</TableCell>
                      <TableCell className={`text-right font-semibold ${saldo >= 0 ? "text-green-700" : "text-red-700"}`}>{formatBRL(saldo)}</TableCell>
                      <TableCell className="text-right">{formatPercent(margem)}</TableCell>
                      <TableCell className={`text-right ${iec !== null && iec > 1 ? "text-red-600 font-semibold" : ""}`}>{iec !== null ? iec.toFixed(3) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Clique em uma obra para ver o dashboard financeiro detalhado.</p>
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Verify build**

- [ ] **Step 3: Commit**

```bash
git add src/pages/financeiro/VisaoGeral.tsx
git commit -m "feat: implement global financial dashboard (Visão Geral)"
```

---

## Task 4: Global Lancamentos page

**Files:**
- Modify: `src/components/financeiro/LancamentoForm.tsx` — make projectId optional, add project selector
- Modify: `src/pages/financeiro/LancamentosGlobal.tsx` — full implementation

- [ ] **Step 1: Update LancamentoForm to support optional projectId**

In `src/components/financeiro/LancamentoForm.tsx`, change the interface:

```typescript
interface LancamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;  // ← now optional
  entry: any | null;
  onSaved: () => void;
}
```

Add a projects query inside the component (only when projectId is not provided):

```typescript
const { data: projects = [] } = useQuery({
  queryKey: ["projects-for-entry"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
      .order("name");
    if (error) throw error;
    return data as { id: string; name: string }[];
  },
  enabled: !projectId,
});
```

Add `project_id` to the schema when projectId is not provided:

```typescript
const schema = z.object({
  project_id: projectId ? z.string().optional() : z.string().uuid("Selecione uma obra"),
  bank_account_id: z.string().uuid("Selecione uma conta"),
  // ... rest unchanged
});
```

Add default value: `project_id: projectId || ""`

Add a project selector field at the top of the form (only when `!projectId`):

```tsx
{!projectId && (
  <FormField control={form.control} name="project_id" render={({ field }) => (
    <FormItem>
      <FormLabel>Obra *</FormLabel>
      <Select value={field.value} onValueChange={field.onChange}>
        <FormControl><SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger></FormControl>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )} />
)}
```

Update the payload construction to use `project_id` from form when projectId prop is absent:

```typescript
const payload = {
  ...values,
  project_id: projectId || values.project_id,
  // ... rest
};
```

And the `calc_project_balance` call:

```typescript
const balanceProjectId = projectId || values.project_id;
if (balanceProjectId) {
  await supabase.rpc("calc_project_balance", { p_project_id: balanceProjectId });
}
```

- [ ] **Step 2: Implement LancamentosGlobal page**

Replace `src/pages/financeiro/LancamentosGlobal.tsx`:

```tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LancamentoForm } from "@/components/financeiro/LancamentoForm";
import { formatBRL, formatDate } from "@/lib/formatters";
import { FinanceiroTabs } from "./Financeiro";

interface Entry {
  id: string;
  project_id: string;
  data: string;
  valor: number;
  tipo_documento: string;
  situacao: string;
  observacoes: string | null;
  bank_account_id: string;
  category_id: string;
  supplier_id: string | null;
  project: { name: string } | null;
  category: { nome: string; prefixo: string; cor_hex: string } | null;
  supplier: { trade_name: string } | null;
}

export default function LancamentosGlobal() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["all-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select("*, project:projects(name), category:financial_categories(nome, prefixo, cor_hex), supplier:suppliers(trade_name)")
        .order("data", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Entry[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-list-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_categories" as any).select("id, nome, prefixo").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = entries.filter((e) => {
    if (filterProject !== "all" && e.project_id !== filterProject) return false;
    if (filterCategory !== "all" && e.category_id !== filterCategory) return false;
    return true;
  });

  const handleDelete = async () => {
    if (!deletingId) return;
    const entry = entries.find((e) => e.id === deletingId);
    const { error } = await supabase.from("project_financial_entries" as any).delete().eq("id", deletingId);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Lançamento excluído");
      if (entry) await supabase.rpc("calc_project_balance", { p_project_id: entry.project_id });
      queryClient.invalidateQueries({ queryKey: ["all-entries"] });
    }
    setDeletingId(null);
  };

  const situacaoBadge = (s: string) => {
    if (s === "conciliado") return <Badge className="bg-green-100 text-green-800">Conciliado</Badge>;
    if (s === "divergente") return <Badge className="bg-red-100 text-red-800">Divergente</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Lançamentos</h3>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Todas as obras" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>[{c.prefixo}] {c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum lançamento encontrado</TableCell></TableRow>
              ) : filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.data)}</TableCell>
                  <TableCell className="font-medium">{e.project?.name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.category?.cor_hex }} />
                      <span className="text-xs text-muted-foreground">[{e.category?.prefixo}]</span>
                      {e.category?.nome}
                    </div>
                  </TableCell>
                  <TableCell>{e.supplier?.trade_name || "—"}</TableCell>
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
          entry={editing}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["all-entries"] })}
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

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add src/components/financeiro/LancamentoForm.tsx src/pages/financeiro/LancamentosGlobal.tsx
git commit -m "feat: add global lancamentos page with project filter and selector"
```

---

## Task 5: Improve Conciliação — add project name to MatchDialog

**Files:**
- Modify: `src/pages/financeiro/Conciliacao.tsx`

- [ ] **Step 1: Update FinancialEntry interface and query in MatchDialog**

In the `FinancialEntry` interface (around line 59), add:
```typescript
project: { name: string } | null;
```

In the MatchDialog query (around line 106), change `.select("*")` to:
```typescript
.select("*, project:projects(name)")
```

- [ ] **Step 2: Show project name in the entries table**

Add a "Obra" column header in the MatchDialog table (after "Descrição"):
```tsx
<TableHead>Obra</TableHead>
```

Add the cell in each row (after the observacoes cell):
```tsx
<TableCell className="text-sm text-muted-foreground">{entry.project?.name || "—"}</TableCell>
```

Update `colSpan` from 4 to 5 in loading and empty states.

- [ ] **Step 3: Verify build, commit**

```bash
git add src/pages/financeiro/Conciliacao.tsx
git commit -m "feat: show project name in Conciliação match dialog"
```

---

## Task 6: Improve Rateio — add "Rateado" flag

**Files:**
- Modify: `src/pages/financeiro/Rateio.tsx`

- [ ] **Step 1: Update ADM entries query to include allocation count**

Change the `adm-entries` query to also fetch allocation count. After fetching entries, do a second query:

```typescript
// After the existing admEntries query, add:
const { data: allocatedIds = [] } = useQuery({
  queryKey: ["allocated-entry-ids"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("cost_allocations" as any)
      .select("lancamento_id");
    if (error) throw error;
    const ids = new Set((data as any[]).map((r: any) => r.lancamento_id));
    return [...ids];
  },
});

const allocatedSet = new Set(allocatedIds);
```

- [ ] **Step 2: Add "Status" column to the ADM entries table**

Add header:
```tsx
<TableHead>Status</TableHead>
```

Add cell (after Valor):
```tsx
<TableCell>
  {allocatedSet.has(entry.id)
    ? <Badge className="bg-green-100 text-green-800">Rateado</Badge>
    : <Badge variant="outline">Pendente</Badge>
  }
</TableCell>
```

- [ ] **Step 3: Add filter toggle for pending only**

Add state:
```typescript
const [showPendingOnly, setShowPendingOnly] = useState(true);
```

Filter entries:
```typescript
const displayedEntries = showPendingOnly
  ? admEntries.filter((e) => !allocatedSet.has(e.id))
  : admEntries;
```

Add toggle button next to the section title:
```tsx
<div className="flex items-center gap-3">
  <CardTitle className="text-base">Lançamentos ADM para Ratear</CardTitle>
  <Button variant="ghost" size="sm" onClick={() => setShowPendingOnly(!showPendingOnly)}>
    {showPendingOnly ? "Mostrar todos" : "Só pendentes"}
  </Button>
</div>
```

Use `displayedEntries` instead of `admEntries` in the table map.

- [ ] **Step 4: Verify build, commit**

```bash
git add src/pages/financeiro/Rateio.tsx
git commit -m "feat: add Rateado flag and pending filter to Rateio page"
```

---

## Task 7: Final build verification and cleanup

**Files:**
- Verify all modified files

- [ ] **Step 1: Run build**

```bash
cd /tmp/arscorrea && npm run build
```

- [ ] **Step 2: Manual verification checklist**

1. `/financeiro` → redirects to `/financeiro/visao-geral`
2. Visão Geral shows KPI cards + projects table + pending counts
3. Click on a project row → navigates to `/obras/:id/financeiro`
4. Lançamentos tab → global table with project filter
5. "Novo Lançamento" → form has project selector dropdown
6. Conciliação → match dialog shows project name
7. Rateio → ADM entries have Rateado/Pendente badge, filter works
8. Configurações → both Categorias and Contas tables visible
9. Old URLs `/financeiro/categorias` and `/financeiro/contas` redirect to `/financeiro/configuracoes`

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: final adjustments for financeiro UX redesign"
```

- [ ] **Step 4: Push**

```bash
git push origin redesign
```

---

## Summary

| Task | Deliverable | Effort |
|---|---|---|
| Task 1 | New tabs, routing, placeholders | Low |
| Task 2 | Configurações (merged Categorias + Contas) | Low |
| Task 3 | Visão Geral (global dashboard) | Medium |
| Task 4 | Global Lançamentos + form with project selector | Medium-High |
| Task 5 | Conciliação — project name in match | Low |
| Task 6 | Rateio — Rateado flag + filter | Low |
| Task 7 | Build verification + cleanup | Low |

**Total: 7 tasks, ~30 steps**

Maps to UX analysis recommendations:
- R1 (landing page) → Task 3
- R2 (reorder tabs) → Task 1
- R3 (global lancamentos) → Task 4
- R4 (merge config) → Task 2
- R5 (dashboard global) → Task 3
- R7 (rateio flag) → Task 6
- R8 (project name in match) → Task 5
