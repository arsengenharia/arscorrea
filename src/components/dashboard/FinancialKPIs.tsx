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

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  isLoading: boolean;
  subtitle?: string;
}

function KPICard({ title, value, icon: Icon, iconColor, bgColor, isLoading, subtitle }: KPICardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <h3 className="text-2xl font-bold mt-1">{formatCurrency(value)}</h3>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-full ${bgColor}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialKPIs({ data, isLoading }: FinancialKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard
        title="Valores em Aberto"
        value={data?.valoresEmAberto || 0}
        icon={DollarSign}
        iconColor="text-blue-600"
        bgColor="bg-blue-100"
        isLoading={isLoading}
      />
      <KPICard
        title="Recebido no Período"
        value={data?.valoresRecebidos || 0}
        icon={TrendingUp}
        iconColor="text-green-600"
        bgColor="bg-green-100"
        isLoading={isLoading}
      />
      <KPICard
        title="Previsão 30 dias"
        value={data?.previsibilidade || 0}
        icon={Clock}
        iconColor="text-purple-600"
        bgColor="bg-purple-100"
        isLoading={isLoading}
        subtitle="próximos vencimentos"
      />
      <KPICard
        title="Parcelas Vencidas"
        value={data?.parcelasVencidas || 0}
        icon={AlertTriangle}
        iconColor="text-red-600"
        bgColor="bg-red-100"
        isLoading={isLoading}
      />
      <KPICard
        title="Comissão Prevista"
        value={data?.comissaoPrevista || 0}
        icon={Percent}
        iconColor="text-amber-600"
        bgColor="bg-amber-100"
        isLoading={isLoading}
      />
      <KPICard
        title="Comissão Recebida"
        value={data?.comissaoRecebida || 0}
        icon={Percent}
        iconColor="text-emerald-600"
        bgColor="bg-emerald-100"
        isLoading={isLoading}
      />
    </div>
  );
}
