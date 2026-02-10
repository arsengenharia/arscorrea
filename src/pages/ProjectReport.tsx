import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { ReportPDFButton } from "@/components/reports/ReportPDFButton";

export default function ProjectReport() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["project-report", projectId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://qajzskxuvxsbvuyuvlnd.supabase.co/functions/v1/project-management-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhanpza3h1dnhzYnZ1eXV2bG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDg1NjEsImV4cCI6MjA4NjEyNDU2MX0.ZCfY08R3-_Nhy4JYd-jZaIanNLPr1be87D8Cu4Ncfos",
          },
          body: JSON.stringify({ project_id: projectId }),
        }
      );
      if (!res.ok) throw new Error("Erro ao carregar relatório");
      return res.json();
    },
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const iecColor = (v: number) => v > 1 ? "text-red-600" : v < 1 ? "text-green-600" : "text-foreground";
  const ifecColor = (v: number) => v >= 1 ? "text-green-600" : "text-amber-600";

  if (isLoading) return <Layout><div className="container mx-auto p-6">Carregando relatório...</div></Layout>;
  if (error || !data) return <Layout><div className="container mx-auto p-6">Erro ao carregar relatório</div></Layout>;

  const { obra, cliente, analise_fisica, analise_financeira: af } = data;

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="icon" onClick={() => navigate(`/obras/${projectId}`)} className="rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Relatório Gerencial</h2>
          {data && <ReportPDFButton data={data} />}
        </div>

        {/* Project & Client Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Obra</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><strong>Nome:</strong> {obra.nome}</p>
              <p><strong>Gestor:</strong> {obra.gestor || "—"}</p>
              <p><strong>Início:</strong> {obra.data_inicio || "—"}</p>
              <p><strong>Previsão:</strong> {obra.data_conclusao_prevista || "—"}</p>
              <p><strong>Prazo:</strong> {obra.prazo_dias != null ? `${obra.prazo_dias} dias` : "—"}</p>
              <p><strong>Status:</strong> {obra.status}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><strong>Nome:</strong> {cliente.nome}</p>
              <p><strong>Código:</strong> {cliente.codigo}</p>
              <p><strong>Responsável:</strong> {cliente.responsavel || "—"}</p>
              <p><strong>Telefone:</strong> {cliente.telefone || "—"}</p>
              <p><strong>Endereço:</strong> {cliente.endereco || "—"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts + Side Panels */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left: Charts (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Line Chart - Accumulated Production */}
            {analise_fisica.producao_acumulada.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Produção Prevista x Produção Real (Acumulada)</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analise_fisica.producao_acumulada}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes_ano" fontSize={11} />
                      <YAxis domain={[0, 100]} unit="%" fontSize={11} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="previsto" name="Previsto" stroke="hsl(var(--primary))" strokeWidth={2} />
                      <Line type="monotone" dataKey="real" name="Real" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Bar Chart - Monthly Production */}
            {analise_fisica.producao_mensal.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Produção Mensal (%)</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analise_fisica.producao_mensal}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes_ano" fontSize={11} />
                      <YAxis unit="%" fontSize={11} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="real" name="Produzido no Mês" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Analysis Panels (1/3) */}
          <div className="space-y-4">
            {/* Panel 1 - Physical Analysis */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Análise Física</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">IFEC</p>
                  <p className={`text-2xl font-bold ${ifecColor(analise_fisica.ifec.valor)}`}>
                    {analise_fisica.ifec.valor.toFixed(3)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{analise_fisica.ifec.descricao}</p>
                </div>
              </CardContent>
            </Card>

            {/* Panel 2 - Financial Analysis (IEC) */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Análise Financeira</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "IEC Total", data: af.iec_total },
                  { label: "IEC Direto", data: af.iec_direto },
                  { label: "IEC Indireto", data: af.iec_indireto },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-lg font-bold ${item.data ? iecColor(item.data.valor) : ""}`}>
                      {item.data?.valor?.toFixed(3) ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{item.data?.descricao ?? ""}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Panel 3 - General Cost Analysis */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Análise do Custo Geral</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-xs text-muted-foreground">Custo Previsto</p>
                  <p>Total: {fmt(af.custo_total_previsto)}</p>
                  <p>Direto: {fmt(af.custo_direto_previsto)}</p>
                  <p>Indireto: {fmt(af.custo_indireto_previsto)}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-xs text-muted-foreground">Custo Real</p>
                  <p>Total: {fmt(af.custo_total_real)}</p>
                  <p>Direto: {fmt(af.custo_direto_real)}</p>
                  <p>Indireto: {fmt(af.custo_indireto_real)}</p>
                </div>
                <div className="pt-2 border-t">
                  <p className="font-semibold text-xs text-muted-foreground">Variação</p>
                  <p className={`font-bold ${af.variacao_custo > 0 ? "text-red-600" : "text-green-600"}`}>
                    {fmt(af.variacao_custo)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Financial Summary */}
        <Card>
          <CardHeader><CardTitle>Resultado Financeiro</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-semibold">Receitas</h4>
                <p className="text-sm">Prevista: {fmt(af.receita_total_prevista)}</p>
                <p className="text-sm">Realizada: {fmt(af.receita_total_realizada)}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Resultado</h4>
                <p className="text-sm">Saldo: {fmt(af.saldo_obra)}</p>
                <p className="text-sm font-bold">Margem: {af.margem_lucro}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
