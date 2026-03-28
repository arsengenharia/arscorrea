import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, BarChart3, FileCheck } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function FinancialKPIsV2() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-financial-v2"],
    queryFn: async () => {
      // Active projects with v2 financial columns
      const { data: projects } = await supabase
        .from("projects")
        .select("saldo_atual, custo_realizado, receita_realizada, margem_atual, iec_atual")
        .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"]);

      // Pending counts
      const { count: entriesPendentes } = await (supabase.from("project_financial_entries" as any) as any)
        .select("id", { count: "exact", head: true })
        .eq("situacao", "pendente");

      const { count: nfePendentes } = await (supabase.from("nfe_inbox" as any) as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "aguardando_revisao");

      const all = projects || [];
      const totalReceita = all.reduce((s, p) => s + (Number(p.receita_realizada) || 0), 0);
      const totalCusto = all.reduce((s, p) => s + (Number(p.custo_realizado) || 0), 0);
      const totalSaldo = totalReceita - totalCusto;
      const margemMedia = totalReceita > 0 ? ((totalReceita - totalCusto) / totalReceita) * 100 : 0;
      const obrasNegativas = all.filter(p => (Number(p.saldo_atual) || 0) < 0).length;
      const obrasIecAlto = all.filter(p => p.iec_atual != null && Number(p.iec_atual) > 1).length;

      return {
        totalReceita, totalCusto, totalSaldo, margemMedia,
        obrasNegativas, obrasIecAlto,
        entriesPendentes: entriesPendentes || 0,
        nfePendentes: nfePendentes || 0,
        totalObras: all.length,
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-md bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-7 w-20 rounded bg-muted animate-pulse" />
              <div className="h-3 w-14 rounded bg-muted animate-pulse mt-1.5" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const alertCount = data.obrasNegativas + data.obrasIecAlto;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KpiCard icon={TrendingUp} iconBg="emerald" label="Receita Total" value={fmt(data.totalReceita)} subtitle={`${data.totalObras} obras ativas`} />
      <KpiCard icon={TrendingDown} iconBg="rose" label="Custo Total" value={fmt(data.totalCusto)} />
      <KpiCard icon={Wallet} iconBg="blue" label="Saldo Global" value={fmt(data.totalSaldo)} subtitle={`Margem: ${data.margemMedia.toFixed(1)}%`} />
      <KpiCard icon={AlertTriangle} iconBg="amber" label="Alertas" value={alertCount} valueClassName={alertCount > 0 ? "text-red-600" : "text-green-600"} subtitle={data.obrasNegativas > 0 ? `${data.obrasNegativas} com saldo negativo` : "Tudo OK"} />
      <KpiCard icon={BarChart3} iconBg="purple" label="Nao Conciliados" value={data.entriesPendentes} valueClassName={data.entriesPendentes > 0 ? "text-amber-600" : "text-green-600"} subtitle="lancamentos pendentes" />
      <KpiCard icon={FileCheck} iconBg="sky" label="NF-e Pendentes" value={data.nfePendentes} valueClassName={data.nfePendentes > 0 ? "text-amber-600" : "text-green-600"} subtitle="aguardando revisao" />
    </div>
  );
}
