import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface EntryForChart {
  data: string;
  valor: number;
  category: { nome: string; cor_hex: string } | null;
}

interface CostByCategoryChartProps {
  entries: EntryForChart[];
}

export function CostByCategoryChart({ entries }: CostByCategoryChartProps) {
  // Filter costs only
  const costs = entries.filter((e) => e.valor < 0);

  if (costs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custo por Categoria por Mês</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sem dados de custo
        </CardContent>
      </Card>
    );
  }

  // Collect unique categories with their colors
  const categoryColorMap: Record<string, string> = {};
  costs.forEach((e) => {
    if (e.category) {
      categoryColorMap[e.category.nome] = e.category.cor_hex;
    }
  });
  const categories = Object.keys(categoryColorMap);

  // Group by month MM/YYYY
  const monthMap: Record<string, Record<string, number>> = {};
  costs.forEach((e) => {
    const [year, month] = e.data.split("-");
    const monthKey = `${month}/${year}`;
    if (!monthMap[monthKey]) monthMap[monthKey] = {};
    const catName = e.category?.nome ?? "Sem categoria";
    monthMap[monthKey][catName] = (monthMap[monthKey][catName] ?? 0) + Math.abs(e.valor);
  });

  // Sort months chronologically
  const sortedMonths = Object.keys(monthMap).sort((a, b) => {
    const [ma, ya] = a.split("/");
    const [mb, yb] = b.split("/");
    return new Date(Number(ya), Number(ma) - 1).getTime() - new Date(Number(yb), Number(mb) - 1).getTime();
  });

  const chartData = sortedMonths.map((month) => ({
    month,
    ...monthMap[month],
  }));

  const formatYAxis = (value: number) => `R$${(value / 1000).toFixed(0)}k`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Custo por Categoria por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) =>
                value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {categories.map((cat) => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={categoryColorMap[cat]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
