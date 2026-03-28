import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface EntryForCurvaS {
  data: string;
  valor: number;
}

interface CurvaSChartProps {
  entries: EntryForCurvaS[];
}

export function CurvaSChart({ entries }: CurvaSChartProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Curva S Financeira</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sem dados disponíveis
        </CardContent>
      </Card>
    );
  }

  // Group by month
  const monthMap: Record<string, { receita: number; custo: number }> = {};
  entries.forEach((e) => {
    const [year, month] = e.data.split("-");
    const key = `${month}/${year}`;
    if (!monthMap[key]) monthMap[key] = { receita: 0, custo: 0 };
    if (e.valor > 0) {
      monthMap[key].receita += e.valor;
    } else {
      monthMap[key].custo += Math.abs(e.valor);
    }
  });

  // Sort months chronologically
  const sortedMonths = Object.keys(monthMap).sort((a, b) => {
    const [ma, ya] = a.split("/");
    const [mb, yb] = b.split("/");
    return new Date(Number(ya), Number(ma) - 1).getTime() - new Date(Number(yb), Number(mb) - 1).getTime();
  });

  // Build cumulative series
  let accReceita = 0;
  let accCusto = 0;
  const chartData = sortedMonths.map((month) => {
    accReceita += monthMap[month].receita;
    accCusto += monthMap[month].custo;
    return {
      month,
      "Receita Acumulada": accReceita,
      "Custo Acumulado": accCusto,
    };
  });

  const formatYAxis = (value: number) => `R$${(value / 1000).toFixed(0)}k`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Curva S Financeira</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) =>
                value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="Receita Acumulada"
              stroke="#16A34A"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Custo Acumulado"
              stroke="#DC2626"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
