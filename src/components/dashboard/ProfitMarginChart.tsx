import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

interface ProfitMarginChartProps {
  data: { name: string; margem: number; receita: number; custo: number }[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-100 shadow-xl rounded-xl px-4 py-3">
      <p className="text-sm font-semibold text-foreground mb-1">{d.name}</p>
      <p className="text-xs text-muted-foreground">Margem: {d.margem}%</p>
      <p className="text-xs text-muted-foreground">Receita: {formatCurrency(d.receita)}</p>
      <p className="text-xs text-muted-foreground">Custo: {formatCurrency(d.custo)}</p>
    </div>
  );
};

export function ProfitMarginChart({ data, isLoading }: ProfitMarginChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-medium">Margem de Lucro por Obra</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Sem dados de margem.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={75} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
              <Bar dataKey="margem" name="Margem %" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.margem >= 0 ? "#86EFAC" : "#FCA5A5"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
