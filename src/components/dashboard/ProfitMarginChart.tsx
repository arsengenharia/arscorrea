import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

interface ProfitMarginChartProps {
  data: { name: string; margem: number; receita: number; custo: number }[];
  isLoading: boolean;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-slate-700 mb-1">{d.name}</p>
      <p className="text-sm" style={{ color: d.margem >= 0 ? "#93c5fd" : "#fda4af" }}>
        Margem: <span className="font-semibold">{d.margem}%</span>
      </p>
      <p className="text-sm text-slate-600">
        Receita: <span className="font-semibold">{formatCurrency(d.receita)}</span>
      </p>
      <p className="text-sm text-slate-600">
        Custo: <span className="font-semibold">{formatCurrency(d.custo)}</span>
      </p>
    </div>
  );
};

export function ProfitMarginChart({ data, isLoading }: ProfitMarginChartProps) {
  return (
    <Card className="shadow-sm border-slate-100">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-blue-50">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-base text-slate-800">Margem de Lucro por Obra</h3>
        </div>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
            Sem dados de margem.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(280, data.length * 40)}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fill: "#64748b", fontSize: 11 }}
                width={75}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0} stroke="#94a3b8" />
              <Bar dataKey="margem" name="Margem %" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.margem >= 0 ? "#93c5fd" : "#fda4af"}
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
