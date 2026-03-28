import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (dateStr: string) => {
  const parts = dateStr.split("-");
  return parts.reverse().join("/");
};

interface FinancialEntry {
  id: string;
  data: string;
  valor: number;
  tipo_documento: string;
  observacoes: string | null;
  category: { nome: string; prefixo: string } | null;
  supplier: { trade_name: string } | null;
}

export default function RelatorioProjeto() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const reportType = searchParams.get("tipo") || "financeiro";

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["report-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "name, saldo_atual, custo_realizado, receita_realizada, margem_atual, iec_atual, orcamento_previsto, status, data_inicio, data_conclusao_prevista"
        )
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["report-entries", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select(
          "id, data, valor, tipo_documento, observacoes, category:financial_categories(nome, prefixo), supplier:suppliers(trade_name)"
        )
        .eq("project_id", projectId!)
        .order("data", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as FinancialEntry[];
    },
    enabled: !!projectId,
  });

  const { data: anomalies = [] } = useQuery({
    queryKey: ["report-anomalies", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anomaly_alerts" as any)
        .select("tipo, severidade, descricao, created_at")
        .eq("project_id", projectId!)
        .eq("resolvido", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!projectId,
  });

  const isLoading = loadingProject || loadingEntries;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Gerando relatório...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-red-600 text-lg">Projeto não encontrado.</p>
      </div>
    );
  }

  const totalRecebido = project.receita_realizada ?? 0;
  const totalGasto = project.custo_realizado ?? 0;
  const saldo = project.saldo_atual ?? 0;
  const margem = project.margem_atual ?? 0;
  const iecAtual = project.iec_atual;
  const orcamentoPrevisto = project.orcamento_previsto;

  // Build top suppliers
  const supplierMap: Record<string, number> = {};
  for (const e of entries) {
    if (e.valor < 0 && e.supplier) {
      const name = e.supplier.trade_name;
      supplierMap[name] = (supplierMap[name] ?? 0) + Math.abs(e.valor);
    }
  }
  const topSuppliers = Object.entries(supplierMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  for (const e of entries) {
    if (e.valor < 0 && e.category) {
      const name = `${e.category.prefixo} ${e.category.nome}`;
      categoryMap[name] = (categoryMap[name] ?? 0) + Math.abs(e.valor);
    }
  }
  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const today = new Date().toLocaleDateString("pt-BR");

  const summaryRows = [
    { label: "Total Recebido", value: fmt(totalRecebido), positive: true },
    { label: "Total Gasto", value: fmt(totalGasto), positive: false },
    { label: "Saldo da Obra", value: fmt(saldo), positive: saldo >= 0 },
    { label: "Margem Bruta", value: `${margem.toFixed(2)}%`, positive: margem >= 0 },
    { label: "IEC", value: iecAtual != null ? iecAtual.toFixed(3) : "—", positive: iecAtual != null && iecAtual <= 1 },
    { label: "Orçamento Previsto", value: orcamentoPrevisto != null ? fmt(orcamentoPrevisto) : "—", positive: true },
  ];

  const recentEntries = entries.slice(0, 30);

  const reportTitle =
    reportType === "completo"
      ? "Relatório Completo"
      : reportType === "recebiveis"
        ? "Relatório de Recebíveis"
        : "Relatório Financeiro";

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      {/* Print-only styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      {/* Print button (hidden on print) */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          Imprimir / Salvar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg shadow-lg hover:bg-slate-300 transition-colors font-medium text-sm"
        >
          Fechar
        </button>
      </div>

      {/* Page content */}
      <div className="max-w-[210mm] mx-auto px-8 py-10">
        {/* Header */}
        <div className="bg-[#1e3a5f] text-white rounded-lg px-6 py-5 mb-8">
          <h1 className="text-xl font-bold">ARS Engenharia — {reportTitle}</h1>
          <p className="text-sm text-blue-200 mt-1">{project.name}</p>
          <div className="flex gap-6 text-xs text-blue-200 mt-2">
            <span>Gerado em: {today}</span>
            {project.status && <span>Status: {project.status}</span>}
            {project.data_inicio && (
              <span>
                Período: {fmtDate(project.data_inicio)}
                {project.data_conclusao_prevista ? ` a ${fmtDate(project.data_conclusao_prevista)}` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-[#1e3a5f] border-b border-slate-200 pb-2 mb-4">
            Resumo Financeiro
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="text-left px-4 py-2 font-semibold">Métrica</th>
                <th className="text-right px-4 py-2 font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row, i) => (
                <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                  <td className="px-4 py-2 font-medium text-slate-700">{row.label}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${row.positive ? "text-slate-900" : "text-red-600"}`}>
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-[#1e3a5f] border-b border-slate-200 pb-2 mb-4">
              Custos por Categoria
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e3a5f] text-white">
                  <th className="text-left px-4 py-2 font-semibold w-8">#</th>
                  <th className="text-left px-4 py-2 font-semibold">Categoria</th>
                  <th className="text-right px-4 py-2 font-semibold">Total</th>
                  <th className="text-right px-4 py-2 font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {topCategories.map(([name, total], i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                    <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-slate-700">{name}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold">{fmt(total)}</td>
                    <td className="px-4 py-2 text-right text-slate-500">
                      {totalGasto !== 0 ? ((total / Math.abs(totalGasto)) * 100).toFixed(1) : "0"}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Top Suppliers */}
        {topSuppliers.length > 0 && (
          <section className="mb-8 page-break">
            <h2 className="text-base font-bold text-[#1e3a5f] border-b border-slate-200 pb-2 mb-4">
              Top Fornecedores
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e3a5f] text-white">
                  <th className="text-left px-4 py-2 font-semibold w-8">#</th>
                  <th className="text-left px-4 py-2 font-semibold">Fornecedor</th>
                  <th className="text-right px-4 py-2 font-semibold">Total Gasto</th>
                </tr>
              </thead>
              <tbody>
                {topSuppliers.map(([name, total], i) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                    <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-slate-700">{name}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold">{fmt(total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-[#1e3a5f] border-b border-slate-200 pb-2 mb-4">
              Anomalias em Aberto ({anomalies.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-600 text-white">
                  <th className="text-left px-4 py-2 font-semibold">Tipo</th>
                  <th className="text-left px-4 py-2 font-semibold">Severidade</th>
                  <th className="text-left px-4 py-2 font-semibold">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a: any, i: number) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-amber-50" : ""}>
                    <td className="px-4 py-2 text-slate-700 capitalize">{a.tipo?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          a.severidade === "alta"
                            ? "bg-red-100 text-red-700"
                            : a.severidade === "media"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {a.severidade}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs">{a.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Recent Entries */}
        <section className="mb-8 page-break">
          <h2 className="text-base font-bold text-[#1e3a5f] border-b border-slate-200 pb-2 mb-4">
            Extrato Financeiro (últimos {recentEntries.length} lançamentos)
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="text-left px-3 py-2 font-semibold">Data</th>
                <th className="text-left px-3 py-2 font-semibold">Categoria</th>
                <th className="text-left px-3 py-2 font-semibold">Fornecedor</th>
                <th className="text-left px-3 py-2 font-semibold">Tipo Doc.</th>
                <th className="text-right px-3 py-2 font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.map((entry, i) => {
                const isNeg = entry.valor < 0;
                return (
                  <tr key={entry.id} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                    <td className="px-3 py-1.5">{fmtDate(entry.data)}</td>
                    <td className="px-3 py-1.5">
                      {entry.category ? `${entry.category.prefixo} ${entry.category.nome}` : "—"}
                    </td>
                    <td className="px-3 py-1.5">{entry.supplier?.trade_name ?? "—"}</td>
                    <td className="px-3 py-1.5">{entry.tipo_documento || "—"}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${isNeg ? "text-red-600" : "text-emerald-700"}`}>
                      {isNeg ? `-${fmt(Math.abs(entry.valor))}` : fmt(entry.valor)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400 mt-12">
          <p>ARS Engenharia — {reportTitle} — Gerado em {today}</p>
          <p className="mt-1">Este relatório foi gerado automaticamente pelo assistente de IA da ARS Correa.</p>
        </div>
      </div>
    </div>
  );
}
