import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { FinanceiroCards } from "@/components/financeiro/FinanceiroCards";
import { CostByCategoryChart } from "@/components/financeiro/CostByCategoryChart";
import { CurvaSChart } from "@/components/financeiro/CurvaSChart";
import { CostDistributionPie } from "@/components/financeiro/CostDistributionPie";
import { TopSuppliersTable } from "@/components/financeiro/TopSuppliersTable";
import { FinanceiroPDFButton } from "@/components/financeiro/FinanceiroPDFButton";
import { ProjectBudgetEditor } from "@/components/financeiro/ProjectBudgetEditor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FinancialEntry {
  id: string;
  data: string;
  valor: number;
  situacao: "pendente" | "conciliado" | "divergente";
  category: { nome: string; prefixo: string; cor_hex: string } | null;
  supplier: { trade_name: string } | null;
  bank_account: { banco: string; conta: string } | null;
}

export default function FinanceiroDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [budgetOpen, setBudgetOpen] = useState(false);

  const { data: project, isLoading: loadingProject } = useQuery({
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
    enabled: !!projectId,
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["project-entries-full", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select(
          "*, category:financial_categories(nome, prefixo, cor_hex), supplier:suppliers(trade_name), bank_account:bank_accounts(banco, conta)"
        )
        .eq("project_id", projectId!)
        .order("data", { ascending: true });
      if (error) throw error;
      return data as unknown as FinancialEntry[];
    },
    enabled: !!projectId,
  });

  const { data: marginHistory = [] } = useQuery({
    queryKey: ["margin-history", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("margin_snapshots" as any)
        .select("mes, receita, custo, saldo, margem, iec")
        .eq("project_id", projectId!)
        .order("mes", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!projectId,
  });

  const isLoading = loadingProject || loadingEntries;

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6 flex items-center justify-center h-[50vh]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <span>Carregando dashboard financeiro...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto p-6 flex flex-col items-center justify-center h-[50vh] gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Obra não encontrada</h2>
          <Button onClick={() => navigate("/obras")}>Voltar para lista</Button>
        </div>
      </Layout>
    );
  }

  const totalRecebido = project.receita_realizada ?? 0;
  const totalGasto = project.custo_realizado ?? 0;
  const saldo = project.saldo_atual ?? 0;
  const margem = project.margem_atual ?? 0;
  const iecAtual = project.iec_atual ?? null;

  const pendentes = entries.filter((e) => e.situacao === "pendente").length;

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/obras/${projectId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Dashboard Financeiro</h2>
              <p className="text-sm text-muted-foreground">{project.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FinanceiroPDFButton
              projectName={project.name}
              totalRecebido={totalRecebido}
              totalGasto={totalGasto}
              saldo={saldo}
              margem={margem}
              iecAtual={iecAtual}
              orcamentoPrevisto={project.orcamento_previsto ?? null}
              entries={entries}
            />
            <Link to={`/obras/${projectId}/lancamentos`}>
              <Button variant="outline" size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Ver Lançamentos
              </Button>
            </Link>
          </div>
        </div>

        {/* Alert badges */}
        {(saldo < 0 || (iecAtual !== null && iecAtual > 1) || pendentes > 0) && (
          <div className="flex flex-wrap gap-2">
            {saldo < 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 text-xs font-medium px-3 py-1 border border-red-200">
                Saldo negativo
              </span>
            )}
            {iecAtual !== null && iecAtual > 1 && (
              <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 text-xs font-medium px-3 py-1 border border-orange-200">
                IEC acima de 1.0 — custo acima do previsto
              </span>
            )}
            {pendentes > 0 && (
              <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1 border border-yellow-200">
                {pendentes} lançamento{pendentes > 1 ? "s" : ""} pendente{pendentes > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Summary cards */}
        <FinanceiroCards
          totalRecebido={totalRecebido}
          totalGasto={totalGasto}
          saldo={saldo}
          margem={margem}
          iecAtual={iecAtual}
        />

        {/* Charts row 1 */}
        <div className="grid gap-6 md:grid-cols-2">
          <CostByCategoryChart entries={entries} />
          <CurvaSChart entries={entries} />
        </div>

        {/* Charts row 2 */}
        <div className="grid gap-6 md:grid-cols-2">
          <CostDistributionPie entries={entries} />
          <TopSuppliersTable entries={entries} />
        </div>

        {/* Margin history chart */}
        {marginHistory.length > 1 && (
          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-purple-50">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="font-semibold text-base text-slate-800">Evolução da Margem</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={marginHistory.map((m: any) => ({
                  mes: m.mes?.substring(0, 7),
                  margem: Number(m.margem) || 0,
                  iec: Number(m.iec) || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip />
                  <Line type="monotone" dataKey="margem" stroke="#8B5CF6" strokeWidth={2} name="Margem %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Budget by category — collapsible */}
        <Collapsible open={budgetOpen} onOpenChange={setBudgetOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-medium shadow-sm hover:bg-muted/50 transition-colors">
              <span>Orçamento por Categoria</span>
              {budgetOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <ProjectBudgetEditor projectId={projectId!} />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Layout>
  );
}
