import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProposalsAgingChartProps {
  data: { bucket: string; [key: string]: string | number }[];
  allStages: string[];
  isLoading: boolean;
}

// Mesma paleta pastel do gráfico anterior para consistência
const COLORS: { [key: string]: string } = {
  "Proposta em aberto (inicial)": "#93C5FD", // Soft Blue
  "Visita agendada": "#A5B4FC", // Soft Indigo
  "Visita realizada": "#C084FC", // Soft Purple
  "Proposta enviada": "#67E8F9", // Soft Cyan
  "Reunião marcada para entrega": "#FCD34D", // Soft Amber
  "Proposta em aberto": "#38BDF8", // Sky Blue
  "Proposta recusada": "#FCA5A5", // Soft Red
  "Proposta aprovada": "#86EFAC", // Soft Green
  "Sem etapa": "#CBD5E1", // Soft Slate
};

const getColor = (name: string) => COLORS[name] || "#CBD5E1";

export function ProposalsAgingChart({ data, allStages, isLoading }: ProposalsAgingChartProps) {
  const labelMap: { [key: string]: string } = {
    "0-7": "0-7 dias",
    "8-15": "8-15 dias",
    "16-30": "16-30 dias",
    "31-60": "31-60 dias",
    "60+": "60+ dias",
  };

  const chartData = data.map((item) => ({
    ...item,
    label: labelMap[item.bucket as string] || item.bucket,
  }));

  return (
    <Card className="shadow-sm border-slate-100">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {/* Ícone com fundo suave (estilo consistente) */}
          <div className="p-2 bg-blue-50 rounded-lg">
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          <CardTitle className="text-lg font-medium text-slate-700">Aging de Propostas</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            Sem dados para exibir
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: -20, bottom: 0 }}
              barSize={40} // Barras mais largas para visual moderno
            >
              {/* Definição de sombra sutil para efeito de profundidade */}
              <defs>
                <filter id="barShadow" height="130%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                  <feOffset dx="0" dy="2" result="offsetblur" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.2" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0" // Slate-200
              />

              <XAxis
                dataKey="label"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#64748B" }} // Slate-500
                dy={10} // Afastamento vertical
              />

              <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: "#64748B" }} />

              <Tooltip
                cursor={{ fill: "#F1F5F9", opacity: 0.5 }} // Highlight da coluna ao passar o mouse
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-100 shadow-xl rounded-xl text-sm min-w-[200px]">
                        <div className="font-semibold text-slate-700 mb-2 border-b border-slate-100 pb-1">{label}</div>
                        <div className="flex flex-col gap-1">
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-slate-500 text-xs">{entry.name}</span>
                              </div>
                              <span className="font-medium text-slate-700">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                verticalAlign="top"
                height={40}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingBottom: "20px" }}
                formatter={(value) => <span className="text-slate-500 text-xs font-medium ml-1">{value}</span>}
              />

              {allStages.map((stage) => (
                <Bar
                  key={stage}
                  dataKey={stage}
                  name={stage}
                  stackId="a"
                  fill={getColor(stage)}
                  // Estilização das barras para parecerem "Pílulas" 3D
                  radius={[4, 4, 4, 4]}
                  stroke="#fff" // Cria espaçamento branco entre os stacks
                  strokeWidth={2}
                  style={{ filter: "url(#barShadow)" }} // Aplica a sombra definida no <defs>
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
