import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { formatBRL, formatPercent } from "@/lib/formatters";

// ─── Queries ─────────────────────────────────────────────────────────────────

async function fetchProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, status, orcamento_previsto, custo_realizado, receita_realizada, saldo_atual, margem_atual, iec_atual"
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

export default function Indicadores() {
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

  // ── KPI derivations ─────────────────────────────────────────────────────────

  // Weighted avg IEC: sum(custo_realizado * iec) / sum(custo_realizado)
  const totalCusto = projects.reduce(
    (acc, p) => acc + (p.custo_realizado ?? 0),
    0
  );
  const weightedIec =
    totalCusto > 0
      ? projects.reduce(
          (acc, p) =>
            acc + (p.iec_atual ?? 0) * (p.custo_realizado ?? 0),
          0
        ) / totalCusto
      : 0;

  const obrasIecAlto = projects.filter((p) => (p.iec_atual ?? 0) > 1);

  const avgMargem =
    projects.length > 0
      ? projects.reduce((acc, p) => acc + (p.margem_atual ?? 0), 0) /
        projects.length
      : 0;

  const totalOrcamento = projects.reduce(
    (acc, p) => acc + (p.orcamento_previsto ?? 0),
    0
  );

  // ── Chart data derivations ──────────────────────────────────────────────────

  // Chart 1 & 2: IEC and margem per project (sorted by IEC desc)
  const iecChartData = [...projects]
    .sort((a, b) => (b.iec_atual ?? 0) - (a.iec_atual ?? 0))
    .map((p) => ({
      name: abbrev(p.name),
      iec: parseFloat(((p.iec_atual ?? 0) as number).toFixed(3)),
      margem: parseFloat(((p.margem_atual ?? 0) as number).toFixed(2)),
    }));

  // Chart 3: Orcamento vs Realizado per project
  const budgetChartData = projects.map((p) => ({
    name: abbrev(p.name),
    orcamento: p.orcamento_previsto ?? 0,
    realizado: p.custo_realizado ?? 0,
  }));

  // Chart 4: Monthly aggregated cost
  const monthlyAggMap: Record<string, number> = {};
  for (const row of monthlyData) {
    const mes = row.mes ?? "";
    monthlyAggMap[mes] = (monthlyAggMap[mes] ?? 0) + (row.total_custo ?? 0);
  }
  const monthlyChartData = Object.entries(monthlyAggMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, total]) => ({
      mes: mes.slice(0, 7), // yyyy-mm
      total,
    }));

  // Chart 5: Top categories by cost
  const topCategories = [...categorySummary]
    .sort((a, b) => (b.total_realizado ?? 0) - (a.total_realizado ?? 0))
    .slice(0, 12)
    .map((c) => ({
      name: abbrev(c.categoria_nome ?? c.nome ?? "—", 24),
      total: c.total_realizado ?? 0,
      cor: c.cor_hex ?? COLOR_BLUE,
    }));

  // Chart 6: Budget vs actual per category from v_budget_vs_actual
  // Aggregate across projects
  const catBudgetMap: Record<
    string,
    { nome: string; orcamento: number; realizado: number }
  > = {};
  for (const row of budgetVsActual) {
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
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* IEC Médio Global */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-blue-50">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      IEC Médio Global
                    </span>
                  </div>
                  <p
                    className={`text-xl font-bold ${
                      weightedIec > 1 ? "text-rose-600" : "text-foreground"
                    }`}
                  >
                    {weightedIec.toFixed(3)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Média ponderada por custo
                  </p>
                </CardContent>
              </Card>

              {/* Obras com IEC > 1 */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-rose-50">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      Obras com IEC &gt; 1
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {obrasIecAlto.length}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {projects.length}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {obrasIecAlto.length > 0
                      ? obrasIecAlto.map((p) => abbrev(p.name, 14)).join(", ")
                      : "Nenhuma obra em alerta"}
                  </p>
                </CardContent>
              </Card>

              {/* Margem Média */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-emerald-50">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      Margem Média
                    </span>
                  </div>
                  <p
                    className={`text-xl font-bold ${
                      avgMargem < 0 ? "text-rose-600" : "text-foreground"
                    }`}
                  >
                    {formatPercent(avgMargem)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Média simples entre obras
                  </p>
                </CardContent>
              </Card>

              {/* Orçamento vs Realizado */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-amber-50">
                      <Wallet className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      Orçamento Total
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {formatBRL(totalOrcamento)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Realizado: {formatBRL(totalCusto)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Chart 1: IEC por Obra */}
              <ChartCard
                icon={BarChart3}
                iconColor="blue"
                title="IEC por Obra"
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
                title="Margem por Obra (%)"
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
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
