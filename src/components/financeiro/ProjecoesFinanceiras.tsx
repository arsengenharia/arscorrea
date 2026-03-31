import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ArrowRight, Bot, AlertTriangle, Pause } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { AI_ANALYZE_EVENT } from "@/components/ai/AnalyzeButton";

interface ProjectProjection {
  id: string;
  name: string;
  status: string;
  projecao_json: {
    burn_rate_mensal: number;
    orcamento_restante: number;
    meses_restantes: number | null;
    data_estouro_prevista: string | null;
    tendencia_margem: string;
    margem_3m: number[];
    status: string;
    obra_parada: boolean;
    ifec_status: string;
    updated_at: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  critico: { color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle, label: "Critico" },
  alerta: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: TrendingDown, label: "Alerta" },
  saudavel: { color: "bg-green-100 text-green-800 border-green-200", icon: TrendingUp, label: "Saudavel" },
  parada: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: Pause, label: "Parada" },
};

function analyzeWithAI(projectName: string) {
  window.dispatchEvent(new CustomEvent(AI_ANALYZE_EVENT, {
    detail: { prompt: `Analise a saude financeira da obra "${projectName}": burn rate, tendencia de margem, projecao de orcamento, e recomendacoes.` },
  }));
}

export function ProjecoesFinanceiras() {
  const navigate = useNavigate();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["insights-projections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, projecao_json")
        .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
        .not("projecao_json", "is", null)
        .order("name");
      if (error) throw error;
      return data as unknown as ProjectProjection[];
    },
  });

  const sorted = [...projects].sort((a, b) => {
    const order: Record<string, number> = { critico: 0, alerta: 1, parada: 2, saudavel: 3 };
    const sA = order[(a.projecao_json as any)?.status] ?? 9;
    const sB = order[(b.projecao_json as any)?.status] ?? 9;
    return sA - sB;
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground text-center py-8">Calculando projecoes...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        <h3 className="font-semibold text-base">Projecoes Financeiras</h3>
        <Badge variant="outline" className="text-xs">{sorted.length} obras</Badge>
      </div>

      {sorted.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma projecao disponivel. As projecoes sao calculadas diariamente as 06h.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {sorted.map((p) => {
            const proj = p.projecao_json;
            if (!proj) return null;
            const config = STATUS_CONFIG[proj.status] || STATUS_CONFIG.saudavel;
            const Icon = config.icon;

            let headline = "";
            if (proj.status === "critico" && proj.data_estouro_prevista) {
              const days = Math.max(0, Math.round((new Date(proj.data_estouro_prevista).getTime() - Date.now()) / 86400000));
              headline = days === 0 ? "Orcamento esgotado" : `Estoura em ${days} dias`;
            } else if (proj.status === "alerta" && proj.tendencia_margem === "queda") {
              headline = "Margem em queda consecutiva";
            } else if (proj.status === "alerta" && proj.ifec_status === "critico") {
              headline = "Atraso fisico significativo (IFEC)";
            } else if (proj.status === "alerta" && proj.meses_restantes != null) {
              headline = `~${proj.meses_restantes.toFixed(1)} meses de orcamento`;
            } else if (proj.obra_parada) {
              headline = "Sem movimentacao ha 30+ dias";
            } else {
              headline = "Dentro do planejado";
            }

            return (
              <Card key={p.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: proj.status === "critico" ? "#ef4444" : proj.status === "alerta" ? "#f59e0b" : proj.status === "parada" ? "#94a3b8" : "#22c55e" }} />
                        <span className="text-sm font-medium truncate">{p.name}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${config.color}`}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{headline}</p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        {proj.burn_rate_mensal > 0 && <span>Burn: {formatBRL(proj.burn_rate_mensal)}/mes</span>}
                        {proj.orcamento_restante !== 0 && <span>Restam: {formatBRL(proj.orcamento_restante)}</span>}
                        {proj.tendencia_margem !== "estavel" && (
                          <span className="flex items-center gap-0.5">
                            Margem: {proj.tendencia_margem === "queda" ? <TrendingDown className="h-3 w-3 text-red-500" /> : <TrendingUp className="h-3 w-3 text-green-500" />}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => analyzeWithAI(p.name)} title="Analisar com IA">
                        <Bot className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(`/obras/${p.id}/financeiro`)}>
                        Ver <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
