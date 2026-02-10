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
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Obras Críticas",
      value: data?.obrasCriticas ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Margem Média",
      value: `${(data?.margemMedia ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Custo no Período",
      value: formatCurrency(data?.custoNoPeriodo ?? 0),
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
