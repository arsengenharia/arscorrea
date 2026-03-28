import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface EntryForPie {
  valor: number;
  category: { nome: string; cor_hex: string } | null;
}

interface CostDistributionPieProps {
  entries: EntryForPie[];
}

export function CostDistributionPie({ entries }: CostDistributionPieProps) {
  // Filter costs only
  const costs = entries.filter((e) => e.valor < 0);

  if (costs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Custos</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sem dados de custo
        </CardContent>
      </Card>
    );
  }

  // Group by category name
  const categoryMap: Record<string, { total: number; color: string }> = {};
  costs.forEach((e) => {
    const name = e.category?.nome ?? "Sem categoria";
    const color = e.category?.cor_hex ?? "#94a3b8";
    if (!categoryMap[name]) categoryMap[name] = { total: 0, color };
    categoryMap[name].total += Math.abs(e.valor);
  });

  const pieData = Object.entries(categoryMap).map(([name, { total, color }]) => ({
    name,
    value: total,
    color,
  }));

  const renderLabel = ({
    name,
    percent,
  }: {
    name: string;
    percent?: number;
  }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição de Custos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={renderLabel}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
