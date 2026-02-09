import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieIcon } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProposalsFunnelProps {
  data: { name: string; value: number }[];
  lossRate: number;
  isLoading: boolean;
}

const COLORS: { [key: string]: string } = {
  "Proposta em aberto (inicial)": "#3B82F6",
  "Visita agendada": "#6366F1",
  "Visita realizada": "#A855F7",
  "Proposta enviada": "#06B6D4",
  "Reunião marcada para entrega": "#F59E0B",
  "Proposta em aberto": "#0EA5E9",
  "Proposta recusada": "#EF4444",
  "Proposta aprovada": "#22C55E",
  "Sem etapa": "#94A3B8",
};

const getColor = (name: string) => COLORS[name] || "#94A3B8";

export function ProposalsFunnel({ data, lossRate, isLoading }: ProposalsFunnelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-medium">Funil de Propostas</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">
            Taxa de perda: <span className="font-medium text-red-500">{lossRate}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem propostas cadastradas
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [value, "Propostas"]}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
