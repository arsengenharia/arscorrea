import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowRight, Check, Clock } from "lucide-react";
import { toast } from "sonner";

interface Risk {
  risk_type: string;
  severidade: string;
  project_id: string | null;
  project_name: string;
  descricao: string;
  age_hours: number;
  action_type: string;
  action_target: string;
  metadata: any;
}

const SEVERITY_ORDER: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
const SEVERITY_COLORS: Record<string, string> = {
  critica: "bg-red-100 text-red-800 border-red-200",
  alta: "bg-amber-100 text-amber-800 border-amber-200",
  media: "bg-yellow-100 text-yellow-800 border-yellow-200",
  baixa: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatAge(hours: number): string {
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
}

export function RiscosOperacionais() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["insights-risks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_insights_risks" as any)
        .select("*");
      if (error) throw error;
      return (data as unknown as Risk[]).sort((a, b) => {
        const sA = SEVERITY_ORDER[a.severidade] ?? 9;
        const sB = SEVERITY_ORDER[b.severidade] ?? 9;
        if (sA !== sB) return sA - sB;
        return b.age_hours - a.age_hours;
      });
    },
  });

  const criticos = risks.filter((r) => r.severidade === "critica").length;

  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryValue, setCategoryValue] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["financial-categories-active"],
    queryFn: async () => {
      const { data } = await supabase.from("financial_categories" as any).select("id, nome, prefixo").eq("ativo", true).order("prefixo").order("nome");
      return data ?? [];
    },
    enabled: !!editingCategory,
  });

  async function handleSetBudget(projectId: string) {
    const val = parseFloat(budgetValue);
    if (!val || val <= 0) { toast.error("Informe um valor valido"); return; }
    const { error } = await supabase.from("projects").update({ orcamento_previsto: val }).eq("id", projectId);
    if (error) { toast.error("Erro: " + error.message); return; }
    await supabase.rpc("calc_project_balance", { p_project_id: projectId });
    toast.success("Orcamento definido!");
    setEditingBudget(null);
    setBudgetValue("");
    queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
  }

  async function handleSetCategory(supplierId: string) {
    if (!categoryValue) { toast.error("Selecione uma categoria"); return; }
    const { error } = await supabase.from("suppliers").update({ categoria_padrao_id: categoryValue } as any).eq("id", supplierId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Categoria atribuida!");
    setEditingCategory(null);
    setCategoryValue("");
    queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
  }

  async function handleMarkPaid(paymentId: string) {
    const { error } = await supabase.from("contract_payments" as any).update({ status: "pago" }).eq("id", paymentId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Parcela marcada como recebida!");
    queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground text-center py-8">Carregando riscos...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h3 className="font-semibold text-base">Riscos Operacionais</h3>
        </div>
        <div className="flex items-center gap-2">
          {criticos > 0 && (
            <Badge variant="destructive" className="text-xs">{criticos} critico{criticos > 1 ? "s" : ""}</Badge>
          )}
          <Badge variant="outline" className="text-xs">{risks.length} ativo{risks.length !== 1 ? "s" : ""}</Badge>
        </div>
      </div>

      {risks.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum risco ativo. Tudo em dia!
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {risks.map((risk, i) => (
            <Card key={i} className="border-l-4" style={{ borderLeftColor: risk.severidade === "critica" ? "#ef4444" : risk.severidade === "alta" ? "#f59e0b" : risk.severidade === "media" ? "#eab308" : "#94a3b8" }}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_COLORS[risk.severidade] || ""}`}>
                        {risk.severidade}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatAge(risk.age_hours)}
                      </span>
                    </div>
                    <p className="text-sm">{risk.descricao}</p>

                    {risk.action_target === "definir_orcamento" && editingBudget === risk.metadata?.project_id && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input type="number" step="0.01" placeholder="R$ 0,00" value={budgetValue} onChange={(e) => setBudgetValue(e.target.value)} className="h-8 w-40 text-sm" />
                        <Button size="sm" className="h-8" onClick={() => handleSetBudget(risk.metadata.project_id)}>
                          <Check className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                      </div>
                    )}

                    {risk.action_target === "atribuir_categoria" && editingCategory === risk.metadata?.supplier_id && (
                      <div className="flex items-center gap-2 mt-2">
                        <Select value={categoryValue} onValueChange={setCategoryValue}>
                          <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Categoria..." /></SelectTrigger>
                          <SelectContent>
                            {categories.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{c.prefixo} {c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8" onClick={() => handleSetCategory(risk.metadata.supplier_id)}>
                          <Check className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {risk.action_type === "navigate" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(risk.action_target)}>
                        Resolver <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                    {risk.action_target === "definir_orcamento" && editingBudget !== risk.metadata?.project_id && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditingBudget(risk.metadata.project_id)}>
                        Definir
                      </Button>
                    )}
                    {risk.action_target === "atribuir_categoria" && editingCategory !== risk.metadata?.supplier_id && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditingCategory(risk.metadata.supplier_id)}>
                        Atribuir
                      </Button>
                    )}
                    {risk.action_target === "marcar_recebido" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleMarkPaid(risk.metadata.payment_id)}>
                        <Check className="h-3 w-3 mr-1" /> Recebido
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
