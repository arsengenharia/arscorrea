import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProposalMapItem {
  id: string;
  number: string;
  clientName: string;
  stageName: string;
  total: number;
  address: string;
}

interface ProposalsMapProps {
  data: ProposalMapItem[];
  isLoading: boolean;
}

const STAGE_COLORS: Record<string, string> = {
  "Proposta em aberto (inicial)": "#93C5FD",
  "Visita agendada": "#A5B4FC",
  "Visita realizada": "#C084FC",
  "Proposta enviada": "#67E8F9",
  "Reunião marcada para entrega": "#FCD34D",
  "Proposta em aberto": "#38BDF8",
  "Proposta recusada": "#FCA5A5",
  "Proposta aprovada": "#86EFAC",
  "Sem etapa": "#CBD5E1",
};

export function ProposalsMap({ data, isLoading }: ProposalsMapProps) {
  const proposalsWithAddress = useMemo(
    () => data.filter((p) => p.address && p.address.trim() !== ""),
    [data]
  );

  const stagesInData = useMemo(() => {
    const stages = new Set(proposalsWithAddress.map((p) => p.stageName || "Sem etapa"));
    return Array.from(stages);
  }, [proposalsWithAddress]);

  return (
    <Card className="shadow-none border border-slate-100 bg-white">
      <CardHeader className="pb-4 pt-6 px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-xl">
            <MapPin className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-slate-800">
              Mapa de Propostas
            </CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              {proposalsWithAddress.length} propostas com endereço
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {isLoading ? (
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        ) : proposalsWithAddress.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 rounded-2xl border border-dashed border-slate-100">
            <MapPin className="h-8 w-8 mb-2 opacity-20" />
            <span className="text-sm font-medium">Sem propostas com endereço para exibir</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-2 px-2">
              {stagesInData.map((stage) => (
                <div key={stage} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: STAGE_COLORS[stage] || "#CBD5E1" }}
                  />
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                    {stage}
                  </span>
                </div>
              ))}
            </div>

            {/* Proposals list as a visual representation */}
            <div className="h-[350px] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/30 p-3 space-y-2">
              {proposalsWithAddress.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full mt-1 shrink-0"
                    style={{
                      backgroundColor:
                        STAGE_COLORS[proposal.stageName] || "#CBD5E1",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {proposal.clientName}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 shrink-0">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(proposal.total)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {proposal.address}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {proposal.number && (
                        <span className="text-[10px] text-slate-400">
                          #{proposal.number}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {proposal.stageName}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
