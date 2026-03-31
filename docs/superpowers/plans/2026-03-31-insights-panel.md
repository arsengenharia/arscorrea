# Insights & Riscos Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New "Insights" tab in the Financeiro module showing real-time risk alerts with action shortcuts, budget projections per project, and a resolved-items audit trail.

**Architecture:** New page with 3 components (RiscosOperacionais, ProjecoesFinanceiras, ResolvidosRecentemente), backed by a SQL view for risks, a projection function with cron, and Supabase Realtime subscriptions for live updates.

**Tech Stack:** React + TypeScript + Tailwind + Shadcn UI, Supabase Realtime, PostgreSQL (views, functions, pg_cron), React Query

---

### Task 1: Database — Risks View, Projections Function, Cron

**Files:**
- Create: `supabase/migrations/20260331000200_insights_panel.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================================================
-- Insights Panel: risks view, projections function, cron
-- ============================================================================

-- 1. Add projection cache column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS projecao_json jsonb;

-- 2. Unified risks view
CREATE OR REPLACE VIEW v_insights_risks AS

-- NF-e pendente
SELECT
  'nfe_pendente' AS risk_type,
  CASE WHEN EXTRACT(EPOCH FROM now() - n.created_at) / 3600 > 120 THEN 'critica'
       WHEN EXTRACT(EPOCH FROM now() - n.created_at) / 3600 > 48 THEN 'alta'
       ELSE 'media' END AS severidade,
  NULL::uuid AS project_id,
  n.razao_social AS project_name,
  'NF-e de ' || COALESCE(n.razao_social, 'desconhecido') || ' (R$ ' || COALESCE(n.valor_total::text, '?') || ') pendente' AS descricao,
  ROUND(EXTRACT(EPOCH FROM now() - n.created_at) / 3600)::int AS age_hours,
  'navigate' AS action_type,
  '/financeiro/nfe?status=pendente' AS action_target,
  jsonb_build_object('nfe_id', n.id, 'valor', n.valor_total, 'fornecedor', n.razao_social) AS metadata
FROM nfe_inbox n
WHERE n.status = 'aguardando_revisao'
  AND n.created_at < now() - interval '48 hours'

UNION ALL

-- Conciliação atrasada
SELECT
  'conciliacao_atrasada',
  'media',
  e.project_id,
  p.name,
  'Lançamento de R$ ' || ABS(e.valor)::text || ' em ' || p.name || ' sem conciliação',
  ROUND(EXTRACT(EPOCH FROM now() - e.created_at) / 3600)::int,
  'navigate',
  '/financeiro/conciliacao?project_id=' || e.project_id::text,
  jsonb_build_object('entry_id', e.id, 'valor', e.valor)
FROM project_financial_entries e
JOIN projects p ON p.id = e.project_id
WHERE e.situacao = 'pendente'
  AND e.created_at < now() - interval '7 days'

UNION ALL

-- Orçamento estourado (IEC > 1.0)
SELECT
  'orcamento_estourado',
  'critica',
  p.id,
  p.name,
  'Obra ' || p.name || ' com IEC ' || ROUND(p.iec_atual::numeric, 3)::text || ' — orçamento estourado',
  0,
  'navigate',
  '/financeiro/indicadores?project_id=' || p.id::text,
  jsonb_build_object('iec', p.iec_atual, 'custo', p.custo_realizado, 'orcamento', p.orcamento_previsto)
FROM projects p
WHERE p.iec_atual > 1.0
  AND p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')

UNION ALL

-- Orçamento próximo do limite (IEC 0.85-1.0)
SELECT
  'orcamento_proximo',
  'media',
  p.id,
  p.name,
  'Obra ' || p.name || ' com IEC ' || ROUND(p.iec_atual::numeric, 3)::text || ' — próximo do limite',
  0,
  'navigate',
  '/financeiro/indicadores?project_id=' || p.id::text,
  jsonb_build_object('iec', p.iec_atual, 'custo', p.custo_realizado, 'orcamento', p.orcamento_previsto)
FROM projects p
WHERE p.iec_atual > 0.85 AND p.iec_atual <= 1.0
  AND p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')

UNION ALL

-- Obra sem medição > 45 dias
SELECT
  'sem_medicao',
  'alta',
  p.id,
  p.name,
  'Obra ' || p.name || ' sem medição há ' || COALESCE(
    ROUND(EXTRACT(EPOCH FROM now() - (SELECT MAX(periodo_fim) FROM medicoes WHERE project_id = p.id)) / 86400)::text,
    '?'
  ) || ' dias',
  COALESCE(ROUND(EXTRACT(EPOCH FROM now() - (SELECT MAX(periodo_fim) FROM medicoes WHERE project_id = p.id)) / 3600)::int, 9999),
  'navigate',
  '/obras/' || p.id::text || '/medicoes',
  jsonb_build_object('ultima_medicao', (SELECT MAX(periodo_fim) FROM medicoes WHERE project_id = p.id))
FROM projects p
WHERE p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')
  AND (
    NOT EXISTS (SELECT 1 FROM medicoes WHERE project_id = p.id)
    OR (SELECT MAX(periodo_fim) FROM medicoes WHERE project_id = p.id) < CURRENT_DATE - 45
  )

UNION ALL

-- Parcela vencida
SELECT
  'parcela_vencida',
  'alta',
  cp.project_id,
  p.name,
  'Parcela de R$ ' || cp.valor::text || ' vencida em ' || to_char(cp.vencimento, 'DD/MM/YYYY') || ' — ' || p.name,
  ROUND(EXTRACT(EPOCH FROM now() - cp.vencimento::timestamptz) / 3600)::int,
  'inline',
  'marcar_recebido',
  jsonb_build_object('payment_id', cp.id, 'valor', cp.valor, 'vencimento', cp.vencimento)
FROM contract_payments cp
JOIN contracts c ON c.id = cp.contract_id
JOIN projects p ON p.id = c.project_id
WHERE cp.vencimento < CURRENT_DATE
  AND cp.status != 'pago'

UNION ALL

-- Obra sem orçamento
SELECT
  'sem_orcamento',
  'baixa',
  p.id,
  p.name,
  'Obra ' || p.name || ' sem orçamento previsto definido',
  0,
  'inline',
  'definir_orcamento',
  jsonb_build_object('project_id', p.id)
FROM projects p
WHERE p.orcamento_previsto IS NULL
  AND p.status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')

UNION ALL

-- Fornecedor sem categoria (3+ lançamentos)
SELECT
  'fornecedor_sem_categoria',
  'baixa',
  NULL,
  s.trade_name,
  'Fornecedor ' || s.trade_name || ' sem categoria padrão (' || cnt.total::text || ' lançamentos)',
  0,
  'inline',
  'atribuir_categoria',
  jsonb_build_object('supplier_id', s.id, 'trade_name', s.trade_name, 'total_lancamentos', cnt.total)
FROM suppliers s
JOIN (
  SELECT supplier_id, COUNT(*) AS total
  FROM project_financial_entries
  WHERE supplier_id IS NOT NULL
  GROUP BY supplier_id
  HAVING COUNT(*) >= 3
) cnt ON cnt.supplier_id = s.id
WHERE s.categoria_padrao_id IS NULL
  AND s.ativo = true;


-- 3. Projection calculation function
CREATE OR REPLACE FUNCTION calc_project_projections(p_project_id uuid)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_orcamento numeric;
  v_custo numeric;
  v_burn_rates numeric[];
  v_burn_rate numeric;
  v_restante numeric;
  v_meses_restantes numeric;
  v_data_estouro date;
  v_margem_3m numeric[];
  v_margem_atual numeric;
  v_tendencia text;
  v_status text;
  v_obra_parada boolean;
  v_ifec numeric;
  v_ifec_status text;
  rec record;
BEGIN
  -- Get project basics
  SELECT orcamento_previsto, custo_realizado, margem_atual, ifec_atual
  INTO v_orcamento, v_custo, v_margem_atual, v_ifec
  FROM projects WHERE id = p_project_id;

  -- Get monthly costs for last 3 months
  v_burn_rates := ARRAY[]::numeric[];
  FOR rec IN
    SELECT mes, SUM(custo) AS custo_mes
    FROM v_monthly_by_project
    WHERE project_id = p_project_id
      AND mes >= (date_trunc('month', CURRENT_DATE) - interval '3 months')::date
      AND mes < date_trunc('month', CURRENT_DATE)::date
    GROUP BY mes
    ORDER BY mes
  LOOP
    v_burn_rates := array_append(v_burn_rates, rec.custo_mes);
  END LOOP;

  -- Calculate average burn rate
  IF array_length(v_burn_rates, 1) > 0 THEN
    v_burn_rate := 0;
    FOR i IN 1..array_length(v_burn_rates, 1) LOOP
      v_burn_rate := v_burn_rate + v_burn_rates[i];
    END LOOP;
    v_burn_rate := v_burn_rate / array_length(v_burn_rates, 1);
  ELSE
    v_burn_rate := 0;
  END IF;

  -- Budget remaining
  v_restante := COALESCE(v_orcamento, 0) - COALESCE(v_custo, 0);

  -- Months remaining
  IF v_burn_rate > 0 AND v_restante > 0 THEN
    v_meses_restantes := v_restante / v_burn_rate;
    v_data_estouro := CURRENT_DATE + (v_meses_restantes * 30)::int;
  ELSIF v_restante <= 0 AND v_orcamento > 0 THEN
    v_meses_restantes := 0;
    v_data_estouro := CURRENT_DATE;
  ELSE
    v_meses_restantes := NULL;
    v_data_estouro := NULL;
  END IF;

  -- Margin trend (last 3 months from margin_snapshots)
  v_margem_3m := ARRAY[]::numeric[];
  FOR rec IN
    SELECT margem FROM margin_snapshots
    WHERE project_id = p_project_id
    ORDER BY mes DESC LIMIT 3
  LOOP
    v_margem_3m := array_append(v_margem_3m, rec.margem);
  END LOOP;

  -- Determine trend
  IF array_length(v_margem_3m, 1) >= 3 AND v_margem_3m[1] < v_margem_3m[2] AND v_margem_3m[2] < v_margem_3m[3] THEN
    v_tendencia := 'queda';
  ELSIF array_length(v_margem_3m, 1) >= 3 AND v_margem_3m[1] > v_margem_3m[2] AND v_margem_3m[2] > v_margem_3m[3] THEN
    v_tendencia := 'alta';
  ELSE
    v_tendencia := 'estavel';
  END IF;

  -- Check if obra parada
  SELECT NOT EXISTS (
    SELECT 1 FROM project_financial_entries
    WHERE project_id = p_project_id AND created_at > now() - interval '30 days'
  ) INTO v_obra_parada;

  -- IFEC status
  IF v_ifec IS NULL THEN v_ifec_status := 'sem_dados';
  ELSIF v_ifec >= 1.0 THEN v_ifec_status := 'eficiente';
  ELSIF v_ifec >= 0.8 THEN v_ifec_status := 'atencao';
  ELSE v_ifec_status := 'critico';
  END IF;

  -- Overall status
  IF v_obra_parada THEN v_status := 'parada';
  ELSIF v_meses_restantes IS NOT NULL AND v_meses_restantes < 1 THEN v_status := 'critico';
  ELSIF v_meses_restantes IS NOT NULL AND v_meses_restantes < 3 THEN v_status := 'alerta';
  ELSIF v_tendencia = 'queda' THEN v_status := 'alerta';
  ELSIF v_ifec_status = 'critico' THEN v_status := 'alerta';
  ELSE v_status := 'saudavel';
  END IF;

  RETURN jsonb_build_object(
    'burn_rate_mensal', ROUND(COALESCE(v_burn_rate, 0), 2),
    'orcamento_restante', ROUND(COALESCE(v_restante, 0), 2),
    'meses_restantes', CASE WHEN v_meses_restantes IS NOT NULL THEN ROUND(v_meses_restantes, 2) ELSE NULL END,
    'data_estouro_prevista', v_data_estouro,
    'tendencia_margem', v_tendencia,
    'margem_3m', to_jsonb(v_margem_3m),
    'status', v_status,
    'obra_parada', v_obra_parada,
    'ifec_status', v_ifec_status,
    'updated_at', now()
  );
END;
$$;

-- 4. Batch projection calculation
CREATE OR REPLACE FUNCTION calc_all_projections()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT id FROM projects
    WHERE status IN ('Pendente', 'Em Andamento', 'pendente', 'em andamento', 'em_andamento', 'iniciado')
  LOOP
    UPDATE projects SET projecao_json = calc_project_projections(rec.id) WHERE id = rec.id;
  END LOOP;
END;
$$;

-- 5. Schedule daily cron (06:05, after anomaly detection at 06:00)
SELECT cron.schedule('calc-projections-daily', '5 6 * * *', $$SELECT calc_all_projections()$$);

-- 6. Run once now to populate
SELECT calc_all_projections();
```

- [ ] **Step 2: Apply the migration**

```bash
cd /tmp/arscorrea
SQL=$(cat supabase/migrations/20260331000200_insights_panel.sql)
curl -s -X POST "https://api.supabase.com/v1/projects/qajzskxuvxsbvuyuvlnd/database/query" \
  -H "Authorization: Bearer sbp_5d5999f0030b52ce5a1e852e15d15d07674d494f" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query: $q}')"
```

If the SQL is too large for one request, split into: (a) ALTER TABLE + view, (b) functions, (c) cron + initial run.

- [ ] **Step 3: Verify**

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/qajzskxuvxsbvuyuvlnd/database/query" \
  -H "Authorization: Bearer sbp_5d5999f0030b52ce5a1e852e15d15d07674d494f" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT risk_type, severidade, descricao FROM v_insights_risks LIMIT 5"}'
```

Expected: rows with risk data (or empty if no active risks)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260331000200_insights_panel.sql
git commit -m "feat: insights panel SQL — risks view, projection functions, daily cron"
```

---

### Task 2: useRealtimeInsights Hook

**Files:**
- Create: `src/hooks/useRealtimeInsights.ts`

- [ ] **Step 1: Create the realtime hook**

```typescript
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeInsights() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("insights-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "nfe_inbox" }, () => {
        queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
        queryClient.invalidateQueries({ queryKey: ["insights-resolved"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_financial_entries" }, () => {
        queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
        queryClient.invalidateQueries({ queryKey: ["insights-resolved"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cost_allocations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "medicoes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_payments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useRealtimeInsights.ts
git commit -m "feat: useRealtimeInsights hook — Supabase Realtime subscriptions for 5 tables"
```

---

### Task 3: RiscosOperacionais Component

**Files:**
- Create: `src/components/financeiro/RiscosOperacionais.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowRight, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/formatters";

interface Risk {
  risk_type: string;
  severidade: string;
  project_id: string | null;
  project_name: string;
  descricao: string;
  age_hours: number;
  action_type: string;
  action_target: string;
  metadata: any;
}

const SEVERITY_ORDER: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const SEVERITY_COLORS: Record<string, string> = {
  critica: "bg-red-100 text-red-800 border-red-200",
  alta: "bg-amber-100 text-amber-800 border-amber-200",
  media: "bg-yellow-100 text-yellow-800 border-yellow-200",
  baixa: "bg-slate-100 text-slate-600 border-slate-200",
};
const SEVERITY_DOT: Record<string, string> = {
  critica: "bg-red-500",
  alta: "bg-amber-500",
  media: "bg-yellow-500",
  baixa: "bg-slate-400",
};

function formatAge(hours: number): string {
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function RiscosOperacionais() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["insights-risks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_insights_risks" as any)
        .select("*");
      if (error) throw error;
      return (data as unknown as Risk[]).sort((a, b) => {
        const sA = SEVERITY_ORDER[a.severidade] ?? 9;
        const sB = SEVERITY_ORDER[b.severidade] ?? 9;
        if (sA !== sB) return sA - sB;
        return b.age_hours - a.age_hours;
      });
    },
  });

  const criticos = risks.filter((r) => r.severidade === "critica").length;

  // Inline action: set budget
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState("");

  async function handleSetBudget(projectId: string) {
    const val = parseFloat(budgetValue);
    if (!val || val <= 0) { toast.error("Informe um valor válido"); return; }
    const { error } = await supabase.from("projects").update({ orcamento_previsto: val }).eq("id", projectId);
    if (error) { toast.error("Erro: " + error.message); return; }
    await supabase.rpc("calc_project_balance", { p_project_id: projectId });
    toast.success("Orçamento definido!");
    setEditingBudget(null);
    setBudgetValue("");
    queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
  }

  // Inline action: assign category
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryValue, setCategoryValue] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["financial-categories-active"],
    queryFn: async () => {
      const { data } = await supabase.from("financial_categories" as any).select("id, nome, prefixo").eq("ativo", true).order("prefixo").order("nome");
      return data ?? [];
    },
    enabled: !!editingCategory,
  });

  async function handleSetCategory(supplierId: string) {
    if (!categoryValue) { toast.error("Selecione uma categoria"); return; }
    const { error } = await supabase.from("suppliers").update({ categoria_padrao_id: categoryValue } as any).eq("id", supplierId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Categoria atribuída!");
    setEditingCategory(null);
    setCategoryValue("");
    queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
  }

  // Inline action: mark payment received
  async function handleMarkPaid(paymentId: string) {
    const { error } = await supabase.from("contract_payments" as any).update({ status: "pago" }).eq("id", paymentId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Parcela marcada como recebida!");
    queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground text-center py-8">Carregando riscos...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h3 className="font-semibold text-base">Riscos Operacionais</h3>
        </div>
        <div className="flex items-center gap-2">
          {criticos > 0 && (
            <Badge variant="destructive" className="text-xs">{criticos} crítico{criticos > 1 ? "s" : ""}</Badge>
          )}
          <Badge variant="outline" className="text-xs">{risks.length} ativo{risks.length !== 1 ? "s" : ""}</Badge>
        </div>
      </div>

      {risks.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum risco ativo. Tudo em dia!
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {risks.map((risk, i) => (
            <Card key={i} className="border-l-4" style={{ borderLeftColor: risk.severidade === "critica" ? "#ef4444" : risk.severidade === "alta" ? "#f59e0b" : risk.severidade === "media" ? "#eab308" : "#94a3b8" }}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_COLORS[risk.severidade] || ""}`}>
                        {risk.severidade}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatAge(risk.age_hours)}
                      </span>
                    </div>
                    <p className="text-sm">{risk.descricao}</p>

                    {/* Inline: definir orçamento */}
                    {risk.action_target === "definir_orcamento" && editingBudget === risk.metadata?.project_id && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number" step="0.01" placeholder="R$ 0,00"
                          value={budgetValue} onChange={(e) => setBudgetValue(e.target.value)}
                          className="h-8 w-40 text-sm"
                        />
                        <Button size="sm" className="h-8" onClick={() => handleSetBudget(risk.metadata.project_id)}>
                          <Check className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                      </div>
                    )}

                    {/* Inline: atribuir categoria */}
                    {risk.action_target === "atribuir_categoria" && editingCategory === risk.metadata?.supplier_id && (
                      <div className="flex items-center gap-2 mt-2">
                        <Select value={categoryValue} onValueChange={setCategoryValue}>
                          <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Categoria..." /></SelectTrigger>
                          <SelectContent>
                            {categories.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{c.prefixo} {c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8" onClick={() => handleSetCategory(risk.metadata.supplier_id)}>
                          <Check className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="flex-shrink-0">
                    {risk.action_type === "navigate" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(risk.action_target)}>
                        Resolver <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                    {risk.action_target === "definir_orcamento" && editingBudget !== risk.metadata?.project_id && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditingBudget(risk.metadata.project_id)}>
                        Definir
                      </Button>
                    )}
                    {risk.action_target === "atribuir_categoria" && editingCategory !== risk.metadata?.supplier_id && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditingCategory(risk.metadata.supplier_id)}>
                        Atribuir
                      </Button>
                    )}
                    {risk.action_target === "marcar_recebido" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleMarkPaid(risk.metadata.payment_id)}>
                        <Check className="h-3 w-3 mr-1" /> Recebido
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/financeiro/RiscosOperacionais.tsx
git commit -m "feat: RiscosOperacionais component — risk cards with inline actions"
```

---

### Task 4: ProjecoesFinanceiras Component

**Files:**
- Create: `src/components/financeiro/ProjecoesFinanceiras.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, ArrowRight, Bot, AlertTriangle, Pause } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { AI_ANALYZE_EVENT } from "@/components/ai/AnalyzeButton";

interface ProjectProjection {
  id: string;
  name: string;
  status: string;
  projecao_json: {
    burn_rate_mensal: number;
    orcamento_restante: number;
    meses_restantes: number | null;
    data_estouro_prevista: string | null;
    tendencia_margem: string;
    margem_3m: number[];
    status: string;
    obra_parada: boolean;
    ifec_status: string;
    updated_at: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  critico: { color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle, label: "Crítico" },
  alerta: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: TrendingDown, label: "Alerta" },
  saudavel: { color: "bg-green-100 text-green-800 border-green-200", icon: TrendingUp, label: "Saudável" },
  parada: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: Pause, label: "Parada" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function analyzeWithAI(projectName: string) {
  window.dispatchEvent(new CustomEvent(AI_ANALYZE_EVENT, {
    detail: { prompt: `Analise a saúde financeira da obra "${projectName}": burn rate, tendência de margem, projeção de orçamento, e recomendações.` },
  }));
}

export function ProjecoesFinanceiras() {
  const navigate = useNavigate();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["insights-projections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, projecao_json")
        .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
        .not("projecao_json", "is", null)
        .order("name");
      if (error) throw error;
      return data as unknown as ProjectProjection[];
    },
  });

  // Sort: critico → alerta → parada → saudavel
  const sorted = [...projects].sort((a, b) => {
    const order: Record<string, number> = { critico: 0, alerta: 1, parada: 2, saudavel: 3 };
    const sA = order[(a.projecao_json as any)?.status] ?? 9;
    const sB = order[(b.projecao_json as any)?.status] ?? 9;
    return sA - sB;
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground text-center py-8">Calculando projeções...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-base">Projeções Financeiras</h3>
        <Badge variant="outline" className="text-xs">{sorted.length} obras</Badge>
      </div>

      {sorted.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma projeção disponível. As projeções são calculadas diariamente às 06h.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {sorted.map((p) => {
            const proj = p.projecao_json;
            if (!proj) return null;
            const config = STATUS_CONFIG[proj.status] || STATUS_CONFIG.saudavel;
            const Icon = config.icon;

            let headline = "";
            if (proj.status === "critico" && proj.data_estouro_prevista) {
              const days = Math.max(0, Math.round((new Date(proj.data_estouro_prevista).getTime() - Date.now()) / 86400000));
              headline = days === 0 ? "Orçamento esgotado" : `Estoura em ${days} dias`;
            } else if (proj.status === "alerta" && proj.tendencia_margem === "queda") {
              headline = "Margem em queda consecutiva";
            } else if (proj.status === "alerta" && proj.ifec_status === "critico") {
              headline = "Atraso físico significativo (IFEC)";
            } else if (proj.status === "alerta" && proj.meses_restantes != null) {
              headline = `~${proj.meses_restantes.toFixed(1)} meses de orçamento`;
            } else if (proj.obra_parada) {
              headline = "Sem movimentação há 30+ dias";
            } else {
              headline = "Dentro do planejado";
            }

            return (
              <Card key={p.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: proj.status === "critico" ? "#ef4444" : proj.status === "alerta" ? "#f59e0b" : proj.status === "parada" ? "#94a3b8" : "#22c55e" }} />
                        <span className="text-sm font-medium truncate">{p.name}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${config.color}`}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{headline}</p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        {proj.burn_rate_mensal > 0 && (
                          <span>Burn: {formatBRL(proj.burn_rate_mensal)}/mês</span>
                        )}
                        {proj.orcamento_restante !== 0 && (
                          <span>Restam: {formatBRL(proj.orcamento_restante)}</span>
                        )}
                        {proj.tendencia_margem !== "estavel" && (
                          <span className="flex items-center gap-0.5">
                            Margem: {proj.tendencia_margem === "queda" ? <TrendingDown className="h-3 w-3 text-red-500" /> : <TrendingUp className="h-3 w-3 text-green-500" />}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => analyzeWithAI(p.name)} title="Analisar com IA">
                        <Bot className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(`/obras/${p.id}/financeiro`)}>
                        Ver <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/financeiro/ProjecoesFinanceiras.tsx
git commit -m "feat: ProjecoesFinanceiras component — burn rate, projection cards, AI analysis"
```

---

### Task 5: ResolvidosRecentemente Component

**Files:**
- Create: `src/components/financeiro/ResolvidosRecentemente.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronDown } from "lucide-react";

interface AuditEntry {
  id: string;
  table_name: string;
  operation: string;
  new_data: any;
  old_data: any;
  created_at: string;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "agora";
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function describeAction(entry: AuditEntry): string | null {
  const { table_name, operation, new_data, old_data } = entry;

  if (table_name === "nfe_inbox" && operation === "UPDATE" && new_data?.status === "aprovada") {
    return `NF-e ${new_data.numero_nota || ""} aprovada · ${new_data.razao_social || ""}`;
  }

  if (table_name === "project_financial_entries" && operation === "UPDATE" && new_data?.situacao === "conciliado" && old_data?.situacao === "pendente") {
    return `Lançamento conciliado · R$ ${Math.abs(new_data.valor || 0).toLocaleString("pt-BR")}`;
  }

  if (table_name === "cost_allocations" && operation === "INSERT") {
    return `Rateio executado · R$ ${Math.abs(new_data.valor_alocado || 0).toLocaleString("pt-BR")}`;
  }

  if (table_name === "projects" && operation === "UPDATE" && new_data?.orcamento_previsto && !old_data?.orcamento_previsto) {
    return `Orçamento definido · ${new_data.name || ""} R$ ${Number(new_data.orcamento_previsto).toLocaleString("pt-BR")}`;
  }

  if (table_name === "medicoes" && operation === "INSERT") {
    return `Medição #${new_data.numero || "?"} criada · ${new_data.percentual_fisico || "?"}%`;
  }

  return null; // Skip non-interesting entries
}

export function ResolvidosRecentemente() {
  const [expanded, setExpanded] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["insights-resolved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log" as any)
        .select("id, table_name, operation, new_data, old_data, created_at")
        .in("table_name", ["nfe_inbox", "project_financial_entries", "cost_allocations", "projects", "medicoes"])
        .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as AuditEntry[])
        .map((e) => ({ ...e, description: describeAction(e) }))
        .filter((e) => e.description !== null);
    },
  });

  const visible = expanded ? entries : entries.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <h3 className="font-semibold text-base">Resolvidos Hoje</h3>
        <Badge variant="outline" className="text-xs">{entries.length}</Badge>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-4">Carregando...</div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma ação registrada nas últimas 24h.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="py-2 px-0">
            {visible.map((entry: any, i: number) => (
              <div key={entry.id} className={`flex items-center gap-3 px-4 py-2 ${i > 0 ? "border-t" : ""}`}>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                <span className="text-sm flex-1">{entry.description}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatRelativeTime(entry.created_at)}</span>
              </div>
            ))}
            {entries.length > 5 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-center text-xs text-muted-foreground py-2 hover:text-foreground transition-colors flex items-center justify-center gap-1 border-t"
              >
                {expanded ? "Mostrar menos" : `Ver mais ${entries.length - 5} itens`}
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/financeiro/ResolvidosRecentemente.tsx
git commit -m "feat: ResolvidosRecentemente component — last 24h audit trail feed"
```

---

### Task 6: Insights Page + Route + Tab

**Files:**
- Create: `src/pages/financeiro/Insights.tsx`
- Modify: `src/pages/financeiro/Financeiro.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the Insights page**

```typescript
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
import { RiscosOperacionais } from "@/components/financeiro/RiscosOperacionais";
import { ProjecoesFinanceiras } from "@/components/financeiro/ProjecoesFinanceiras";
import { ResolvidosRecentemente } from "@/components/financeiro/ResolvidosRecentemente";
import { useRealtimeInsights } from "@/hooks/useRealtimeInsights";

export default function Insights() {
  useRealtimeInsights();

  return (
    <Layout>
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Financeiro</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Insights operacionais e projeções financeiras em tempo real
          </p>
        </div>

        <FinanceiroTabs />

        <div className="space-y-8">
          <RiscosOperacionais />
          <ProjecoesFinanceiras />
          <ResolvidosRecentemente />
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Add Insights tab to FinanceiroTabs**

In `src/pages/financeiro/Financeiro.tsx`, add to imports:

```typescript
import { Lightbulb } from "lucide-react";
```

Update the `primaryTabs` array to add Insights after Indicadores:

```typescript
const primaryTabs = [
  { label: "Visão Geral", path: "/financeiro/visao-geral", icon: LayoutDashboard },
  { label: "Lançamentos", path: "/financeiro/lancamentos", icon: Receipt },
  { label: "Recebíveis", path: "/financeiro/recebiveis", icon: HandCoins },
  { label: "NF-e", path: "/financeiro/nfe", icon: FileCheck },
  { label: "Indicadores", path: "/financeiro/indicadores", icon: BarChart3 },
  { label: "Insights", path: "/financeiro/insights", icon: Lightbulb },
];
```

- [ ] **Step 3: Add route in App.tsx**

Add the import at the top of App.tsx with the other lazy imports:

```typescript
import Insights from "./pages/financeiro/Insights";
```

Add the route after the indicadores route (line 108):

```typescript
<Route path="/financeiro/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/financeiro/Insights.tsx src/pages/financeiro/Financeiro.tsx src/App.tsx
git commit -m "feat: Insights page — route, tab, and page composition with realtime"
```

---

### Task 7: Push and Deploy

**Files:** None (git + Supabase deploy)

- [ ] **Step 1: Push all changes**

```bash
cd /tmp/arscorrea && git push origin main
```

- [ ] **Step 2: Deploy edge function (if AI changes from Plan 1 are included)**

```bash
SUPABASE_ACCESS_TOKEN=sbp_5d5999f0030b52ce5a1e852e15d15d07674d494f supabase functions deploy ai-chat --no-verify-jwt --project-ref qajzskxuvxsbvuyuvlnd
```

- [ ] **Step 3: Test in browser**

Navigate to `https://arscorrea.app.br/financeiro/insights`. Expected:
- Riscos Operacionais section showing active risks (or "Tudo em dia!")
- Projeções section showing project health cards
- Resolvidos section showing recent actions

Verify realtime: open a second tab, approve an NF-e, and see the Insights page update automatically.
