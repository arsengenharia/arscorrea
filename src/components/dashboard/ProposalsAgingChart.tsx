import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProposalsAgingChartProps {
  data: { bucket: string; [key: string]: string | number }[];
  allStages: string[];
  isLoading: boolean;
}

const COLORS: { [key: string]: string } = {
  "Em aberto": "#3B82F6",
  "Em análise": "#F59E0B",
  "Fechada": "#22C55E",
  "Perdida": "#EF4444",
  "Sem etapa": "#94A3B8",
};

const getColor = (name: string) => COLORS[name] || "#94A3B8";

export function ProposalsAgingChart({ data, allStages, isLoading }: ProposalsAgingChartProps) {
  const labelMap: { [key: string]: string } = {
    "0-7": "0-7 dias",
    "8-15": "8-15 dias",
    "16-30": "16-30 dias",
    "31-60": "31-60 dias",
    "60+": "60+ dias",
  };

  const chartData = data.map(item => ({
    ...item,
    label: labelMap[item.bucket] || item.bucket,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-medium">Aging de Propostas</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem dados para exibir
          </div>
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
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Legend />
              {allStages.map((stage) => (
                <Bar
                  key={stage}
                  dataKey={stage}
                  name={stage}
                  stackId="a"
                  fill={getColor(stage)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
