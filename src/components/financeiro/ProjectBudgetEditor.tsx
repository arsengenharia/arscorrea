import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { formatBRL } from "@/lib/formatters";
import { Save, Loader2 } from "lucide-react";

interface Category {
  id: string;
  nome: string;
  prefixo: string;
  cor_hex: string;
}

interface BudgetRow {
  category_id: string;
  nome: string;
  prefixo: string;
  cor_hex: string;
  valor_previsto: string; // string for controlled input
  realizado: number;
}

interface ProjectBudgetEditorProps {
  projectId: string;
}

export function ProjectBudgetEditor({ projectId }: ProjectBudgetEditorProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<BudgetRow[]>([]);

  // Fetch cost categories
  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["financial-categories-cost"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories")
        .select("id, nome, prefixo, cor_hex")
        .eq("e_receita", false)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch existing budgets for this project
  const { data: budgets = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ["project-budgets", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_budgets" as any)
        .select("category_id, valor_previsto")
        .eq("project_id", projectId);
      if (error) throw error;
      return data as { category_id: string; valor_previsto: number }[];
    },
    enabled: !!projectId,
  });

  // Fetch actual costs per category for this project
  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["project-entries-categories", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select("category_id, valor")
        .eq("project_id", projectId)
        .lt("valor", 0);
      if (error) throw error;
      return data as { category_id: string; valor: number }[];
    },
    enabled: !!projectId,
  });

  // Build rows when data arrives
  useEffect(() => {
    if (categories.length === 0) return;

    // Aggregate realizado per category
    const realizadoMap: Record<string, number> = {};
    entries.forEach((e) => {
      realizadoMap[e.category_id] = (realizadoMap[e.category_id] ?? 0) + Math.abs(e.valor);
    });

    // Build budget map
    const budgetMap: Record<string, number> = {};
    budgets.forEach((b) => {
      budgetMap[b.category_id] = b.valor_previsto;
    });

    setRows(
      categories.map((cat) => ({
        category_id: cat.id,
        nome: cat.nome,
        prefixo: cat.prefixo,
        cor_hex: cat.cor_hex,
        valor_previsto:
          budgetMap[cat.id] !== undefined ? String(budgetMap[cat.id]) : "",
        realizado: realizadoMap[cat.id] ?? 0,
      }))
    );
  }, [categories, budgets, entries]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Build upsert payload — only rows with a value
      const toUpsert = rows
        .filter((r) => r.valor_previsto !== "" && !isNaN(Number(r.valor_previsto)))
        .map((r) => ({
          project_id: projectId,
          category_id: r.category_id,
          valor_previsto: Number(r.valor_previsto),
        }));

      // Delete rows that were cleared
      const clearedIds = rows
        .filter((r) => r.valor_previsto === "" || isNaN(Number(r.valor_previsto)))
        .map((r) => r.category_id);

      if (clearedIds.length > 0) {
        const { error: delError } = await supabase
          .from("project_budgets" as any)
          .delete()
          .eq("project_id", projectId)
          .in("category_id", clearedIds);
        if (delError) throw delError;
      }

      if (toUpsert.length > 0) {
        const { error } = await supabase
          .from("project_budgets" as any)
          .upsert(toUpsert, { onConflict: "project_id,category_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Orçamento por categoria salvo!");
      queryClient.invalidateQueries({ queryKey: ["project-budgets", projectId] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao salvar orçamento: " + err.message);
    },
  });

  const isLoading = loadingCats || loadingBudgets || loadingEntries;

  const handleChange = (categoryId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.category_id === categoryId ? { ...r, valor_previsto: value } : r))
    );
  };

  // Totals
  const totalOrcamento = rows.reduce((acc, r) => {
    const v = parseFloat(r.valor_previsto);
    return acc + (isNaN(v) ? 0 : v);
  }, 0);
  const totalRealizado = rows.reduce((acc, r) => acc + r.realizado, 0);
  const totalDiferenca = totalOrcamento - totalRealizado;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando orçamento...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Orçamento por Categoria</CardTitle>
        <p className="text-sm text-muted-foreground">
          Defina o valor previsto por categoria de custo. O IEC por categoria indica quanto do orçamento já foi consumido.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="w-48">Orçamento Previsto (R$)</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead className="text-right w-24">IEC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const orcamento = parseFloat(row.valor_previsto);
              const hasOrcamento = !isNaN(orcamento) && orcamento > 0;
              const diferenca = hasOrcamento ? orcamento - row.realizado : null;
              const iec = hasOrcamento ? row.realizado / orcamento : null;
              const iecColor =
                iec === null
                  ? "text-muted-foreground"
                  : iec > 1
                  ? "text-red-600 font-semibold"
                  : iec > 0.9
                  ? "text-orange-500"
                  : "text-green-600";

              return (
                <TableRow key={row.category_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: row.cor_hex }}
                      />
                      <span className="font-medium text-sm">{row.nome}</span>
                      <span className="text-xs text-muted-foreground">{row.prefixo}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={row.valor_previsto}
                      onChange={(e) => handleChange(row.category_id, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-red-600">
                    {row.realizado > 0 ? formatBRL(row.realizado) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {diferenca !== null ? (
                      <span className={diferenca >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatBRL(diferenca)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${iecColor}`}>
                    {iec !== null ? iec.toFixed(2) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Totals row */}
            {rows.length > 0 && (
              <TableRow className="border-t-2 font-semibold bg-muted/30">
                <TableCell className="text-sm">Total</TableCell>
                <TableCell className="font-mono text-sm text-right pr-4">
                  {totalOrcamento > 0 ? formatBRL(totalOrcamento) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-red-600">
                  {totalRealizado > 0 ? formatBRL(totalRealizado) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {totalOrcamento > 0 ? (
                    <span className={totalDiferenca >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatBRL(totalDiferenca)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {totalOrcamento > 0 ? (
                    <span
                      className={
                        totalRealizado / totalOrcamento > 1
                          ? "text-red-600"
                          : totalRealizado / totalOrcamento > 0.9
                          ? "text-orange-500"
                          : "text-green-600"
                      }
                    >
                      {(totalRealizado / totalOrcamento).toFixed(2)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Orçamento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
