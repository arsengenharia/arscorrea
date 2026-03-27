import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Paperclip, ChevronDown, ChevronRight, Package } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
import { LancamentoForm } from "@/components/financeiro/LancamentoForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL, formatDate } from "@/lib/formatters";

const situacaoBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "secondary",
  conciliado: "default",
  divergente: "destructive",
};

const situacaoLabel: Record<string, string> = {
  pendente: "Pendente",
  conciliado: "Conciliado",
  divergente: "Divergente",
};

export default function LancamentosGlobal() {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [filterProject, setFilterProject] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // NF-e items for expanded rows
  const { data: nfeItems = [] } = useQuery({
    queryKey: ["nfe-items-for-entries", [...expandedRows]],
    queryFn: async () => {
      if (expandedRows.size === 0) return [];
      const ids = [...expandedRows];
      const { data, error } = await supabase
        .from("nfe_items" as any)
        .select("*, catalog:item_catalog(nome_padrao, categoria, unidade_padrao)")
        .in("financial_entry_id", ids)
        .order("valor_total", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: expandedRows.size > 0,
  });

  // All entries query
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["all-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select(
          "*, project:projects(name), category:financial_categories(nome, prefixo, cor_hex), supplier:suppliers(trade_name), chave_nfe, arquivo_url"
        )
        .order("data", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  // Projects for filter dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  // Categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ["financial-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories" as any)
        .select("id, nome, prefixo")
        .eq("ativo", true)
        .order("prefixo")
        .order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  // Client-side filtering
  const filtered = entries.filter((e) => {
    if (filterProject !== "all" && e.project_id !== filterProject) return false;
    if (filterCategory !== "all" && e.category_id !== filterCategory) return false;
    return true;
  });

  const handleEdit = (entry: any) => {
    setEditing(entry);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from("project_financial_entries" as any)
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      if (deleteTarget.project_id) {
        await supabase.rpc("calc_project_balance", {
          p_project_id: deleteTarget.project_id,
        });
      }

      toast.success("Lançamento excluído");
      queryClient.invalidateQueries({ queryKey: ["all-entries"] });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir lançamento");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />

        {/* Header row */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Lançamentos</h3>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todas as obras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  [{cat.prefixo}] {cat.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Tipo Doc</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum lançamento encontrado
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((entry) => {
                const cat = entry.category;
                const isPositive = entry.valor >= 0;
                const isExpanded = expandedRows.has(entry.id);
                const hasItems = !!entry.chave_nfe;
                const entryItems = nfeItems.filter((i: any) => i.financial_entry_id === entry.id);
                return (
                  <>
                  <TableRow key={entry.id} className={hasItems ? "cursor-pointer" : ""} onClick={() => hasItems && toggleRow(entry.id)}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {hasItems && (
                          isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                        {formatDate(entry.data)}
                        {entry.arquivo_url && !entry.chave_nfe && (
                          <a
                            href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/lancamentos/${entry.arquivo_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver comprovante"
                          >
                            <Paperclip className="h-3 w-3 text-muted-foreground hover:text-primary" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate" title={entry.project?.name}>
                      {entry.project?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {cat ? (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat.cor_hex ?? "#94a3b8" }}
                          />
                          <span className="text-sm">
                            [{cat.prefixo}] {cat.nome}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[130px] truncate" title={entry.supplier?.trade_name}>
                      {entry.supplier?.trade_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {entry.tipo_documento}
                      {entry.chave_nfe && (
                        entry.arquivo_url ? (
                          <a
                            href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/nfe-attachments/${entry.arquivo_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 inline-flex"
                            title={`NF-e: ${entry.chave_nfe}`}
                          >
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">
                              NF-e
                            </Badge>
                          </a>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 ml-1">
                            NF-e
                          </Badge>
                        )
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono whitespace-nowrap ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatBRL(entry.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={situacaoBadgeVariant[entry.situacao] ?? "outline"}>
                        {situacaoLabel[entry.situacao] ?? entry.situacao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(entry)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(entry)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Expanded items row */}
                  {isExpanded && (
                    <TableRow key={`${entry.id}-items`}>
                      <TableCell colSpan={8} className="bg-slate-50/80 p-0">
                        <div className="px-6 py-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                              Itens da NF-e ({entryItems.length})
                            </span>
                          </div>
                          {entryItems.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">Nenhum item registrado para este lançamento.</p>
                          ) : (
                            <div className="rounded border bg-white">
                              <Table>
                                <TableHeader>
                                  <TableRow className="text-[11px]">
                                    <TableHead className="py-1.5 h-auto">Descrição Original</TableHead>
                                    <TableHead className="py-1.5 h-auto">Nome Padronizado</TableHead>
                                    <TableHead className="py-1.5 h-auto">NCM</TableHead>
                                    <TableHead className="py-1.5 h-auto">Categoria</TableHead>
                                    <TableHead className="py-1.5 h-auto text-right">Qtd</TableHead>
                                    <TableHead className="py-1.5 h-auto text-right">Vlr Unit</TableHead>
                                    <TableHead className="py-1.5 h-auto text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {entryItems.map((item: any) => (
                                    <TableRow key={item.id} className="text-xs">
                                      <TableCell className="py-1.5">{item.descricao_original}</TableCell>
                                      <TableCell className="py-1.5 text-blue-700 font-medium">
                                        {item.nome_padronizado || item.catalog?.nome_padrao || "—"}
                                      </TableCell>
                                      <TableCell className="py-1.5">
                                        {item.ncm ? (
                                          <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
                                            {item.ncm.replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3")}
                                          </Badge>
                                        ) : "—"}
                                      </TableCell>
                                      <TableCell className="py-1.5 text-muted-foreground">
                                        {item.categoria_item || item.catalog?.categoria || "—"}
                                      </TableCell>
                                      <TableCell className="py-1.5 text-right">{item.quantidade || 1}</TableCell>
                                      <TableCell className="py-1.5 text-right">
                                        {item.valor_unitario ? formatBRL(Number(item.valor_unitario)) : "—"}
                                      </TableCell>
                                      <TableCell className="py-1.5 text-right font-medium">
                                        {formatBRL(Number(item.valor_total))}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* LancamentoForm — no projectId when creating new */}
        <LancamentoForm
          open={formOpen}
          onOpenChange={setFormOpen}
          projectId={editing?.project_id}
          entry={editing}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["all-entries"] })}
        />

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
