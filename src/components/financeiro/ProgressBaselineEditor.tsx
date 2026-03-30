import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";

interface BaselineRow {
  id?: string;
  mes: string; // YYYY-MM-DD (first of month)
  percentual_previsto: number;
  isNew?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProgressBaselineEditor({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [rows, setRows] = useState<BaselineRow[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-baseline"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, status, start_date, end_date")
        .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
        .order("name");
      return data ?? [];
    },
  });

  const { data: baseline = [], isLoading } = useQuery({
    queryKey: ["progress-baseline", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from("project_progress_baseline" as any)
        .select("*")
        .eq("project_id", selectedProjectId)
        .order("mes");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!selectedProjectId,
  });

  // Sync rows from baseline data
  useEffect(() => {
    if (baseline.length > 0) {
      setRows(baseline.map((b: any) => ({
        id: b.id,
        mes: b.mes,
        percentual_previsto: b.percentual_previsto,
      })));
    } else if (selectedProjectId) {
      // Auto-generate months from project start_date to end_date
      const project = projects.find((p: any) => p.id === selectedProjectId) as any;
      if (project?.start_date && project?.end_date) {
        const generated = generateMonths(project.start_date, project.end_date);
        setRows(generated);
      } else {
        setRows([]);
      }
    }
  }, [baseline, selectedProjectId, projects]);

  function generateMonths(start: string, end: string): BaselineRow[] {
    const result: BaselineRow[] = [];
    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T00:00:00");

    // First of each month
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    const totalMonths = (last.getFullYear() - current.getFullYear()) * 12 + (last.getMonth() - current.getMonth()) + 1;
    let idx = 0;

    while (current <= last) {
      idx++;
      const mesStr = current.toISOString().slice(0, 10);
      // Linear distribution as default
      const pct = Math.round((idx / totalMonths) * 100);
      result.push({
        mes: mesStr,
        percentual_previsto: Math.min(pct, 100),
        isNew: true,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return result;
  }

  function addRow() {
    const lastRow = rows[rows.length - 1];
    const nextMonth = lastRow
      ? new Date(new Date(lastRow.mes + "T00:00:00").setMonth(new Date(lastRow.mes + "T00:00:00").getMonth() + 1)).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    setRows([...rows, { mes: nextMonth, percentual_previsto: 100, isNew: true }]);
  }

  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: "mes" | "percentual_previsto", value: string | number) {
    setRows(rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    if (!selectedProjectId || rows.length === 0) return;
    setSaving(true);

    try {
      // Delete existing baseline for this project
      await supabase
        .from("project_progress_baseline" as any)
        .delete()
        .eq("project_id", selectedProjectId);

      // Insert all rows
      const payload = rows.map((r) => ({
        project_id: selectedProjectId,
        mes: r.mes,
        percentual_previsto: Number(r.percentual_previsto),
      }));

      const { error } = await supabase
        .from("project_progress_baseline" as any)
        .insert(payload as any);

      if (error) throw error;

      // Recalculate project balance (triggers IFEC update)
      await supabase.rpc("calc_project_balance", { p_project_id: selectedProjectId });

      toast.success("Cronograma baseline salvo e IFEC recalculado!");
      queryClient.invalidateQueries({ queryKey: ["progress-baseline"] });
      queryClient.invalidateQueries({ queryKey: ["projects-indicators"] });
      queryClient.invalidateQueries({ queryKey: ["v-ifec-overview"] });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  }

  const formatMonth = (mes: string) => {
    const d = new Date(mes + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cronograma Baseline (Avanço Previsto)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a obra..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProjectId && (
            <>
              <div className="text-xs text-muted-foreground">
                Define o percentual de avanço físico previsto para cada mês. O IFEC compara este planejamento com as medições reais.
              </div>

              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_120px_40px] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                      <span>Mês</span>
                      <span>% Previsto</span>
                      <span></span>
                    </div>
                    {rows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_120px_40px] gap-2 px-3 py-1.5 border-t items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatMonth(row.mes)}</span>
                          {row.isNew && !row.id && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">novo</Badge>
                          )}
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={row.percentual_previsto}
                          onChange={(e) => updateRow(idx, "percentual_previsto", parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeRow(idx)}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Visual progress bar */}
                  {rows.length > 0 && (
                    <div className="flex gap-0.5 h-6 rounded overflow-hidden border">
                      {rows.map((row, idx) => {
                        const prev = idx > 0 ? rows[idx - 1].percentual_previsto : 0;
                        const increment = row.percentual_previsto - prev;
                        return (
                          <div
                            key={idx}
                            className="h-full flex items-center justify-center text-[9px] text-white font-medium"
                            style={{
                              flex: Math.max(increment, 1),
                              backgroundColor: `hsl(${210 + idx * 8}, 60%, ${50 + idx * 2}%)`,
                            }}
                            title={`${formatMonth(row.mes)}: ${row.percentual_previsto}%`}
                          >
                            {increment >= 5 ? `${row.percentual_previsto}%` : ""}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={addRow}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Mês
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving || rows.length === 0}>
                      <Save className="h-3.5 w-3.5 mr-1" />
                      {saving ? "Salvando..." : "Salvar Baseline"}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
