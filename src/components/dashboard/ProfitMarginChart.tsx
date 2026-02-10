import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

interface ProfitMarginChartProps {
  data: { name: string; margem: number; receita: number; custo: number }[];
  isLoading: boolean;
}

export function ProfitMarginChart({ data, isLoading }: ProfitMarginChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Margem de Lucro por Obra</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Sem dados de margem.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={75} />
              <Tooltip formatter={(value: number) => `${value}%`} />
              <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
              <Bar dataKey="margem" name="Margem %" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.margem >= 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 84%, 60%)"}
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
