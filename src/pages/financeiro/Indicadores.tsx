import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  Cell,
  Legend,
} from "recharts";
import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Building,
  Activity,
  CalendarClock,
} from "lucide-react";
import { formatBRL, formatPercent } from "@/lib/formatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AnalyzeButton } from "@/components/ai/AnalyzeButton";

// ─── Queries ─────────────────────────────────────────────────────────────────

async function fetchIfecOverview() {
  const { data, error } = await supabase
    .from("v_ifec_overview" as any)
    .select("*");
  if (error) {
    // View may not exist yet — fallback gracefully
    console.warn("v_ifec_overview not available:", error.message);
    return [];
  }
  return (data ?? []) as any[];
}

async function fetchProgressTimeline(projectId?: string) {
  const query = supabase
    .from("v_progress_timeline" as any)
    .select("*")
    .order("mes", { ascending: true });
  if (projectId) query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as any[];
}

async function fetchProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, status, orcamento_previsto, custo_realizado, receita_realizada, saldo_atual, margem_atual, iec_atual, ifec_atual, avanco_real, avanco_previsto"
    )
    .in("status", [
      "Pendente",
      "Em Andamento",
      "pendente",
      "em andamento",
      "em_andamento",
      "iniciado",
    ])
    .order("name");
  if (error) throw error;
  return data ?? [];
}

async function fetchBudgetVsActual() {
  const { data, error } = await supabase
    .from("v_budget_vs_actual" as any)
    .select("*");
  if (error) throw error;
  return (data ?? []) as any[];
}

async function fetchMonthlyByProject() {
  const { data, error } = await supabase
    .from("v_monthly_by_project" as any)
    .select("*")
    .order("mes", { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
}

async function fetchCategorySummary() {
  const { data, error } = await supabase
    .from("v_category_summary" as any)
    .select("*")
    .eq("e_receita", false);
  if (error) throw error;
  return (data ?? []) as any[];
}

// ─── Chart colors ─────────────────────────────────────────────────────────────

const COLOR_BLUE = "#93c5fd";
const COLOR_ROSE = "#fda4af";
const COLOR_GREEN = "#86efac";
const COLOR_REF = "#94a3b8";

// ─── Tooltip formatters ───────────────────────────────────────────────────────

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatBRL(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

function IecTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p style={{ color: val > 1 ? COLOR_ROSE : COLOR_BLUE }}>
        IEC: {val.toFixed(3)}
      </p>
    </div>
  );
}

function IfecTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? (p.dataKey.includes("percentual") ? `${p.value}%` : p.value.toFixed(3)) : p.value ?? "—"}
        </p>
      ))}
    </div>
  );
}

function MargemTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p style={{ color: val >= 0 ? COLOR_GREEN : COLOR_ROSE }}>
        Margem: {formatPercent(val)}
      </p>
    </div>
  );
}

// ─── ChartCard wrapper ────────────────────────────────────────────────────────

function ChartCard({
  icon: Icon,
  iconColor,
  title,
  children,
  fullWidth = false,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <Card
      className={`shadow-sm border-slate-100${fullWidth ? " col-span-2" : ""}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-1.5 rounded-md bg-${iconColor}-50`}>
            <Icon className={`h-4 w-4 text-${iconColor}-600`} />
          </div>
          <h3 className="font-semibold text-base text-slate-800">{title}</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Abbreviated name helper ──────────────────────────────────────────────────

function abbrev(name: string, maxLen = 22): string {
  if (!name) return "";
  return name.length > maxLen ? name.slice(0, maxLen - 1) + "…" : name;
}

// ─── Main component ───────────────────────────────────────────────────────────

const COLOR_VIOLET = "#a78bfa";
const COLOR_TEAL = "#5eead4";

export default function Indicadores() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects-indicators"],
    queryFn: fetchProjects,
  });

  const { data: budgetVsActual = [] } = useQuery({
    queryKey: ["v-budget-vs-actual"],
    queryFn: fetchBudgetVsActual,
  });

  const { data: monthlyData = [] } = useQuery({
    queryKey: ["v-monthly-by-project"],
    queryFn: fetchMonthlyByProject,
  });

  const { data: categorySummary = [] } = useQuery({
    queryKey: ["v-category-summary-costs"],
    queryFn: fetchCategorySummary,
  });

  const { data: ifecOverview = [] } = useQuery({
    queryKey: ["v-ifec-overview"],
    queryFn: fetchIfecOverview,
  });

  const { data: progressTimeline = [] } = useQuery({
    queryKey: ["v-progress-timeline", selectedProjectId !== "all" ? selectedProjectId : undefined],
    queryFn: () => fetchProgressTimeline(selectedProjectId !== "all" ? selectedProjectId : undefined),
  });

  // Filter data when a specific project is selected
  const isFiltered = selectedProjectId !== "all";
  const filteredProjects = isFiltered ? projects.filter((p: any) => p.id === selectedProjectId) : projects;
  const filteredBudgetVsActual = isFiltered ? budgetVsActual.filter((b: any) => b.project_id === selectedProjectId) : budgetVsActual;
  const filteredMonthly = isFiltered ? monthlyData.filter((m: any) => m.project_id === selectedProjectId) : monthlyData;
  // Category summary is global — for filtered view, we need to compute from budget/monthly

  // ── KPI derivations ─────────────────────────────────────────────────────────

  // Weighted avg IEC: sum(custo_realizado * iec) / sum(custo_realizado)
  const totalCusto = filteredProjects.reduce(
    (acc, p) => acc + (p.custo_realizado ?? 0),
    0
  );
  const weightedIec =
    totalCusto > 0
      ? filteredProjects.reduce(
          (acc, p) =>
            acc + (p.iec_atual ?? 0) * (p.custo_realizado ?? 0),
          0
        ) / totalCusto
      : 0;

  const obrasIecAlto = filteredProjects.filter((p) => (p.iec_atual ?? 0) > 1);

  const avgMargem =
    filteredProjects.length > 0
      ? filteredProjects.reduce((acc, p) => acc + (p.margem_atual ?? 0), 0) /
        filteredProjects.length
      : 0;

  const totalOrcamento = filteredProjects.reduce(
    (acc, p) => acc + (p.orcamento_previsto ?? 0),
    0
  );

  // IFEC KPIs
  const projectsWithIfec = filteredProjects.filter((p: any) => p.ifec_atual != null);
  const avgIfec = projectsWithIfec.length > 0
    ? projectsWithIfec.reduce((acc: number, p: any) => acc + (p.ifec_atual ?? 0), 0) / projectsWithIfec.length
    : 0;
  const obrasIfecBaixo = projectsWithIfec.filter((p: any) => (p.ifec_atual ?? 0) < 0.8);
  const obrasComBaseline = filteredProjects.filter((p: any) => p.avanco_previsto != null).length;

  // IFEC chart data
  const ifecChartData = [...filteredProjects]
    .filter((p: any) => p.ifec_atual != null || p.iec_atual != null)
    .sort((a: any, b: any) => (b.ifec_atual ?? 0) - (a.ifec_atual ?? 0))
    .map((p: any) => ({
      name: abbrev(p.name),
      ifec: parseFloat(((p.ifec_atual ?? 0) as number).toFixed(3)),
      iec: parseFloat(((p.iec_atual ?? 0) as number).toFixed(3)),
      avanco_real: p.avanco_real ?? 0,
      avanco_previsto: p.avanco_previsto ?? 0,
    }));

  // Progress timeline chart data (previsto vs real over time)
  const timelineChartData = progressTimeline.map((row: any) => ({
    mes: (row.mes ?? "").slice(0, 7),
    previsto: row.percentual_previsto ?? 0,
    real: row.percentual_real ?? null,
  }));

  // ── Chart data derivations ──────────────────────────────────────────────────

  // Chart 1 & 2: IEC and margem per project (sorted by IEC desc)
  const iecChartData = [...filteredProjects]
    .sort((a, b) => (b.iec_atual ?? 0) - (a.iec_atual ?? 0))
    .map((p) => ({
      name: abbrev(p.name),
      iec: parseFloat(((p.iec_atual ?? 0) as number).toFixed(3)),
      margem: parseFloat(((p.margem_atual ?? 0) as number).toFixed(2)),
    }));

  // Chart 3: Orcamento vs Realizado per project
  const budgetChartData = filteredProjects.map((p) => ({
    name: abbrev(p.name),
    orcamento: p.orcamento_previsto ?? 0,
    realizado: p.custo_realizado ?? 0,
  }));

  // Chart 4: Monthly aggregated cost
  const monthlyAggMap: Record<string, number> = {};
  for (const row of filteredMonthly) {
    const mes = row.mes ?? "";
    monthlyAggMap[mes] = (monthlyAggMap[mes] ?? 0) + (row.custo ?? 0);
  }
  const monthlyChartData = Object.entries(monthlyAggMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, total]) => ({
      mes: mes.slice(0, 7), // yyyy-mm
      total,
    }));

  // Chart 5: Top categories by cost
  // When filtered, compute from filteredBudgetVsActual; otherwise use categorySummary
  const topCategories = isFiltered
    ? (() => {
        const catMap: Record<string, { name: string; total: number; cor: string }> = {};
        for (const row of filteredBudgetVsActual) {
          const key = row.categoria_id ?? row.categoria_nome ?? row.nome ?? "?";
          if (!catMap[key]) {
            catMap[key] = {
              name: abbrev(row.categoria_nome ?? row.nome ?? "—", 24),
              total: 0,
              cor: row.cor_hex ?? COLOR_BLUE,
            };
          }
          catMap[key].total += row.realizado ?? 0;
        }
        return Object.values(catMap)
          .filter((c) => c.total > 0)
          .sort((a, b) => b.total - a.total)
          .slice(0, 12);
      })()
    : [...categorySummary]
        .sort((a, b) => (b.total_custo ?? 0) - (a.total_custo ?? 0))
        .slice(0, 12)
        .map((c) => ({
          name: abbrev(c.nome ?? "—", 24),
          total: c.total_custo ?? 0,
          cor: c.cor_hex ?? COLOR_BLUE,
        }));

  // Chart 6: Budget vs actual per category from v_budget_vs_actual
  // Aggregate across filtered projects
  const catBudgetMap: Record<
    string,
    { nome: string; orcamento: number; realizado: number }
  > = {};
  for (const row of filteredBudgetVsActual) {
    const key = row.categoria_id ?? row.categoria_nome ?? row.nome ?? "?";
    if (!catBudgetMap[key]) {
      catBudgetMap[key] = {
        nome: abbrev(row.categoria_nome ?? row.nome ?? "—", 22),
        orcamento: 0,
        realizado: 0,
      };
    }
    catBudgetMap[key].orcamento += row.orcamento ?? 0;
    catBudgetMap[key].realizado += row.realizado ?? 0;
  }
  const catBudgetData = Object.values(catBudgetMap)
    .filter((c) => c.orcamento > 0)
    .sort((a, b) => b.orcamento - a.orcamento)
    .slice(0, 10);

  // Chart titles adjusted for filtered view
  const iecChartTitle = isFiltered && filteredProjects.length > 0
    ? `IEC — ${filteredProjects[0].name}`
    : "IEC por Obra";
  const margemChartTitle = isFiltered && filteredProjects.length > 0
    ? `Margem — ${filteredProjects[0].name}`
    : "Margem por Obra (%)";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Financeiro
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Indicadores comparativos entre obras ativas
          </p>
        </div>

        <FinanceiroTabs />

        {loadingProjects ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm animate-pulse">
            Carregando indicadores...
          </div>
        ) : (
          <>
            {/* Project selector */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Indicadores</h3>
              <div className="flex items-center gap-3">
                <AnalyzeButton prompt="Explique os indicadores financeiros: IEC, IFEC, margens, orçamento vs realizado, e identifique as obras que precisam de atenção." label="Analisar" />
                <span className="text-sm text-muted-foreground">Visualizar:</span>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Todas as obras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      📊 Visão Geral (todas as obras)
                    </SelectItem>
                    {projects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProjectId !== "all" && (
                  <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setSelectedProjectId("all")}>
                    ✕ Limpar filtro
                  </Badge>
                )}
              </div>
            </div>

            {/* Summary banner when a project is selected */}
            {isFiltered && filteredProjects.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Indicadores de: {filteredProjects[0].name}
                  </span>
                </div>
                <span className="text-xs text-blue-600">
                  Saldo: {formatBRL(Number(filteredProjects[0].saldo_atual) || 0)} · Margem: {formatPercent(Number(filteredProjects[0].margem_atual) || 0)}
                </span>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={BarChart3} iconBg="blue" label="IEC Médio Global" value={weightedIec.toFixed(3)} valueClassName={weightedIec > 1 ? "text-rose-600" : undefined} subtitle="Média ponderada por custo" />
              <KpiCard
                icon={AlertTriangle}
                iconBg="rose"
                label="Obras com IEC > 1"
                value={`${obrasIecAlto.length} / ${filteredProjects.length}`}
                subtitle={obrasIecAlto.length > 0 ? obrasIecAlto.map((p) => abbrev(p.name, 14)).join(", ") : "Nenhuma obra em alerta"}
              />
              <KpiCard icon={TrendingUp} iconBg="emerald" label="Margem Média" value={formatPercent(avgMargem)} valueClassName={avgMargem < 0 ? "text-rose-600" : undefined} subtitle="Média simples entre obras" />
              <KpiCard icon={Wallet} iconBg="amber" label="Orçamento Total" value={formatBRL(totalOrcamento)} subtitle={`Realizado: ${formatBRL(totalCusto)}`} />
            </div>

            {/* IFEC KPI Cards */}
            {(projectsWithIfec.length > 0 || obrasComBaseline > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  icon={Activity}
                  iconBg="violet"
                  label="IFEC Médio"
                  value={projectsWithIfec.length > 0 ? avgIfec.toFixed(3) : "—"}
                  valueClassName={avgIfec > 0 && avgIfec < 0.8 ? "text-rose-600" : avgIfec >= 1 ? "text-emerald-600" : undefined}
                  subtitle={projectsWithIfec.length > 0 ? "Média simples entre obras" : "Configure baselines para calcular"}
                />
                <KpiCard
                  icon={AlertTriangle}
                  iconBg="amber"
                  label="IFEC < 0.8 (Atraso)"
                  value={`${obrasIfecBaixo.length} / ${projectsWithIfec.length}`}
                  subtitle={obrasIfecBaixo.length > 0 ? obrasIfecBaixo.map((p: any) => abbrev(p.name, 14)).join(", ") : "Nenhuma obra atrasada"}
                />
                <KpiCard
                  icon={CalendarClock}
                  iconBg="blue"
                  label="Obras com Baseline"
                  value={`${obrasComBaseline} / ${filteredProjects.length}`}
                  subtitle="Cronograma previsto definido"
                />
                <KpiCard
                  icon={Activity}
                  iconBg="emerald"
                  label="Saúde das Obras"
                  value={(() => {
                    const saudaveis = filteredProjects.filter((p: any) =>
                      p.ifec_atual != null && p.iec_atual != null && p.ifec_atual >= 1.0 && p.iec_atual <= 1.0
                    ).length;
                    return `${saudaveis} / ${filteredProjects.length}`;
                  })()}
                  subtitle="IEC ≤ 1.0 e IFEC ≥ 1.0"
                />
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Chart 1: IEC por Obra */}
              <ChartCard
                icon={BarChart3}
                iconColor="blue"
                title={iecChartTitle}
              >
                <BarChart
                  data={iecChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, "auto"]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.toFixed(2)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<IecTooltip />} />
                  <ReferenceLine
                    x={1}
                    stroke={COLOR_REF}
                    strokeDasharray="4 3"
                    label={{ value: "1.0", position: "top", fontSize: 10, fill: COLOR_REF }}
                  />
                  <Bar dataKey="iec" name="IEC" radius={[0, 3, 3, 0]}>
                    {iecChartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.iec > 1 ? COLOR_ROSE : COLOR_BLUE}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>

              {/* Chart 2: Margem por Obra */}
              <ChartCard
                icon={TrendingUp}
                iconColor="emerald"
                title={margemChartTitle}
              >
                <BarChart
                  data={iecChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<MargemTooltip />} />
                  <ReferenceLine x={0} stroke={COLOR_REF} strokeDasharray="4 3" />
                  <Bar dataKey="margem" name="Margem %" radius={[0, 3, 3, 0]}>
                    {iecChartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.margem >= 0 ? COLOR_GREEN : COLOR_ROSE}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>

              {/* Chart 3: Orçamento vs Realizado por Obra */}
              <ChartCard
                icon={Wallet}
                iconColor="amber"
                title="Orçamento vs Realizado por Obra"
              >
                <BarChart
                  data={budgetChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}k`
                        : String(v)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend
                    iconType="square"
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  <Bar
                    dataKey="orcamento"
                    name="Orçamento"
                    fill={COLOR_BLUE}
                    radius={[0, 3, 3, 0]}
                  />
                  <Bar
                    dataKey="realizado"
                    name="Realizado"
                    fill={COLOR_ROSE}
                    radius={[0, 3, 3, 0]}
                  />
                </BarChart>
              </ChartCard>

              {/* Chart 4: Custo Mensal Agregado */}
              <ChartCard
                icon={TrendingUp}
                iconColor="blue"
                title="Custo Mensal Agregado"
              >
                <LineChart
                  data={monthlyChartData}
                  margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5, 7) + "/" + v.slice(2, 4)}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}k`
                        : String(v)
                    }
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Custo Total"
                    stroke={COLOR_BLUE}
                    strokeWidth={2}
                    dot={{ r: 3, fill: COLOR_BLUE }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartCard>

              {/* Chart 5: Top Categorias de Custo */}
              <ChartCard
                icon={BarChart3}
                iconColor="rose"
                title="Top Categorias de Custo"
              >
                <BarChart
                  data={topCategories}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}k`
                        : String(v)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Bar dataKey="total" name="Total" radius={[0, 3, 3, 0]}>
                    {topCategories.map((entry, idx) => (
                      <Cell key={idx} fill={entry.cor || COLOR_ROSE} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>

              {/* Chart 6: Budget vs Actual por Categoria */}
              <ChartCard
                icon={Wallet}
                iconColor="blue"
                title="Orçamento vs Realizado por Categoria"
              >
                <BarChart
                  data={catBudgetData}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}k`
                        : String(v)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={130}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend
                    iconType="square"
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  <Bar
                    dataKey="orcamento"
                    name="Orçamento"
                    fill={COLOR_BLUE}
                    radius={[0, 3, 3, 0]}
                  />
                  <Bar
                    dataKey="realizado"
                    name="Realizado"
                    fill={COLOR_ROSE}
                    radius={[0, 3, 3, 0]}
                  />
                </BarChart>
              </ChartCard>

              {/* Chart 7: IEC vs IFEC por Obra */}
              {ifecChartData.length > 0 && (
                <ChartCard
                  icon={Activity}
                  iconColor="violet"
                  title="IEC vs IFEC por Obra"
                >
                  <BarChart
                    data={ifecChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, "auto"]}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v.toFixed(2)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<IfecTooltip />} />
                    <Legend
                      iconType="square"
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    />
                    <ReferenceLine
                      x={1}
                      stroke={COLOR_REF}
                      strokeDasharray="4 3"
                      label={{ value: "1.0", position: "top", fontSize: 10, fill: COLOR_REF }}
                    />
                    <Bar dataKey="iec" name="IEC (Custo)" fill={COLOR_ROSE} radius={[0, 3, 3, 0]} />
                    <Bar dataKey="ifec" name="IFEC (Físico)" fill={COLOR_VIOLET} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ChartCard>
              )}

              {/* Chart 8: Avanço Previsto vs Real (Timeline) */}
              {timelineChartData.length > 0 && (
                <ChartCard
                  icon={CalendarClock}
                  iconColor="blue"
                  title={isFiltered && filteredProjects.length > 0
                    ? `Avanço Físico — ${filteredProjects[0].name}`
                    : "Avanço Físico Previsto vs Real"
                  }
                >
                  <LineChart
                    data={timelineChartData}
                    margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v.slice(5, 7) + "/" + v.slice(2, 4)}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<IfecTooltip />} />
                    <Legend
                      iconType="line"
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="previsto"
                      name="% Previsto"
                      stroke={COLOR_BLUE}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: COLOR_BLUE }}
                    />
                    <Line
                      type="monotone"
                      dataKey="real"
                      name="% Real"
                      stroke={COLOR_TEAL}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: COLOR_TEAL }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ChartCard>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
