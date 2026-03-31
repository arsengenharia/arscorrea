import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronDown } from "lucide-react";

interface AuditEntry {
  id: string;
  table_name: string;
  operation: string;
  new_data: any;
  old_data: any;
  created_at: string;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "agora";
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
}

function describeAction(entry: AuditEntry): string | null {
  const { table_name, operation, new_data, old_data } = entry;

  if (table_name === "nfe_inbox" && operation === "UPDATE" && new_data?.status === "aprovada") {
    return `NF-e ${new_data.numero_nota || ""} aprovada - ${new_data.razao_social || ""}`;
  }
  if (table_name === "project_financial_entries" && operation === "UPDATE" && new_data?.situacao === "conciliado" && old_data?.situacao === "pendente") {
    return `Lancamento conciliado - R$ ${Math.abs(new_data.valor || 0).toLocaleString("pt-BR")}`;
  }
  if (table_name === "cost_allocations" && operation === "INSERT") {
    return `Rateio executado - R$ ${Math.abs(new_data.valor_alocado || 0).toLocaleString("pt-BR")}`;
  }
  if (table_name === "projects" && operation === "UPDATE" && new_data?.orcamento_previsto && !old_data?.orcamento_previsto) {
    return `Orcamento definido - R$ ${Number(new_data.orcamento_previsto).toLocaleString("pt-BR")}`;
  }
  if (table_name === "medicoes" && operation === "INSERT") {
    return `Medicao #${new_data.numero || "?"} criada - ${new_data.percentual_fisico || "?"}%`;
  }
  return null;
}

export function ResolvidosRecentemente() {
  const [expanded, setExpanded] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["insights-resolved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log" as any)
        .select("id, table_name, operation, new_data, old_data, created_at")
        .in("table_name", ["nfe_inbox", "project_financial_entries", "cost_allocations", "projects", "medicoes"])
        .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as AuditEntry[])
        .map((e) => ({ ...e, description: describeAction(e) }))
        .filter((e) => e.description !== null);
    },
  });

  const visible = expanded ? entries : entries.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <h3 className="font-semibold text-base">Resolvidos Hoje</h3>
        <Badge variant="outline" className="text-xs">{entries.length}</Badge>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-4">Carregando...</div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma acao registrada nas ultimas 24h.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="py-2 px-0">
            {visible.map((entry: any, i: number) => (
              <div key={entry.id} className={`flex items-center gap-3 px-4 py-2 ${i > 0 ? "border-t" : ""}`}>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                <span className="text-sm flex-1">{entry.description}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatRelativeTime(entry.created_at)}</span>
              </div>
            ))}
            {entries.length > 5 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-center text-xs text-muted-foreground py-2 hover:text-foreground transition-colors flex items-center justify-center gap-1 border-t"
              >
                {expanded ? "Mostrar menos" : `Ver mais ${entries.length - 5} itens`}
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
