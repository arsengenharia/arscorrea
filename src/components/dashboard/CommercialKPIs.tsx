import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, TrendingUp, DollarSign, Target, Receipt } from "lucide-react";

interface CommercialKPIsProps {
  data: {
    proposalsEmAberto: number;
    proposalsNoPeriodo: number;
    valorTotalEmAberto: number;
    taxaConversao: number;
    ticketMedio: number;
  } | null;
  isLoading: boolean;
}

export function CommercialKPIs({ data, isLoading }: CommercialKPIsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const kpis = [
    {
      label: "Propostas em Aberto",
      value: data?.proposalsEmAberto ?? 0,
      format: (v: number) => v.toString(),
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Propostas no Período",
      value: data?.proposalsNoPeriodo ?? 0,
      format: (v: number) => v.toString(),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Valor Total em Aberto",
      value: data?.valorTotalEmAberto ?? 0,
      format: formatCurrency,
      icon: DollarSign,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Taxa de Conversão",
      value: data?.taxaConversao ?? 0,
      format: (v: number) => `${v.toFixed(1)}%`,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Ticket Médio",
      value: data?.ticketMedio ?? 0,
      format: formatCurrency,
      icon: Receipt,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md ${kpi.bgColor}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {kpi.label}
                </span>
              </div>
              <div className="text-xl font-bold text-foreground">
                {kpi.format(kpi.value)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
