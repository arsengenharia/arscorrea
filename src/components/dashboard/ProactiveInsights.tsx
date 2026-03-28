import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertTriangle, Clock, CheckCircle } from "lucide-react";

// ---------- helpers ----------

function SeverityIcon({ severidade }: { severidade: string }) {
  switch (severidade) {
    case "critica":
      return <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />;
    case "alta":
      return <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />;
    case "media":
      return <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />;
  }
}

const severidadeBadge: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critica: "destructive",
  alta: "destructive",
  media: "default",
  baixa: "secondary",
};

// ---------- component ----------

export function ProactiveInsights() {
  // 1. Open anomalies
  const { data: anomalies = [], isLoading: loadingAnomalies } = useQuery({
    queryKey: ["proactive-anomalies"],
    queryFn: async () => {
      const { data } = await (supabase.from("anomalies" as any) as any)
        .select("id, tipo, severidade, titulo, descricao, project_id")
        .eq("status", "aberta")
        .order("created_at", { ascending: false })
        .limit(5);
      return (data || []) as Array<{
        id: string;
        tipo: string;
        severidade: string;
        titulo: string;
        descricao: string;
        project_id: string | null;
      }>;
    },
  });

  // 2. Overdue receivables count
  const { data: overdueCount = 0, isLoading: loadingOverdue } = useQuery({
    queryKey: ["proactive-overdue"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("contract_payments")
        .select("id", { count: "exact", head: true })
        .lt("expected_date", today)
        .neq("status", "recebido");
      return count || 0;
    },
  });

  const isLoading = loadingAnomalies || loadingOverdue;

  if (isLoading) {
    return (
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-md bg-amber-50">
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </div>
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-4 w-12 rounded bg-muted animate-pulse" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                <div className="h-4 w-4 rounded bg-muted animate-pulse mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
                </div>
                <div className="h-4 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAlerts = anomalies.length + (overdueCount > 0 ? 1 : 0);

  return (
    <Card className="shadow-sm border-slate-100">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-amber-50">
            <Lightbulb className="h-4 w-4 text-amber-600" />
          </div>
          <h3 className="font-semibold text-base text-slate-800">Insights & Riscos</h3>
          <Badge variant="secondary" className="text-[10px]">{anomalies.length} alertas</Badge>
        </div>

        <div className="space-y-3">
          {anomalies.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <SeverityIcon severidade={a.severidade} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.titulo}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.descricao}</p>
              </div>
              <Badge variant={severidadeBadge[a.severidade] ?? "outline"}>{a.severidade}</Badge>
            </div>
          ))}

          {overdueCount > 0 && (
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-red-50">
              <Clock className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">{overdueCount} parcelas vencidas</p>
                <p className="text-xs text-red-600">Acesse Recebíveis para detalhes</p>
              </div>
            </div>
          )}

          {totalAlerts === 0 && (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
