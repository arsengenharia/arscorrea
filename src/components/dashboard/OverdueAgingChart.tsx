import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface OverdueAgingChartProps {
  data: { name: string; value: number }[];
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }
  return `R$ ${value}`;
};

const COLORS = ["#22C55E", "#F59E0B", "#F97316", "#EF4444", "#DC2626"];

export function OverdueAgingChart({ data, isLoading }: OverdueAgingChartProps) {
  const labelMap: { [key: string]: string } = {
    "0-7": "0-7 dias",
    "8-15": "8-15 dias",
    "16-30": "16-30 dias",
    "31-60": "31-60 dias",
    "60+": "60+ dias",
  };

  const chartData = data.map(item => ({
    ...item,
    label: labelMap[item.name] || item.name,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-medium">Parcelas Vencidas por Aging</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={formatCurrency} 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar dataKey="value" name="Valor" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
