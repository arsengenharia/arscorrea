import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LancamentoForm } from "@/components/financeiro/LancamentoForm";
import { formatBRL, formatDate } from "@/lib/formatters";

interface FinancialEntry {
  id: string;
  data: string;
  valor: number;
  tipo_documento: string;
  situacao: "pendente" | "conciliado" | "divergente";
  is_comprometido: boolean;
  numero_documento: string | null;
  nota_fiscal: string | null;
  observacoes: string | null;
  bank_account_id: string;
  category_id: string;
  supplier_id: string | null;
  chave_nfe: string | null;
  arquivo_url: string | null;
  category: { nome: string; prefixo: string; cor_hex: string } | null;
  supplier: { trade_name: string } | null;
  bank_account: { banco: string; conta: string } | null;
}

export default function Lancamentos() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<FinancialEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["project-entries", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select("*, category:financial_categories(nome, prefixo, cor_hex), supplier:suppliers(trade_name), bank_account:bank_accounts(banco, conta), chave_nfe, arquivo_url")
        .eq("project_id", projectId!)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as unknown as FinancialEntry[];
    },
    enabled: !!projectId,
  });

  const handleDelete = async () => {
    if (!deletingEntry) return;
    try {
      const { error } = await supabase
        .from("project_financial_entries" as any)
        .delete()
        .eq("id", deletingEntry.id);
      if (error) throw error;

      await supabase.rpc("calc_project_balance", { p_project_id: projectId! });

      queryClient.invalidateQueries({ queryKey: ["project-entries", projectId] });
      toast.success("Lançamento excluído!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir lançamento");
    } finally {
      setDeletingEntry(null);
    }
  };

  const situacaoBadge = (situacao: string) => {
    if (situacao === "conciliado") return <Badge className="bg-green-100 text-green-800 border-green-200">Conciliado</Badge>;
    if (situacao === "divergente") return <Badge className="bg-red-100 text-red-800 border-red-200">Divergente</Badge>;
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/obras/${projectId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Lançamentos Financeiros</h2>
          </div>
          <Button onClick={() => { setEditingEntry(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Tipo Doc</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum lançamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.data)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.category?.cor_hex && (
                          <div
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: entry.category.cor_hex }}
                          />
                        )}
                        <span>
                          {entry.category
                            ? `[${entry.category.prefixo}] ${entry.category.nome}`
                            : "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{entry.supplier?.trade_name || "—"}</TableCell>
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
                    <TableCell className="text-right font-mono">
                      <span className={entry.valor >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatBRL(entry.valor)}
                      </span>
                    </TableCell>
                    <TableCell>{situacaoBadge(entry.situacao)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingEntry(entry); setFormOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingEntry(entry)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <LancamentoForm
          open={formOpen}
          onOpenChange={setFormOpen}
          projectId={projectId!}
          entry={editingEntry}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["project-entries", projectId] })}
        />

        <AlertDialog open={!!deletingEntry} onOpenChange={(open) => { if (!open) setDeletingEntry(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
