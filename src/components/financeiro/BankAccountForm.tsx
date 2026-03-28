import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  banco: z.string().min(2, "Banco é obrigatório"),
  agencia: z.string().optional(),
  conta: z.string().min(1, "Conta é obrigatória"),
  descricao: z.string().optional(),
  saldo_inicial: z.coerce.number(),
  data_saldo_inicial: z.string().min(1, "Data é obrigatória"),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface BankAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any | null;
  onSaved: () => void;
}

export function BankAccountForm({ open, onOpenChange, account, onSaved }: BankAccountFormProps) {
  const isEditing = !!account;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      banco: "",
      agencia: "",
      conta: "",
      descricao: "",
      saldo_inicial: 0,
      data_saldo_inicial: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({
        banco: account.banco || "",
        agencia: account.agencia || "",
        conta: account.conta || "",
        descricao: account.descricao || "",
        saldo_inicial: account.saldo_inicial ?? 0,
        data_saldo_inicial: account.data_saldo_inicial || "",
        ativo: account.ativo ?? true,
      });
    } else {
      form.reset({
        banco: "",
        agencia: "",
        conta: "",
        descricao: "",
        saldo_inicial: 0,
        data_saldo_inicial: "",
        ativo: true,
      });
    }
  }, [account, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        agencia: values.agencia?.trim() || null,
        descricao: values.descricao?.trim() || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("bank_accounts" as any)
          .update(payload as any)
          .eq("id", account.id);
        if (error) throw error;
        toast.success("Conta atualizada!");
      } else {
        const { error } = await supabase.from("bank_accounts" as any).insert(payload as any);
        if (error) throw error;
        toast.success("Conta cadastrada!");
      }
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar conta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Conta" : "Nova Conta"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="banco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco *</FormLabel>
                  <FormControl><Input placeholder="Ex: Banco Inter" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="agencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agência</FormLabel>
                    <FormControl><Input placeholder="0001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta *</FormLabel>
                    <FormControl><Input placeholder="12345-6" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apelido/Descrição</FormLabel>
                  <FormControl><Input placeholder="Ex: Conta corrente principal" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="saldo_inicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo Inicial *</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_saldo_inicial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Saldo *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">Ativo</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{isEditing ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
