import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, AlertTriangle, Clock, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialKPIsProps {
  data: {
    valoresEmAberto: number;
    valoresRecebidos: number;
    previsibilidade: number;
    parcelasVencidas: number;
    comissaoPrevista: number;
    comissaoRecebida: number;
  } | null;
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function FinancialKPIs({ data, isLoading }: FinancialKPIsProps) {
  const kpis = [
    {
      label: "Valores em Aberto",
      value: data?.valoresEmAberto ?? 0,
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Recebido no Periodo",
      value: data?.valoresRecebidos ?? 0,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Previsao 30 dias",
      value: data?.previsibilidade ?? 0,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      subtitle: "proximos vencimentos",
    },
    {
      label: "Parcelas Vencidas",
      value: data?.parcelasVencidas ?? 0,
      icon: AlertTriangle,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
    {
      label: "Comissao Prevista",
      value: data?.comissaoPrevista ?? 0,
      icon: Percent,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Comissao Recebida",
      value: data?.comissaoRecebida ?? 0,
      icon: Percent,
      color: "text-sky-600",
      bgColor: "bg-sky-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((_, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-md bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-7 w-20 rounded bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${kpi.bgColor}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(kpi.value)}</p>
              {"subtitle" in kpi && kpi.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.subtitle}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
