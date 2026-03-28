import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, ChevronDown, FileText, Package, Trash2, Plus } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/formatters";

const schema = z.object({
  project_id: z.string().optional(),
  bank_account_id: z.string().uuid("Selecione uma conta"),
  category_id: z.string().uuid("Selecione uma categoria"),
  supplier_id: z.string().optional(),
  data: z.string().min(1, "Data é obrigatória"),
  valor: z.coerce.number().refine((v) => v !== 0, "Valor não pode ser zero"),
  tipo_documento: z.enum(["Pix", "Boleto", "Transferência", "Dinheiro", "Outros", "NF-e"]),
  numero_documento: z.string().optional(),
  situacao: z.enum(["pendente", "conciliado", "divergente"]),
  is_comprometido: z.boolean(),
  nota_fiscal: z.string().optional(),
  observacoes: z.string().optional(),
  supplier_cnpj: z.string().optional(),
  supplier_name: z.string().optional(),
  contract_payment_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LancamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  entry: any | null;
  onSaved: () => void;
}

interface ManualItem {
  key: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
}

export function LancamentoForm({ open, onOpenChange, projectId, entry, onSaved }: LancamentoFormProps) {
  const isEditing = !!entry;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedNfeId, setSelectedNfeId] = useState("");
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [quickMode, setQuickMode] = useState(!entry);

  const { data: projectsList = [] } = useQuery({
    queryKey: ["projects-for-entry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, bank_account_id")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; bank_account_id: string | null }[];
    },
    enabled: !projectId,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("id, banco, conta, descricao")
        .eq("ativo", true)
        .order("banco");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["financial-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories" as any)
        .select("id, nome, prefixo, e_receita")
        .eq("ativo", true)
        .order("prefixo")
        .order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers" as any)
        .select("id, trade_name")
        .order("trade_name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: approvedNfes = [] } = useQuery({
    queryKey: ["approved-nfes-for-link"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nfe_inbox" as any)
        .select("id, numero_nota, razao_social, cnpj, valor_total, data_emissao, financial_entry_id, supplier:suppliers(trade_name)")
        .eq("status", "aprovado")
        .order("created_at", { ascending: false })
        .limit(50);
      return data as any[] || [];
    },
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_id: projectId || "",
      bank_account_id: "",
      category_id: "",
      supplier_id: "",
      data: "",
      valor: 0,
      tipo_documento: "Pix",
      numero_documento: "",
      situacao: "pendente",
      is_comprometido: false,
      nota_fiscal: "",
      observacoes: "",
      supplier_cnpj: "",
      supplier_name: "",
      contract_payment_id: "",
    },
  });

  useEffect(() => {
    if (entry) {
      form.reset({
        project_id: entry?.project_id || projectId || "",
        bank_account_id: entry.bank_account_id || "",
        category_id: entry.category_id || "",
        supplier_id: entry.supplier_id || "",
        data: entry.data || "",
        valor: entry.valor ?? 0,
        tipo_documento: entry.tipo_documento || "Pix",
        numero_documento: entry.numero_documento || "",
        situacao: entry.situacao || "pendente",
        is_comprometido: entry.is_comprometido ?? false,
        nota_fiscal: entry.nota_fiscal || "",
        observacoes: entry.observacoes || "",
        supplier_cnpj: "",
        supplier_name: "",
        contract_payment_id: entry?.contract_payment_id || "",
      });
    } else {
      form.reset({
        project_id: projectId || "",
        bank_account_id: "",
        category_id: "",
        supplier_id: "",
        data: "",
        valor: 0,
        tipo_documento: "Pix",
        numero_documento: "",
        situacao: "pendente",
        is_comprometido: false,
        nota_fiscal: "",
        observacoes: "",
        supplier_cnpj: "",
        supplier_name: "",
        contract_payment_id: "",
      });
    }
    setSelectedFile(null);
    setSelectedNfeId("");
    setManualItems([]);
    setQuickMode(!entry);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [entry, open]);

  const watchProjectId = form.watch("project_id");
  useEffect(() => {
    if (!watchProjectId || projectId) return; // only for global form
    const proj = projectsList.find((p: any) => p.id === watchProjectId);
    if (proj?.bank_account_id) {
      form.setValue("bank_account_id", proj.bank_account_id);
    } else {
      form.setValue("bank_account_id", "");
    }
  }, [watchProjectId]);

  const watchTipoDoc = form.watch("tipo_documento");

  const watchCategoryId = form.watch("category_id");
  const resolvedProjectId = projectId || form.watch("project_id");

  // Check if selected category is revenue
  const isRevenueCategory = categories.find((c: any) => c.id === watchCategoryId)?.e_receita;

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["pending-payments", resolvedProjectId],
    queryFn: async () => {
      if (!resolvedProjectId) return [];
      // Get contracts for this project
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, titulo")
        .eq("project_id", resolvedProjectId)
        .eq("status", "ativo");

      if (!contracts?.length) return [];

      const contractIds = contracts.map((c: any) => c.id);

      // Get pending payments for those contracts
      const { data: payments } = await supabase
        .from("contract_payments")
        .select("id, kind, description, expected_value, expected_date, received_value, status, contract_id")
        .in("contract_id", contractIds)
        .neq("status", "recebido")
        .order("expected_date");

      // Add contract title for display
      return (payments || []).map((p: any) => ({
        ...p,
        contract_title: contracts.find((c: any) => c.id === p.contract_id)?.titulo || "",
      }));
    },
    enabled: !!resolvedProjectId && !!isRevenueCategory,
  });

  const updateManualItem = (key: string, field: string, value: any) => {
    setManualItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantidade" || field === "valor_unitario") {
        updated.valor_total = Number(updated.quantidade) * Number(updated.valor_unitario);
      }
      return updated;
    }));
  };

  const onSubmit = async (values: FormValues) => {
    const resolvedProjectId = projectId || values.project_id;
    if (!resolvedProjectId) {
      toast.error("Selecione uma obra");
      return;
    }

    try {
      let resolvedSupplierId = values.supplier_id || null;

      if (values.tipo_documento === "NF-e" && values.supplier_cnpj) {
        const cleanDoc = values.supplier_cnpj.replace(/\D/g, "");
        if (cleanDoc) {
          let { data: existingSupplier } = await supabase
            .from("suppliers")
            .select("id")
            .eq("document", cleanDoc)
            .maybeSingle();

          if (!existingSupplier && values.supplier_name) {
            const { data: newSup } = await supabase
              .from("suppliers")
              .insert({
                document: cleanDoc,
                trade_name: values.supplier_name,
                legal_name: values.supplier_name,
                tipo: "Juridica",
                observacoes: "Cadastro automatico via lancamento NF-e",
                ativo: true,
              } as any)
              .select("id")
              .single();
            existingSupplier = newSup;
          }
          if (existingSupplier) resolvedSupplierId = existingSupplier.id;
        }
      }

      let arquivoUrl = entry?.arquivo_url || null;

      if (selectedFile) {
        const ext = selectedFile.name.split(".").pop();
        const path = `comprovantes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("lancamentos")
          .upload(path, selectedFile, { contentType: selectedFile.type });

        if (uploadErr) {
          toast.error("Erro ao enviar comprovante: " + uploadErr.message);
          return;
        }
        arquivoUrl = path;
      }

      let observacoesValue = values.observacoes || null;
      if (selectedNfeId) {
        observacoesValue = ((observacoesValue || "") + ` [NF-e ref: ${selectedNfeId}]`).trim();
      }

      const payload: any = {
        ...values,
        project_id: resolvedProjectId,
        supplier_id: resolvedSupplierId,
        numero_documento: values.numero_documento || null,
        nota_fiscal: values.nota_fiscal || null,
        observacoes: observacoesValue,
        arquivo_url: arquivoUrl,
        supplier_cnpj: undefined,
        supplier_name: undefined,
        contract_payment_id: values.contract_payment_id && values.contract_payment_id !== "none" ? values.contract_payment_id : null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("project_financial_entries" as any)
          .update(payload as any)
          .eq("id", entry.id);
        if (error) throw error;
        toast.success("Lançamento atualizado!");
      } else {
        const { data: createdEntry, error } = await supabase
          .from("project_financial_entries" as any)
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Lançamento registrado!");

        // Save manual items
        if (manualItems.length > 0 && createdEntry) {
          const itemRows = manualItems.filter(i => i.descricao.trim()).map(i => ({
            financial_entry_id: (createdEntry as any).id,
            nfe_inbox_id: selectedNfeId || null,
            descricao_original: i.descricao,
            quantidade: i.quantidade,
            unidade: i.unidade,
            valor_unitario: i.valor_unitario,
            valor_total: i.valor_total,
            project_id: resolvedProjectId,
            supplier_id: resolvedSupplierId,
          }));

          await supabase.from("nfe_items" as any).insert(itemRows);
        }
      }

      // Auto-sync contract payment status
      const paymentId = values.contract_payment_id;
      if (paymentId && paymentId !== "none") {
        const entryValor = Math.abs(Number(values.valor));

        // Fetch current payment state
        const { data: payment } = await supabase
          .from("contract_payments")
          .select("expected_value, received_value")
          .eq("id", paymentId)
          .single();

        if (payment) {
          const currentReceived = Number((payment as any).received_value) || 0;
          const newReceived = currentReceived + entryValor;
          const expected = Number((payment as any).expected_value);

          const newStatus = newReceived >= expected ? "recebido" : newReceived > 0 ? "parcial" : "pendente";

          await supabase.from("contract_payments" as any).update({
            received_value: newReceived,
            received_date: values.data,
            status: newStatus,
          }).eq("id", paymentId);
        }
      }

      const balanceProjectId = projectId || values.project_id;
      if (balanceProjectId) {
        await supabase.rpc("calc_project_balance", { p_project_id: balanceProjectId });
      }

      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar lançamento");
    }
  };

  const bankAccountLabel = (account: any) => {
    let label = `${account.banco} - ${account.conta}`;
    if (account.descricao) label += ` (${account.descricao})`;
    return label;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {quickMode ? (
              <div className="space-y-4">
                {/* Obra (if global) */}
                {!projectId && (
                  <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Obra *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a obra" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projectsList.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Categoria */}
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              [{cat.prefixo}] {cat.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data + Valor */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="data"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor * <span className="text-muted-foreground text-xs">(+ entrada, - saída)</span></FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Expand link */}
                <button
                  type="button"
                  onClick={() => setQuickMode(false)}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ChevronDown className="h-3 w-3" />
                  Formulário completo (fornecedor, NF-e, itens, comprovante...)
                </button>

                {/* Submit */}
                <div className="flex justify-end gap-4 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button type="submit">{form.formState.isSubmitting ? "Salvando..." : "Registrar"}</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Project selector — only shown when projectId is not provided by parent */}
                {!projectId && (
                  <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Obra *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a obra" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projectsList.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Row 1: Conta Bancária | Categoria */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bank_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta Bancária *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bankAccounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {bankAccountLabel(acc)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                [{cat.prefixo}] {cat.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Vincular a Parcela do Contrato — only for revenue categories with pending payments */}
                {isRevenueCategory && pendingPayments.length > 0 && (
                  <FormField control={form.control} name="contract_payment_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vincular a Parcela do Contrato</FormLabel>
                      <Select value={field.value || ""} onValueChange={(v) => {
                        field.onChange(v === "none" ? "" : v);
                        // Auto-fill valor from the selected payment
                        if (v && v !== "none") {
                          const payment = pendingPayments.find((p: any) => p.id === v);
                          if (payment) {
                            const remaining = Number(payment.expected_value) - Number(payment.received_value || 0);
                            form.setValue("valor", remaining);
                          }
                        }
                      }}>
                        <FormControl><SelectTrigger><SelectValue placeholder="(opcional) selecione a parcela" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem vínculo com parcela</SelectItem>
                          {pendingPayments.map((p: any) => {
                            const remaining = Number(p.expected_value) - Number(p.received_value || 0);
                            const dateStr = p.expected_date ? p.expected_date.split("-").reverse().join("/") : "";
                            return (
                              <SelectItem key={p.id} value={p.id}>
                                {p.contract_title} — {p.kind === "entrada" ? "Entrada" : p.kind === "comissao" ? "Comissão" : `Parcela`} — R$ {remaining.toLocaleString("pt-BR", {minimumFractionDigits: 2})} — Venc: {dateStr}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {/* Row 2: Fornecedor */}
                <FormField
                  control={form.control}
                  name="supplier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Nenhum" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {suppliers.map((sup) => (
                            <SelectItem key={sup.id} value={sup.id}>
                              {sup.trade_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vincular NF-e — collapsible */}
                <details className="group">
                  <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Vincular a uma NF-e aprovada
                  </summary>
                  <div className="mt-2 pl-4 border-l-2 border-muted">
                    <Select value={selectedNfeId} onValueChange={(v) => {
                      setSelectedNfeId(v === "none" ? "" : v);
                      if (v && v !== "none") {
                        const nfe = approvedNfes.find((n: any) => n.id === v);
                        if (nfe) {
                          form.setValue("valor", -(Math.abs(Number(nfe.valor_total))));
                          form.setValue("tipo_documento", "NF-e");
                          form.setValue("nota_fiscal", nfe.numero_nota || "");
                          if (nfe.data_emissao) form.setValue("data", nfe.data_emissao);
                        }
                      }
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="(opcional) selecione uma NF-e" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {approvedNfes.map((nfe: any) => (
                          <SelectItem key={nfe.id} value={nfe.id}>
                            NF {nfe.numero_nota} — {nfe.razao_social || nfe.supplier?.trade_name || "?"} — {formatBRL(Number(nfe.valor_total))} — {nfe.data_emissao ? formatDate(nfe.data_emissao) : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Vincula este lançamento a uma NF-e já aprovada no sistema.</p>
                  </div>
                </details>

                {/* Row 3: Data | Valor | Tipo Documento */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="data"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor * <span className="text-muted-foreground text-xs">(+ entrada, - saída)</span></FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo_documento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Documento *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["Pix", "Boleto", "Transferência", "Dinheiro", "Outros", "NF-e"].map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Itens manuais — collapsible */}
                <details className="group">
                  <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Adicionar itens ao lançamento
                  </summary>
                  <div className="mt-2 pl-4 border-l-2 border-muted space-y-2">
                    <p className="text-xs text-muted-foreground">Para compras sem NF-e ou com negociação informal.</p>

                    {manualItems.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-[11px]">
                              <TableHead className="py-1.5">Descrição</TableHead>
                              <TableHead className="py-1.5 w-16">Qtd</TableHead>
                              <TableHead className="py-1.5 w-14">Un</TableHead>
                              <TableHead className="py-1.5 w-24">Vlr Unit</TableHead>
                              <TableHead className="py-1.5 w-24">Total</TableHead>
                              <TableHead className="py-1.5 w-8"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {manualItems.map((item) => (
                              <TableRow key={item.key}>
                                <TableCell className="py-1">
                                  <Input value={item.descricao} onChange={e => updateManualItem(item.key, "descricao", e.target.value)} placeholder="Descrição" className="h-7 text-sm" />
                                </TableCell>
                                <TableCell className="py-1">
                                  <Input type="number" value={item.quantidade} onChange={e => updateManualItem(item.key, "quantidade", Number(e.target.value))} className="h-7 text-sm w-16" />
                                </TableCell>
                                <TableCell className="py-1">
                                  <Input value={item.unidade} onChange={e => updateManualItem(item.key, "unidade", e.target.value)} placeholder="un" className="h-7 text-sm w-14" />
                                </TableCell>
                                <TableCell className="py-1">
                                  <Input type="number" step="0.01" value={item.valor_unitario} onChange={e => updateManualItem(item.key, "valor_unitario", Number(e.target.value))} className="h-7 text-sm" />
                                </TableCell>
                                <TableCell className="py-1 text-sm font-mono">{formatBRL(item.valor_total)}</TableCell>
                                <TableCell className="py-1">
                                  <Button variant="ghost" size="icon" type="button" className="h-6 w-6" onClick={() => setManualItems(prev => prev.filter(i => i.key !== item.key))}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <Button variant="outline" size="sm" type="button" onClick={() => setManualItems(prev => [...prev, { key: Math.random().toString(36).slice(2), descricao: "", quantidade: 1, unidade: "un", valor_unitario: 0, valor_total: 0 }])}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar Item
                    </Button>

                    {manualItems.length > 0 && (
                      <p className="text-xs font-medium">Total dos itens: {formatBRL(manualItems.reduce((s, i) => s + i.valor_total, 0))}</p>
                    )}
                  </div>
                </details>

                {/* Nota Fiscal */}
                <FormField
                  control={form.control}
                  name="nota_fiscal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nota Fiscal</FormLabel>
                      <FormControl>
                        <Input placeholder="Número da nota fiscal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Row 5: Observações */}
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Observações adicionais..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Comprovante */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Comprovante</label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    {selectedFile && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                        Limpar
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">PDF, JPG ou PNG do comprovante (máx 10MB)</p>
                </div>

                {/* Advanced fields — collapsible */}
                <details className="group">
                  <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                    Opções avançadas
                  </summary>
                  <div className="mt-3 space-y-4 pl-4 border-l-2 border-muted">
                    <FormField
                      control={form.control}
                      name="numero_documento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nº Documento</FormLabel>
                          <FormControl>
                            <Input placeholder="Número do documento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center gap-4">
                      <FormField
                        control={form.control}
                        name="is_comprometido"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3 flex-1">
                            <FormLabel className="cursor-pointer">Comprometido</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="situacao"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Situação *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a situação" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="conciliado">Conciliado</SelectItem>
                                <SelectItem value="divergente">Divergente</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </details>

                <div className="flex justify-end gap-4 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">{isEditing ? "Salvar" : "Registrar"}</Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
