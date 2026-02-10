import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface RevenueCostChartProps {
  data: { month: string; receita: number; custo: number }[];
  isLoading: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-100 shadow-xl rounded-xl px-4 py-3">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export function RevenueCostChart({ data, isLoading }: RevenueCostChartProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-medium">Receitas vs Custos (12 meses)</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#93C5FD" stopOpacity={1} />
                  <stop offset="100%" stopColor="#93C5FD" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FCA5A5" stopOpacity={1} />
                  <stop offset="100%" stopColor="#FCA5A5" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="receita" name="Receita" fill="url(#colorReceita)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="custo" name="Custo" fill="url(#colorCusto)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
