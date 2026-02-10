import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProposalsFunnelProps {
  data: { name: string; value: number }[];
  lossRate: number;
  isLoading: boolean;
}

// Paleta de Cores Suaves (Pastel / Soft UI)
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

export function ProposalsFunnel({ data, lossRate, isLoading }: ProposalsFunnelProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  return (
    <Card className="shadow-sm border-slate-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <PieIcon className="h-5 w-5 text-blue-500" />
            </div>
            <CardTitle className="text-lg font-medium text-slate-700">Funil de Propostas</CardTitle>
          </div>
          <div className="text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
            Perda: <span className="font-medium text-red-400">{lossRate}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            Sem propostas cadastradas
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              {/* Definição do filtro de sombra para o efeito 3D */}
              <defs>
                <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                  <feOffset dx="2" dy="4" result="offsetblur" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60} // Transforma em Gráfico de Rosca (Minimalista)
                outerRadius={90}
                paddingAngle={4} // Espaço entre as fatias
                cornerRadius={6} // Bordas arredondadas nas fatias
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                stroke="none"
              >
                {data.map((entry, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={getColor(entry.name)}
                      // Lógica do Efeito 3D:
                      // 1. Aplica o filtro de sombra se estiver ativo
                      // 2. Aumenta a opacidade se não estiver ativo para dar destaque
                      style={{
                        filter: isActive ? "url(#shadow3d)" : "none",
                        transform: isActive ? "scale(1.05)" : "scale(1)",
                        transformOrigin: "center",
                        transition: "all 0.3s ease",
                        outline: "none",
                      }}
                      stroke={isActive ? "#fff" : "none"}
                      strokeWidth={isActive ? 2 : 0}
                    />
                  );
                })}
              </Pie>

              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-100 shadow-xl rounded-xl text-sm">
                        <div className="font-semibold text-slate-700 mb-1">{data.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(data.name) }} />
                          <span className="text-slate-500">{data.value} Propostas</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-slate-500 text-xs ml-1">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
