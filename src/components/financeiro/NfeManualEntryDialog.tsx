import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/formatters";

interface ManualNfeItem {
  key: string;
  descricao: string;
  ncm: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
}

function generateKey() {
  return Math.random().toString(36).slice(2, 10);
}

interface NfeManualEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function NfeManualEntryDialog({ open, onOpenChange, onSaved }: NfeManualEntryDialogProps) {
  // NF-e header fields
  const [numeroNota, setNumeroNota] = useState("");
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split("T")[0]);
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");

  // Items
  const [items, setItems] = useState<ManualNfeItem[]>([
    { key: generateKey(), descricao: "", ncm: "", quantidade: 1, unidade: "un", valor_unitario: 0, valor_total: 0 },
  ]);

  // Approval fields (optional — for direct approval)
  const [projectId, setProjectId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [categoriaCodigo, setCategoriaCodigo] = useState("");

  // Attachment
  const [attachment, setAttachment] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);

  // Queries
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-nfe-manual"],
    queryFn: async () => {
      const { data } = await supabase.from("projects")
        .select("id, name, bank_account_id")
        .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
        .order("name");
      return data as any[] || [];
    },
    enabled: open,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-active"],
    queryFn: async () => {
      const { data } = await supabase.from("bank_accounts" as any)
        .select("id, banco, conta, descricao").eq("ativo", true).order("banco");
      return data as any[] || [];
    },
    enabled: open,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("financial_categories" as any)
        .select("id, nome, codigo, prefixo").eq("ativo", true).eq("e_receita", false).order("prefixo").order("nome");
      return data as any[] || [];
    },
    enabled: open,
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ["item-catalog-all"],
    queryFn: async () => {
      const { data } = await supabase.from("item_catalog" as any)
        .select("ncm, nome_padrao, unidade_padrao, categoria").eq("ativo", true).order("nome_padrao");
      return data as any[] || [];
    },
    enabled: open,
  });

  // Auto-fill bank account from project
  const handleProjectChange = (pid: string) => {
    setProjectId(pid);
    const proj = projects.find((p: any) => p.id === pid);
    if (proj?.bank_account_id) setBankAccountId(proj.bank_account_id);
  };

  // Item operations
  const addItem = () => {
    setItems(prev => [...prev, { key: generateKey(), descricao: "", ncm: "", quantidade: 1, unidade: "un", valor_unitario: 0, valor_total: 0 }]);
  };

  const removeItem = (key: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.key !== key));
  };

  const updateItem = (key: string, field: keyof ManualNfeItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };
      // Auto-calculate valor_total
      if (field === "quantidade" || field === "valor_unitario") {
        updated.valor_total = Number(updated.quantidade) * Number(updated.valor_unitario);
      }
      return updated;
    }));
  };

  // NCM autocomplete
  const handleNcmBlur = (key: string, ncmValue: string) => {
    if (!ncmValue || ncmValue.length < 4) return;
    const match = catalog.find((c: any) => c.ncm === ncmValue);
    if (match) {
      setItems(prev => prev.map(item => {
        if (item.key !== key) return item;
        return {
          ...item,
          descricao: item.descricao || match.nome_padrao,
          unidade: match.unidade_padrao || item.unidade,
        };
      }));
    }
  };

  const grandTotal = items.reduce((s, i) => s + (Number(i.valor_total) || 0), 0);

  const resetForm = () => {
    setNumeroNota(""); setDataEmissao(new Date().toISOString().split("T")[0]);
    setCnpj(""); setRazaoSocial("");
    setItems([{ key: generateKey(), descricao: "", ncm: "", quantidade: 1, unidade: "un", valor_unitario: 0, valor_total: 0 }]);
    setProjectId(""); setBankAccountId(""); setCategoriaCodigo("");
    setAttachment(null);
  };

  const handleSave = async (approveDirectly: boolean) => {
    // Validation
    if (!numeroNota.trim()) { toast.error("Número da nota é obrigatório"); return; }
    if (!cnpj.trim()) { toast.error("CNPJ é obrigatório"); return; }
    if (!razaoSocial.trim()) { toast.error("Razão social é obrigatória"); return; }
    if (items.filter(i => i.descricao.trim()).length === 0) { toast.error("Adicione pelo menos 1 item"); return; }

    if (approveDirectly) {
      if (!projectId) { toast.error("Selecione uma obra para aprovar"); return; }
      if (!bankAccountId) { toast.error("Selecione uma conta bancária"); return; }
      if (!categoriaCodigo) { toast.error("Selecione uma categoria"); return; }
    }

    setSaving(true);
    try {
      // 1. Upload attachment if provided
      let arquivoPath = "manual/sem-arquivo";
      if (attachment) {
        const path = `inbox/${Date.now()}-${attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("nfe-attachments").upload(path, attachment);
        if (!upErr) arquivoPath = path;
      }

      // 2. Build itens_json
      const validItems = items.filter(i => i.descricao.trim());
      const itens_json = validItems.map(i => ({
        xProd: i.descricao,
        NCM: i.ncm || null,
        qCom: i.quantidade,
        uCom: i.unidade,
        vUnCom: i.valor_unitario,
        vProd: i.valor_total,
      }));

      // 3. Find or create supplier
      const cleanCnpj = cnpj.replace(/\D/g, "");
      let supplierId: string | null = null;
      if (cleanCnpj) {
        const { data: existing } = await supabase.from("suppliers")
          .select("id").eq("document", cleanCnpj).maybeSingle();
        if (existing) {
          supplierId = existing.id;
        } else {
          const { data: newSup } = await supabase.from("suppliers")
            .insert({ document: cleanCnpj, trade_name: razaoSocial, legal_name: razaoSocial, tipo: "Juridica", observacoes: "Cadastro automatico via NF-e manual", ativo: true } as any)
            .select("id").single();
          supplierId = newSup?.id || null;
        }
      }

      // 4. Insert into nfe_inbox
      const { data: inbox, error: inboxErr } = await supabase.from("nfe_inbox" as any).insert({
        status: "aguardando_revisao",
        origem: "entrada_manual",
        arquivo_path: arquivoPath,
        arquivo_tipo: attachment?.name?.endsWith(".pdf") ? "pdf" : "xml",
        cnpj: cleanCnpj,
        razao_social: razaoSocial,
        numero_nota: numeroNota,
        data_emissao: dataEmissao,
        valor_total: grandTotal,
        supplier_id: supplierId,
        itens_json,
        categoria_sugerida: categoriaCodigo || null,
      }).select("id").single();

      if (inboxErr) throw inboxErr;

      // 5. If approving directly, call approve-nfe
      if (approveDirectly && inbox) {
        const { error: approveErr } = await supabase.functions.invoke("approve-nfe", {
          body: {
            nfe_inbox_id: inbox.id,
            project_id: projectId,
            bank_account_id: bankAccountId,
            categoria_codigo: categoriaCodigo,
            observacoes: `NF-e ${numeroNota} — ${razaoSocial} (entrada manual)`,
          },
        });

        if (approveErr) {
          // Approval failed but nfe_inbox was created — it will appear in Pendentes
          toast.error("NF-e salva como pendente. Aprovação falhou: " + approveErr.message);
        } else {
          toast.success("NF-e aprovada e lançamento criado!");
        }
      } else {
        toast.success("NF-e salva como pendente para revisão");
      }

      resetForm();
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Digitar NF-e Manualmente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* NF-e Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Nº Nota *</Label>
              <Input value={numeroNota} onChange={e => setNumeroNota(e.target.value)} placeholder="000123" />
            </div>
            <div className="space-y-1">
              <Label>Data Emissão *</Label>
              <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>CNPJ *</Label>
              <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1">
              <Label>Valor Total</Label>
              <Input value={formatBRL(grandTotal)} disabled className="font-mono bg-muted" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Razão Social *</Label>
            <Input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} placeholder="Nome do fornecedor" />
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Itens da NF-e</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Item
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-2">Descrição *</TableHead>
                    <TableHead className="py-2 w-24">NCM</TableHead>
                    <TableHead className="py-2 w-16">Qtd</TableHead>
                    <TableHead className="py-2 w-16">Un</TableHead>
                    <TableHead className="py-2 w-24">Vlr Unit</TableHead>
                    <TableHead className="py-2 w-24">Total</TableHead>
                    <TableHead className="py-2 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell className="py-1.5">
                        <Input
                          value={item.descricao}
                          onChange={e => updateItem(item.key, "descricao", e.target.value)}
                          placeholder="Descrição do produto"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          value={item.ncm}
                          onChange={e => updateItem(item.key, "ncm", e.target.value)}
                          onBlur={e => handleNcmBlur(item.key, e.target.value)}
                          placeholder="25232900"
                          className="h-8 text-sm font-mono"
                          maxLength={8}
                        />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          type="number" min={0} step="0.01"
                          value={item.quantidade}
                          onChange={e => updateItem(item.key, "quantidade", Number(e.target.value))}
                          className="h-8 text-sm w-16"
                        />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          value={item.unidade}
                          onChange={e => updateItem(item.key, "unidade", e.target.value)}
                          placeholder="un"
                          className="h-8 text-sm w-14"
                        />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          type="number" min={0} step="0.01"
                          value={item.valor_unitario}
                          onChange={e => updateItem(item.key, "valor_unitario", Number(e.target.value))}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-sm font-mono">{formatBRL(item.valor_total)}</span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        {items.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.key)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={5} className="text-right text-sm font-semibold">Total:</TableCell>
                    <TableCell className="font-mono font-semibold text-sm">{formatBRL(grandTotal)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Attachment */}
          <div className="space-y-1">
            <Label>Comprovante (PDF/foto — opcional)</Label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setAttachment(e.target.files?.[0] || null)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm"
            />
          </div>

          {/* Approval section */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Aprovação (opcional — preencha para aprovar direto)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Obra</Label>
                  <Select value={projectId} onValueChange={handleProjectChange}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Conta Bancária</Label>
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.banco} - {a.conta}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={categoriaCodigo} onValueChange={setCategoriaCodigo}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => <SelectItem key={c.codigo} value={c.codigo}>[{c.prefixo}] {c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancelar</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? "Salvando..." : "Salvar como Pendente"}
              </Button>
              <Button onClick={() => handleSave(true)} disabled={saving}>
                {saving ? "Salvando..." : "Salvar e Aprovar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
