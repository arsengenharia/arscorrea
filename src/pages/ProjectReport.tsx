import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChevronLeft,
  Building,
  User,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  ComposedChart,
} from "recharts";
import { ReportPDFButton } from "@/components/reports/ReportPDFButton";

export default function ProjectReport() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["project-report", projectId],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`https://qajzskxuvxsbvuyuvlnd.supabase.co/functions/v1/project-management-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhanpza3h1dnhzYnZ1eXV2bG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDg1NjEsImV4cCI6MjA4NjEyNDU2MX0.ZCfY08R3-_Nhy4JYd-jZaIanNLPr1be87D8Cu4Ncfos",
        },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!res.ok) throw new Error("Erro ao carregar relatório");
      return res.json();
    },
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Cores de status aprimoradas para UI moderna
  const getIndicatorColor = (v: number, type: "iec" | "ifec") => {
    if (type === "iec") {
      return v > 1
        ? "text-red-600 bg-red-50 border-red-100"
        : v < 1
          ? "text-emerald-600 bg-emerald-50 border-emerald-100"
          : "text-slate-600 bg-slate-50 border-slate-100";
    }
    // IFEC: >= 1 é bom (verde), < 1 é alerta (amber/red)
    return v >= 1 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-amber-600 bg-amber-50 border-amber-100";
  };

  if (isLoading)
    return (
      <Layout>
        <div className="container mx-auto p-6 flex items-center justify-center h-[50vh]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Activity className="h-8 w-8 animate-pulse" />
            <p>Gerando relatório gerencial...</p>
          </div>
        </div>
      </Layout>
    );

  if (error || !data)
    return (
      <Layout>
        <div className="container mx-auto p-6 text-center text-red-500">
          Erro ao carregar relatório. Tente novamente.
        </div>
      </Layout>
    );

  const { obra, cliente, analise_fisica, analise_financeira: af } = data;

  // Componente auxiliar para linhas de dados
  const DataRow = ({ label, value, subValue, highlight = false, className = "" }: any) => (
    <div className={`flex justify-between items-center py-2 border-b border-border/50 last:border-0 ${className}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <div className={`text-sm font-medium ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
        {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
      </div>
    </div>
  );

  // Tooltip customizado para gráficos
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border border-border rounded-lg shadow-xl p-3 text-xs">
          <p className="font-semibold mb-2 text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground capitalize">{entry.name}:</span>
              <span className="font-mono font-medium">
                {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}%
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-8 max-w-7xl animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/obras/${projectId}`)}
              className="rounded-full hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Relatório Gerencial</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Gerado em {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          {data && <ReportPDFButton data={data} />}
        </div>

        {/* Info Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Obra Card */}
          <Card className="shadow-sm border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Building className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Dados da Obra</span>
              </div>
              <CardTitle className="text-lg">{obra.nome}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm pt-2">
              <div>
                <span className="text-muted-foreground text-xs block mb-0.5">Gestor</span>
                <span className="font-medium">{obra.gestor || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block mb-0.5">Status</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    obra.status === "Em Andamento" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {obra.status}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block mb-0.5">Cronograma</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>
                    {obra.data_inicio || "—"} até {obra.data_conclusao_prevista || "—"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block mb-0.5">Prazo</span>
                <span className="font-medium">{obra.prazo_dias != null ? `${obra.prazo_dias} dias` : "—"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cliente Card */}
          <Card className="shadow-sm border-l-4 border-l-muted">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <User className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Cliente</span>
              </div>
              <CardTitle className="text-lg truncate">{cliente.nome}</CardTitle>
              <CardDescription className="font-mono text-xs">Cód: {cliente.codigo}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm pt-2">
              <div>
                <span className="text-muted-foreground text-xs block mb-0.5">Responsável</span>
                <span className="font-medium">{cliente.responsavel || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block mb-0.5">Contato</span>
                <span className="font-medium">{cliente.telefone || "—"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground text-xs block mb-0.5">Endereço</span>
                <span className="font-medium truncate block" title={cliente.endereco}>
                  {cliente.endereco || "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column: Visualizations (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart 1: Curva S / Accumulate Production */}
            {analise_fisica.producao_acumulada.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Evolução Física (Curva S)</span>
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                      Acumulado
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] pl-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={analise_fisica.producao_acumulada}
                      margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="mes_ano" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis domain={[0, 100]} unit="%" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" height={36} />
                      <Line
                        type="monotone"
                        dataKey="previsto"
                        name="Previsto"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="5 5"
                      />
                      <Area
                        type="monotone"
                        dataKey="real"
                        name="Realizado"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorReal)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Chart 2: Monthly Production */}
            {analise_fisica.producao_mensal.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Produção Mensal</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] pl-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analise_fisica.producao_mensal}
                      margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="mes_ano" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                      <YAxis unit="%" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                      <Bar dataKey="real" name="Produção no Mês" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: KPIs & Metrics (1/3 width) */}
          <div className="space-y-6">
            {/* IFEC Panel (Main KPI) */}
            <Card className="bg-gradient-to-br from-white to-slate-50">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Desempenho Físico (IFEC)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-baseline justify-between">
                  <div
                    className={`text-4xl font-bold tracking-tight ${getIndicatorColor(analise_fisica.ifec.valor, "ifec").split(" ")[0]}`}
                  >
                    {analise_fisica.ifec.valor.toFixed(3)}
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getIndicatorColor(analise_fisica.ifec.valor, "ifec")}`}
                  >
                    {analise_fisica.ifec.valor >= 1 ? "Eficiente" : "Atenção"}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 capitalize">{analise_fisica.ifec.descricao}</p>
              </CardContent>
            </Card>

            {/* Financial Indicators (IEC) */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Indicadores Financeiros (IEC)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {[
                  { label: "IEC Total", data: af.iec_total },
                  { label: "IEC Direto", data: af.iec_direto },
                  { label: "IEC Indireto", data: af.iec_indireto },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.data?.descricao ?? "-"}</p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-md border text-sm font-bold ${item.data ? getIndicatorColor(item.data.valor, "iec") : ""}`}
                    >
                      {item.data?.valor?.toFixed(3) ?? "—"}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cost Analysis Detail */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Detalhamento de Custos
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                {/* Previsto */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Orçado (Previsto)</p>
                  <DataRow label="Custo Direto" value={fmt(af.custo_direto_previsto)} />
                  <DataRow label="Custo Indireto" value={fmt(af.custo_indireto_previsto)} />
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed">
                    <span className="text-sm font-medium">Total Previsto</span>
                    <span className="text-sm font-bold">{fmt(af.custo_total_previsto)}</span>
                  </div>
                </div>

                {/* Realizado */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Realizado</p>
                  <DataRow label="Custo Direto" value={fmt(af.custo_direto_real)} />
                  <DataRow label="Custo Indireto" value={fmt(af.custo_indireto_real)} />
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed">
                    <span className="text-sm font-medium">Total Real</span>
                    <span className="text-sm font-bold">{fmt(af.custo_total_real)}</span>
                  </div>
                </div>

                {/* Variação */}
                <div
                  className={`rounded-lg p-3 flex items-center justify-between ${af.variacao_custo > 0 ? "bg-red-50" : "bg-emerald-50"}`}
                >
                  <span
                    className={`text-sm font-medium ${af.variacao_custo > 0 ? "text-red-700" : "text-emerald-700"}`}
                  >
                    Variação do Custo
                  </span>
                  <div className="flex items-center gap-1">
                    {af.variacao_custo > 0 ? (
                      <TrendingUp className="h-4 w-4 text-red-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-emerald-600" />
                    )}
                    <span
                      className={`text-sm font-bold ${af.variacao_custo > 0 ? "text-red-700" : "text-emerald-700"}`}
                    >
                      {fmt(af.variacao_custo)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Financial Summary Bar */}
        <Card className="bg-slate-900 text-slate-50 border-slate-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-700">
              <div className="flex flex-col gap-1 pr-4">
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Receita Realizada</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{fmt(af.receita_total_realizada)}</span>
                  <span className="text-xs text-slate-400">de {fmt(af.receita_total_prevista)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 md:px-4 pt-4 md:pt-0">
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Saldo da Obra</span>
                <span className={`text-2xl font-bold ${af.saldo_obra >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {fmt(af.saldo_obra)}
                </span>
              </div>

              <div className="flex flex-col gap-1 md:pl-4 pt-4 md:pt-0">
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Margem de Lucro</span>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${af.margem_lucro >= 0 ? "text-blue-400" : "text-amber-400"}`}>
                    {af.margem_lucro}%
                  </span>
                  <Activity className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
