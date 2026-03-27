import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-emerald-50">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Receita Total</span>
          </div>
          <p className="text-xl font-bold text-foreground">{fmt(data.totalReceita)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.totalObras} obras ativas</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-rose-50">
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Custo Total</span>
          </div>
          <p className="text-xl font-bold text-foreground">{fmt(data.totalCusto)}</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-blue-50">
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Saldo Global</span>
          </div>
          <p className="text-xl font-bold text-foreground">{fmt(data.totalSaldo)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Margem: {data.margemMedia.toFixed(1)}%</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Alertas</span>
          </div>
          <p className={`text-xl font-bold ${alertCount > 0 ? "text-red-600" : "text-green-600"}`}>
            {alertCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.obrasNegativas > 0 ? `${data.obrasNegativas} com saldo negativo` : "Tudo OK"}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-purple-50">
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Nao Conciliados</span>
          </div>
          <p className={`text-xl font-bold ${data.entriesPendentes > 0 ? "text-amber-600" : "text-green-600"}`}>
            {data.entriesPendentes}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">lancamentos pendentes</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-sky-50">
              <FileCheck className="h-4 w-4 text-sky-600" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">NF-e Pendentes</span>
          </div>
          <p className={`text-xl font-bold ${data.nfePendentes > 0 ? "text-amber-600" : "text-green-600"}`}>
            {data.nfePendentes}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">aguardando revisao</p>
        </CardContent>
      </Card>
    </div>
  );
}
