import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign } from "lucide-react";
import { FinanceiroCards } from "@/components/financeiro/FinanceiroCards";
import { CostByCategoryChart } from "@/components/financeiro/CostByCategoryChart";
import { CurvaSChart } from "@/components/financeiro/CurvaSChart";
import { CostDistributionPie } from "@/components/financeiro/CostDistributionPie";
import { TopSuppliersTable } from "@/components/financeiro/TopSuppliersTable";

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
          <Link to={`/obras/${projectId}/lancamentos`}>
            <Button variant="outline" size="sm">
              <DollarSign className="h-4 w-4 mr-2" />
              Ver Lançamentos
            </Button>
          </Link>
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
      </div>
    </Layout>
  );
}
