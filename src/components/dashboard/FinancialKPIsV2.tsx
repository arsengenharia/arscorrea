import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}><CardContent className="pt-6"><div className="h-8 bg-muted rounded animate-pulse" /></CardContent></Card>
      ))}
    </div>;
  }

  const cards = [
    { title: "Receita Total", value: fmt(data.totalReceita), icon: TrendingUp, color: "text-green-600", sub: `${data.totalObras} obras ativas` },
    { title: "Custo Total", value: fmt(data.totalCusto), icon: TrendingDown, color: "text-red-600", sub: null },
    { title: "Saldo Global", value: fmt(data.totalSaldo), icon: Wallet, color: data.totalSaldo >= 0 ? "text-green-600" : "text-red-600", sub: `Margem: ${data.margemMedia.toFixed(1)}%` },
    { title: "Alertas", value: `${data.obrasNegativas + data.obrasIecAlto}`, icon: AlertTriangle, color: data.obrasNegativas > 0 ? "text-red-600" : "text-green-600", sub: data.obrasNegativas > 0 ? `${data.obrasNegativas} com saldo negativo` : "Tudo OK" },
    { title: "Não Conciliados", value: `${data.entriesPendentes}`, icon: BarChart3, color: data.entriesPendentes > 0 ? "text-amber-600" : "text-green-600", sub: "lançamentos pendentes" },
    { title: "NF-e Pendentes", value: `${data.nfePendentes}`, icon: FileCheck, color: data.nfePendentes > 0 ? "text-amber-600" : "text-green-600", sub: "aguardando revisão" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
