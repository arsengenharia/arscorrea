import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProposalsAgingChartProps {
  data: { bucket: string; [key: string]: string | number }[];
  allStages: string[];
  isLoading: boolean;
}

// Paleta Pastel Suave
const COLORS: { [key: string]: string } = {
  "Proposta em aberto (inicial)": "#93C5FD", // Blue-300
  "Visita agendada": "#A5B4FC", // Indigo-300
  "Visita realizada": "#C084FC", // Purple-300
  "Proposta enviada": "#67E8F9", // Cyan-300
  "Reunião marcada para entrega": "#FCD34D", // Amber-300
  "Proposta em aberto": "#38BDF8", // Sky-400
  "Proposta recusada": "#FCA5A5", // Red-300
  "Proposta aprovada": "#86EFAC", // Green-300
  "Sem etapa": "#CBD5E1", // Slate-300
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
    <Card className="shadow-none border border-slate-100 bg-white">
      <CardHeader className="pb-4 pt-6 px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-xl">
            <Clock className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-slate-800">Aging de Propostas</CardTitle>
            <p className="text-xs text-slate-400 mt-1">Tempo de estagnação por etapa</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 rounded-2xl border border-dashed border-slate-100">
            <Clock className="h-8 w-8 mb-2 opacity-20" />
            <span className="text-sm font-medium">Sem dados para exibir</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barSize={32} // Barras mais finas e elegantes
            >
              {/* Eixos Minimalistas: Sem linhas, apenas texto suave */}
              <XAxis
                dataKey="label"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94A3B8" }} // Slate-400
                dy={10}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94A3B8" }}
                tickFormatter={(value) => `${value}`}
              />

              <Tooltip
                cursor={{ fill: "#F8FAFC", radius: 8 }} // Fundo muito sutil ao passar o mouse na coluna
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm rounded-xl p-3 min-w-[180px]">
                        <p className="text-xs font-semibold text-slate-600 mb-2 px-1">{label}</p>
                        <div className="space-y-1">
                          {payload.map((entry: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-xs px-1 py-0.5 rounded hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-slate-500 truncate max-w-[120px]">{entry.name}</span>
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
                height={50}
                content={({ payload }) => (
                  <div className="flex flex-wrap justify-end gap-2 mb-4 px-4">
                    {payload?.map((entry: any, index: number) => (
                      <div key={`item-${index}`} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              />

              {allStages.map((stage) => (
                <Bar
                  key={stage}
                  dataKey={stage}
                  name={stage}
                  stackId="a"
                  fill={getColor(stage)}
                  radius={[4, 4, 4, 4]} // Todos os cantos arredondados (estilo "Pílula")
                  stroke="#ffffff" // Borda branca para separar os blocos
                  strokeWidth={2} // Espessura da separação
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
