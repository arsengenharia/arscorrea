import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Split } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDate } from "@/lib/formatters";
import { FinanceiroTabs } from "./Financeiro";
import { StatusBadge } from "@/components/ui/status-badge";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdmEntry {
  id: string;
  data: string;
  observacoes: string | null;
  valor: number;
  category: { nome: string; prefixo: string } | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  orcamento_previsto: number | null;
}

interface AllocationRow {
  id: string;
  data_rateio: string;
  percentual: number;
  valor_alocado: number;
  project: { name: string } | null;
  entry: { data: string; observacoes: string | null; valor: number } | null;
}

type Method = "manual" | "proporcional" | "igualitario";

// ─── Allocation Dialog ───────────────────────────────────────────────────────

interface ProjectAlloc {
  selected: boolean;
  percentual: string; // string for input control
}

function AllocationDialog({
  entry,
  open,
  onClose,
}: {
  entry: AdmEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<Method>("igualitario");
  const [allocs, setAllocs] = useState<Record<string, ProjectAlloc>>({});
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["active-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, orcamento_previsto")
        .in("status", ["pendente", "em andamento", "iniciado", "em_andamento"])
        .order("name");
      if (error) throw error;
      return data as Project[];
    },
    enabled: open,
  });

  // Initialize allocs when projects load
  useEffect(() => {
    if (projects.length > 0 && Object.keys(allocs).length === 0) {
      const init: Record<string, ProjectAlloc> = {};
      projects.forEach((p) => {
        init[p.id] = { selected: true, percentual: "" };
      });
      setAllocs(init);
    }
  }, [projects]);

  const selectedProjects = projects.filter(
    (p) => allocs[p.id]?.selected
  );

  // Auto-compute percentuals for non-manual methods
  const computedAllocs = (() => {
    const result: Record<string, { percentual: number; valor: number }> = {};
    if (!entry) return result;

    if (method === "igualitario") {
      const n = selectedProjects.length;
      selectedProjects.forEach((p) => {
        const pct = n > 0 ? 100 / n : 0;
        result[p.id] = {
          percentual: pct,
          valor: entry.valor * (pct / 100),
        };
      });
    } else if (method === "proporcional") {
      const totalOrcamento = selectedProjects.reduce(
        (sum, p) => sum + (p.orcamento_previsto ?? 0),
        0
      );
      selectedProjects.forEach((p) => {
        const pct =
          totalOrcamento > 0
            ? ((p.orcamento_previsto ?? 0) / totalOrcamento) * 100
            : 0;
        result[p.id] = {
          percentual: pct,
          valor: entry.valor * (pct / 100),
        };
      });
    } else {
      // manual
      projects.forEach((p) => {
        if (allocs[p.id]?.selected) {
          const pct = parseFloat(allocs[p.id]?.percentual || "0") || 0;
          result[p.id] = {
            percentual: pct,
            valor: entry ? entry.valor * (pct / 100) : 0,
          };
        }
      });
    }
    return result;
  })();

  const totalPct = Object.values(computedAllocs).reduce(
    (sum, a) => sum + a.percentual,
    0
  );
  const totalValor = Object.values(computedAllocs).reduce(
    (sum, a) => sum + a.valor,
    0
  );

  function toggleProject(id: string) {
    setAllocs((prev) => {
      const base = prev[id] ?? { selected: true, percentual: "" };
      return { ...prev, [id]: { ...base, selected: !base.selected } };
    });
  }

  function setPercent(id: string, value: string) {
    setAllocs((prev) => {
      const base = prev[id] ?? { selected: true, percentual: "" };
      return { ...prev, [id]: { ...base, percentual: value } };
    });
  }

  function initAllocs() {
    const init: Record<string, ProjectAlloc> = {};
    projects.forEach((p) => {
      init[p.id] = { selected: true, percentual: "" };
    });
    setAllocs(init);
    setMethod("igualitario");
  }

  async function handleConfirm() {
    if (!entry) return;
    const pctDiff = Math.abs(totalPct - 100);
    if (selectedProjects.length === 0) {
      toast.error("Selecione ao menos um projeto.");
      return;
    }
    if (pctDiff > 0.1) {
      toast.error(`Total de percentuais deve ser 100% (atual: ${totalPct.toFixed(2)}%).`);
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const rows = selectedProjects.map((p) => ({
        lancamento_id: entry.id,
        project_id: p.id,
        percentual: computedAllocs[p.id]?.percentual ?? 0,
        valor_alocado: computedAllocs[p.id]?.valor ?? 0,
        data_rateio: today,
      }));

      const { error } = await (supabase.from("cost_allocations" as any) as any).insert(rows);
      if (error) throw error;

      // Recalculate balance for each project
      await Promise.all(
        selectedProjects.map((p) =>
          supabase.rpc("calc_project_balance", { p_project_id: p.id })
        )
      );

      toast.success("Rateio registrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["adm-entries"] });
      queryClient.invalidateQueries({ queryKey: ["allocation-history"] });
      onClose();
      initAllocs();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar rateio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) { onClose(); initAllocs(); }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ratear Custo Indireto</DialogTitle>
        </DialogHeader>

        {entry && (
          <div className="space-y-5">
            {/* Entry details */}
            <Card>
              <CardContent className="pt-4 pb-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Data</p>
                  <p className="font-medium">{formatDate(entry.data)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Descrição</p>
                  <p className="font-medium">{entry.observacoes || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Valor</p>
                  <p className="font-medium text-red-600">{formatBRL(entry.valor)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Method selector */}
            <div>
              <p className="text-sm font-medium mb-2">Método de Rateio</p>
              <RadioGroup
                value={method}
                onValueChange={(v) => setMethod(v as Method)}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="igualitario" id="m-igualitario" />
                  <Label htmlFor="m-igualitario">Igualitário</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="proporcional" id="m-proporcional" />
                  <Label htmlFor="m-proporcional">Proporcional ao contrato</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="manual" id="m-manual" />
                  <Label htmlFor="m-manual">Manual</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Projects table */}
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Orçamento Previsto</TableHead>
                    <TableHead className="text-right w-28">Percentual</TableHead>
                    <TableHead className="text-right">Valor Alocado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => {
                    const isSelected = allocs[p.id]?.selected ?? true;
                    const computed = computedAllocs[p.id];
                    return (
                      <TableRow key={p.id} className={!isSelected ? "opacity-40" : ""}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProject(p.id)}
                            className="h-4 w-4 accent-primary cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {p.orcamento_previsto != null
                            ? formatBRL(p.orcamento_previsto)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {method === "manual" ? (
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={allocs[p.id]?.percentual ?? ""}
                              onChange={(e) => setPercent(p.id, e.target.value)}
                              disabled={!isSelected}
                              className="h-7 text-right w-24 ml-auto"
                            />
                          ) : (
                            <span>
                              {isSelected && computed
                                ? `${computed.percentual.toFixed(2)}%`
                                : "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {isSelected && computed
                            ? formatBRL(computed.valor)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3} className="text-right text-xs text-muted-foreground uppercase tracking-wide">
                      Total
                    </TableCell>
                    <TableCell
                      className={`text-right ${Math.abs(totalPct - 100) > 0.1 && selectedProjects.length > 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {totalPct.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatBRL(totalValor)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { onClose(); initAllocs(); }}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={saving}>
                {saving ? "Salvando..." : "Confirmar Rateio"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Rateio() {
  const [selectedEntry, setSelectedEntry] = useState<AdmEntry | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: admEntries = [], isLoading: loadingEntries } = useQuery<AdmEntry[]>({
    queryKey: ["adm-entries"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("project_financial_entries" as any) as any)
        .select("*, category:financial_categories(nome, prefixo)")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data as any[]).filter(
        (e: any) => e.category?.prefixo === "ADM"
      ) as AdmEntry[];
    },
  });

  const { data: allocatedIds = [] } = useQuery({
    queryKey: ["allocated-entry-ids"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("cost_allocations" as any) as any)
        .select("lancamento_id");
      if (error) throw error;
      const ids = new Set((data as any[]).map((r: any) => r.lancamento_id));
      return [...ids];
    },
  });
  const allocatedSet = new Set(allocatedIds);

  const [showPendingOnly, setShowPendingOnly] = useState(true);

  const displayedEntries = showPendingOnly
    ? admEntries.filter((e) => !allocatedSet.has(e.id))
    : admEntries;

  const { data: history = [], isLoading: loadingHistory } = useQuery<AllocationRow[]>({
    queryKey: ["allocation-history"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("cost_allocations" as any) as any)
        .select(
          "*, project:projects(name), entry:project_financial_entries(data, observacoes, valor)"
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AllocationRow[];
    },
    enabled: historyOpen,
  });

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />
        <h3 className="text-xl font-semibold">Rateio de Custos Indiretos</h3>

      {/* ADM Entries */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lançamentos ADM para Ratear</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowPendingOnly(!showPendingOnly)}>
              {showPendingOnly ? "Mostrar todos" : "Só pendentes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingEntries && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!loadingEntries && displayedEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {admEntries.length === 0 ? "Nenhum lançamento ADM encontrado." : "Nenhum lançamento ADM pendente de rateio."}
                  </TableCell>
                </TableRow>
              )}
              {displayedEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.data)}</TableCell>
                  <TableCell>{entry.observacoes || "—"}</TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {formatBRL(entry.valor)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={allocatedSet.has(entry.id) ? "rateado" : "pendente"} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <Split className="h-3.5 w-3.5" />
                      Ratear
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Allocation History (collapsible) */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setHistoryOpen((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Histórico de Rateios</CardTitle>
            {historyOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {historyOpen && (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Rateio</TableHead>
                  <TableHead>Lançamento</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Valor Alocado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingHistory && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                )}
                {!loadingHistory && history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum rateio registrado.
                    </TableCell>
                  </TableRow>
                )}
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.data_rateio)}</TableCell>
                    <TableCell>{row.entry?.observacoes || "—"}</TableCell>
                    <TableCell>{row.project?.name || "—"}</TableCell>
                    <TableCell className="text-right">{row.percentual.toFixed(2)}%</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatBRL(row.valor_alocado)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Allocation Dialog */}
      <AllocationDialog
        entry={selectedEntry}
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
      </div>
    </Layout>
  );
}
