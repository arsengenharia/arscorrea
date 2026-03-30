import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { ExternalLink, Bot, XCircle, UserPlus, CheckCircle } from "lucide-react";
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

  // Duplicate detection query
  const { data: potentialDuplicates = [] } = useQuery({
    queryKey: ["nfe-duplicates", item?.supplier_id, item?.valor_total],
    queryFn: async () => {
      if (!item?.supplier_id || !item?.valor_total) return [];
      const tolerance = Number(item.valor_total) * 0.05; // 5% tolerance
      const { data } = await supabase
        .from("project_financial_entries" as any)
        .select("id, data, valor, tipo_documento, project:projects(name)")
        .eq("supplier_id", item.supplier_id)
        .gte("valor", -(Number(item.valor_total) + tolerance))
        .lte("valor", -(Number(item.valor_total) - tolerance))
        .order("data", { ascending: false })
        .limit(5);
      return data as any[] || [];
    },
    enabled: open && !!item?.supplier_id && !!item?.valor_total,
  });

  // Check if supplier exists
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({ trade_name: "", document: "", phone: "", email: "", chave_pix: "" });
  const queryClient = useQueryClient();

  const { data: existingSupplier } = useQuery({
    queryKey: ["nfe-supplier-check", item?.cnpj],
    queryFn: async () => {
      if (!item?.cnpj) return null;
      const cleanCnpj = item.cnpj.replace(/\D/g, "");
      if (cleanCnpj.length < 11) return null;
      const { data } = await supabase
        .from("suppliers")
        .select("id, trade_name, document, phone, email, chave_pix, tipo")
        .eq("document", cleanCnpj)
        .maybeSingle();
      return data;
    },
    enabled: open && !!item?.cnpj,
  });

  const supplierStatus = !item?.cnpj ? "no_cnpj" : existingSupplier ? "exists" : "not_found";

  // Pre-fill supplier form with NF-e data
  if (item && supplierStatus === "not_found" && !supplierFormData.trade_name && item.razao_social) {
    setSupplierFormData({
      trade_name: item.razao_social || "",
      document: item.cnpj?.replace(/\D/g, "") || "",
      phone: "",
      email: "",
      chave_pix: "",
    });
  }

  const handleCreateSupplier = async () => {
    if (!supplierFormData.trade_name.trim()) { toast.error("Nome é obrigatório"); return; }
    try {
      const { error } = await supabase.from("suppliers").insert({
        trade_name: supplierFormData.trade_name,
        legal_name: supplierFormData.trade_name,
        document: supplierFormData.document || null,
        phone: supplierFormData.phone || null,
        email: supplierFormData.email || null,
        chave_pix: supplierFormData.chave_pix || null,
        tipo: "Juridica",
        ativo: true,
      } as any);
      if (error) throw error;

      // Update nfe_inbox with new supplier_id
      const { data: newSup } = await supabase
        .from("suppliers")
        .select("id")
        .eq("document", supplierFormData.document)
        .single();
      if (newSup) {
        await supabase.from("nfe_inbox" as any).update({ supplier_id: newSup.id }).eq("id", item!.id);
      }

      toast.success("Fornecedor cadastrado!");
      setShowSupplierForm(false);
      queryClient.invalidateQueries({ queryKey: ["nfe-supplier-check"] });
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    }
  };

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
    setShowSupplierForm(false);
    setSupplierFormData({ trade_name: "", document: "", phone: "", email: "", chave_pix: "" });
  };

  if (!item) return null;

  const itens = (item.itens_json ?? []) as Array<{ xProd: string; vProd: number; NCM: string; qCom?: number; uCom?: string; vUnCom?: number; nome_padronizado?: string; categoria_item?: string }>;
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
              <div className="flex items-center gap-1.5">
                <p className="font-medium">{item.razao_social || "—"}</p>
                {supplierStatus === "exists" && (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" title="Cadastrado no sistema" />
                )}
                {supplierStatus === "not_found" && (
                  <Badge className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0 cursor-pointer" onClick={() => setShowSupplierForm(true)}>
                    Novo
                  </Badge>
                )}
              </div>
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
          <div className="border rounded-lg max-h-48 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it: any, i: number) => {
                  // Try to find catalog match for display
                  const ncmDisplay = it.NCM ? it.NCM.replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3") : "—";
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-sm">
                        <div>{it.xProd}</div>
                        {it.nome_padronizado && (
                          <div className="text-xs text-muted-foreground">→ {it.nome_padronizado}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">{ncmDisplay}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{it.categoria_item || "—"}</TableCell>
                      <TableCell className="text-right text-sm">{it.qCom || 1}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatBRL(it.vProd)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Duplicate detection warning */}
        {potentialDuplicates.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-1">
              ⚠️ Possível duplicata — {potentialDuplicates.length} lançamento(s) similar(es) encontrado(s):
            </p>
            {potentialDuplicates.map((d: any) => (
              <p key={d.id} className="text-xs text-amber-700">
                • {formatBRL(Math.abs(Number(d.valor)))} em {formatDate(d.data)} — {d.project?.name || "—"} ({d.tipo_documento})
              </p>
            ))}
            <p className="text-xs text-amber-600 mt-1">Verifique se esta NF-e já foi lançada manualmente.</p>
          </div>
        )}

        {/* Supplier registration prompt */}
        {supplierStatus === "not_found" && !showSupplierForm && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">Fornecedor não cadastrado</p>
                <p className="text-xs text-amber-700">"{item.razao_social}" (CNPJ: {item.cnpj}) não existe no sistema.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowSupplierForm(true)}>
              Cadastrar
            </Button>
          </div>
        )}

        {supplierStatus === "exists" && existingSupplier && (
          <div className="p-2 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2 text-xs">
            <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
            <span className="text-green-800">Fornecedor cadastrado: <strong>{existingSupplier.trade_name}</strong></span>
            {existingSupplier.phone && <span className="text-green-600">· {existingSupplier.phone}</span>}
          </div>
        )}

        {/* Inline supplier registration form */}
        {showSupplierForm && (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="pt-4 pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" /> Cadastrar Fornecedor
                </p>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowSupplierForm(false)}>Cancelar</Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome Fantasia *</Label>
                  <Input className="h-8 text-sm" value={supplierFormData.trade_name}
                    onChange={e => setSupplierFormData(p => ({ ...p, trade_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CNPJ</Label>
                  <Input className="h-8 text-sm font-mono" value={supplierFormData.document} disabled />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Telefone</Label>
                  <Input className="h-8 text-sm" placeholder="(31) 9999-0000" value={supplierFormData.phone}
                    onChange={e => setSupplierFormData(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input className="h-8 text-sm" placeholder="email@fornecedor.com" value={supplierFormData.email}
                    onChange={e => setSupplierFormData(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Chave Pix</Label>
                  <Input className="h-8 text-sm" placeholder="CPF, CNPJ, email" value={supplierFormData.chave_pix}
                    onChange={e => setSupplierFormData(p => ({ ...p, chave_pix: e.target.value }))} />
                </div>
              </div>
              <Button size="sm" onClick={handleCreateSupplier}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Cadastrar e Vincular
              </Button>
            </CardContent>
          </Card>
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
