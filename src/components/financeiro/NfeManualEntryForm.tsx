import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText } from "lucide-react";

const schema = z.object({
  project_id: z.string().uuid("Selecione uma obra"),
  bank_account_id: z.string().uuid("Selecione uma conta"),
  category_codigo: z.string().min(1, "Selecione uma categoria"),
  supplier_document: z.string().min(1, "CNPJ é obrigatório"),
  supplier_name: z.string().min(1, "Nome do fornecedor é obrigatório"),
  numero_nota: z.string().min(1, "Número da nota é obrigatório"),
  data_emissao: z.string().min(1, "Data é obrigatória"),
  valor_total: z.coerce.number().positive("Valor deve ser positivo"),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function NfeManualEntryForm() {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_id: "",
      bank_account_id: "",
      category_codigo: "",
      supplier_document: "",
      supplier_name: "",
      numero_nota: "",
      data_emissao: new Date().toISOString().split("T")[0],
      valor_total: 0,
      observacoes: "",
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-manual-nfe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, bank_account_id")
        .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; bank_account_id: string | null }[];
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-for-manual-nfe"],
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
    queryKey: ["categories-for-manual-nfe"],
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
  });

  const handleProjectChange = (pid: string) => {
    form.setValue("project_id", pid);
    const proj = projects.find((p) => p.id === pid);
    if (proj?.bank_account_id) {
      form.setValue("bank_account_id", proj.bank_account_id);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      // 1. Find or create supplier by CNPJ
      const cleanDoc = values.supplier_document.replace(/\D/g, "");
      let { data: supplier } = await supabase
        .from("suppliers")
        .select("id")
        .eq("document", cleanDoc)
        .maybeSingle();

      if (!supplier) {
        const { data: newSupplier, error: supErr } = await supabase
          .from("suppliers")
          .insert({
            document: cleanDoc,
            trade_name: values.supplier_name,
            legal_name: values.supplier_name,
            tipo: "Juridica",
            observacoes: "Cadastro automatico via insercao manual NF-e",
            ativo: true,
          } as any)
          .select("id")
          .single();
        if (supErr) throw supErr;
        supplier = newSupplier;
      }

      // 2. Resolve category by codigo
      const cat = categories.find((c: any) => c.codigo === values.category_codigo);
      if (!cat) throw new Error("Categoria nao encontrada");

      // 3. Create financial entry
      const { error: entryErr } = await (supabase.from("project_financial_entries" as any) as any).insert({
        project_id: values.project_id,
        bank_account_id: values.bank_account_id,
        category_id: cat.id,
        supplier_id: supplier!.id,
        data: values.data_emissao,
        valor: -(Math.abs(values.valor_total)),
        tipo_documento: "NF-e",
        numero_documento: values.numero_nota,
        nota_fiscal: values.numero_nota,
        situacao: "pendente",
        observacoes: values.observacoes || `NF-e ${values.numero_nota} — ${values.supplier_name} (insercao manual)`,
      });

      if (entryErr) throw entryErr;

      // 4. Recalculate balance
      await supabase.rpc("calc_project_balance", { p_project_id: values.project_id });

      toast.success("NF-e registrada com sucesso!");
      form.reset();
    } catch (err: any) {
      toast.error("Erro: " + (err.message ?? "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Inserção Manual de NF-e
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Para notas recebidas por WhatsApp, papel, ou quando não há XML disponível.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="supplier_document" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ do Fornecedor *</FormLabel>
                  <FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supplier_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Fornecedor *</FormLabel>
                  <FormControl><Input placeholder="Razão social ou nome fantasia" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="numero_nota" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nº da Nota *</FormLabel>
                  <FormControl><Input placeholder="000123" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="data_emissao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Emissão *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="valor_total" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Total (R$) *</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="project_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Obra *</FormLabel>
                  <Select value={field.value} onValueChange={handleProjectChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bank_account_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta Bancária *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {bankAccounts.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.banco} - {a.conta}{a.descricao ? ` (${a.descricao})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="category_codigo" render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.codigo} value={c.codigo}>[{c.prefixo}] {c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea placeholder="Descrição ou detalhes da nota" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Registrar NF-e"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
