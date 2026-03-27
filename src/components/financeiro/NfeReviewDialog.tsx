import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { ExternalLink, Bot, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDate } from "@/lib/formatters";
import type { NfeInboxItem } from "@/hooks/useNfeInbox";

interface NfeReviewDialogProps {
  item: NfeInboxItem | null;
  open: boolean;
  onClose: () => void;
  onProcessed: () => void;
}

export function NfeReviewDialog({ item, open, onClose, onProcessed }: NfeReviewDialogProps) {
  const [projectId, setProjectId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [categoriaCodigo, setCategoriaCodigo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  // Projects query
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-nfe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, bank_account_id")
        .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; bank_account_id: string | null }[];
    },
    enabled: open,
  });

  // Bank accounts query
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-for-nfe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("id, banco, conta, descricao")
        .eq("ativo", true)
        .order("banco");
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  // Categories query (only CV and ADM — expenses)
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-for-nfe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories" as any)
        .select("id, nome, codigo, prefixo")
        .eq("ativo", true)
        .eq("e_receita", false)
        .order("prefixo")
        .order("nome");
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  // Pre-fill category when item changes
  if (item && !categoriaCodigo && item.categoria_sugerida) {
    setCategoriaCodigo(item.categoria_sugerida);
  }

  // Auto-fill bank account when project is selected
  const handleProjectChange = (pid: string) => {
    setProjectId(pid);
    const proj = projects.find((p) => p.id === pid);
    if (proj?.bank_account_id) {
      setBankAccountId(proj.bank_account_id);
    }
  };

  const handleApprove = async () => {
    if (!projectId) { toast.error("Selecione uma obra"); return; }
    if (!categoriaCodigo) { toast.error("Selecione uma categoria"); return; }
    if (!bankAccountId) { toast.error("Selecione uma conta bancaria"); return; }
    if (!item) return;

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("approve-nfe", {
        body: {
          nfe_inbox_id: item.id,
          project_id: projectId,
          bank_account_id: bankAccountId,
          categoria_codigo: categoriaCodigo,
          observacoes,
        },
      });

      if (error) throw error;
      toast.success("NF-e aprovada e lancamento criado!");
      resetForm();
      onProcessed();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao aprovar: " + (err.message ?? "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await (supabase.from("nfe_inbox" as any) as any)
        .update({ status: "rejeitado", observacao: observacoes || "Rejeitada pelo usuario" })
        .eq("id", item.id);
      toast.success("NF-e rejeitada");
      resetForm();
      onProcessed();
      onClose();
    } catch {
      toast.error("Erro ao rejeitar");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setProjectId("");
    setBankAccountId("");
    setCategoriaCodigo("");
    setObservacoes("");
  };

  if (!item) return null;

  const itens = (item.itens_json ?? []) as Array<{ xProd: string; vProd: number; NCM: string }>;
  const confiancaPct = item.ai_confianca ? Math.round(item.ai_confianca * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar NF-e</DialogTitle>
        </DialogHeader>

        {/* Readonly NF-e data */}
        <Card className="bg-muted/40">
          <CardContent className="pt-4 pb-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Fornecedor</p>
              <p className="font-medium">{item.razao_social || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">CNPJ</p>
              <p className="font-mono text-xs">{item.cnpj || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">N Nota</p>
              <p className="font-medium">{item.numero_nota || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Valor Total</p>
              <p className="font-semibold text-red-600">{item.valor_total ? formatBRL(item.valor_total) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Data Emissao</p>
              <p>{item.data_emissao ? formatDate(item.data_emissao) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Origem</p>
              <p>{item.origem === "email" ? "Email" : "Upload manual"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Chave NF-e</p>
              <p className="font-mono text-[10px] break-all">{item.chave_nfe || "—"}</p>
            </div>
            <div>
              <a
                href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/nfe-attachments/${item.arquivo_path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-xs flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Ver arquivo original
              </a>
            </div>
          </CardContent>
        </Card>

        {/* AI suggestion */}
        {item.categoria_sugerida && (
          <div className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-blue-500" />
            <span>Sugestao IA:</span>
            <Badge variant="secondary">{item.categoria_sugerida}</Badge>
            <span className="text-muted-foreground">({confiancaPct}% confianca)</span>
            {item.ai_justificativa && (
              <span className="text-muted-foreground text-xs">— {item.ai_justificativa}</span>
            )}
          </div>
        )}

        {/* Items table */}
        {itens.length > 0 && (
          <div className="border rounded-lg max-h-40 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{it.xProd}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.NCM}</TableCell>
                    <TableCell className="text-right text-sm">{formatBRL(it.vProd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Obra *</Label>
              <Select value={projectId} onValueChange={handleProjectChange}>
                <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Conta Bancaria *</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.banco} - {a.conta}{a.descricao ? ` (${a.descricao})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select value={categoriaCodigo} onValueChange={setCategoriaCodigo}>
              <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => (
                  <SelectItem key={c.codigo} value={c.codigo}>[{c.prefixo}] {c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="destructive" size="sm" onClick={handleReject} disabled={saving}>
            <XCircle className="h-4 w-4 mr-1" /> Rejeitar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleApprove} disabled={saving}>
              {saving ? "Processando..." : "Aprovar e Lancar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
