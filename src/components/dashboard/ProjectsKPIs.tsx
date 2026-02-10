import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

interface ProjectMetrics {
  obrasEmAndamento: number;
  obrasCriticas: number;
  margemMedia: number;
  custoNoPeriodo: number;
}

interface ProjectsKPIsProps {
  data: ProjectMetrics | null;
  isLoading: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);

export function ProjectsKPIs({ data, isLoading }: ProjectsKPIsProps) {
  const kpis = [
    {
      label: "Obras em Andamento",
      value: data?.obrasEmAndamento ?? 0,
      format: (v: number) => v.toString(),
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Obras Críticas",
      value: data?.obrasCriticas ?? 0,
      format: (v: number) => v.toString(),
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Margem Média",
      value: data?.margemMedia ?? 0,
      format: (v: number) => `${v.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Custo no Período",
      value: data?.custoNoPeriodo ?? 0,
      format: formatCurrency,
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
