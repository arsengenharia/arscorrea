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
import { ChevronRight } from "lucide-react";

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
});

type FormValues = z.infer<typeof schema>;

interface LancamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  entry: any | null;
  onSaved: () => void;
}

export function LancamentoForm({ open, onOpenChange, projectId, entry, onSaved }: LancamentoFormProps) {
  const isEditing = !!entry;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
      });
    }
    setSelectedFile(null);
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

      const payload: any = {
        ...values,
        project_id: resolvedProjectId,
        supplier_id: resolvedSupplierId,
        numero_documento: values.numero_documento || null,
        nota_fiscal: values.nota_fiscal || null,
        observacoes: values.observacoes || null,
        arquivo_url: arquivoUrl,
        supplier_cnpj: undefined,
        supplier_name: undefined,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("project_financial_entries" as any)
          .update(payload as any)
          .eq("id", entry.id);
        if (error) throw error;
        toast.success("Lançamento atualizado!");
      } else {
        const { error } = await supabase
          .from("project_financial_entries" as any)
          .insert(payload as any);
        if (error) throw error;
        toast.success("Lançamento registrado!");
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

            {/* NF-e fields — shown only when tipo_documento is "NF-e" */}
            {watchTipoDoc === "NF-e" && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg border border-dashed">
                <FormField control={form.control} name="supplier_cnpj" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ do Fornecedor</FormLabel>
                    <FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="supplier_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Fornecedor</FormLabel>
                    <FormControl><Input placeholder="Razão social" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
