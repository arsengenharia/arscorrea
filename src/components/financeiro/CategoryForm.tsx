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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  prefixo: z.enum(["CV", "ROP", "ADM"]),
  e_receita: z.boolean(),
  cor_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor hex inválida"),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: any | null;
  onSaved: () => void;
}

export function CategoryForm({ open, onOpenChange, category, onSaved }: CategoryFormProps) {
  const isEditing = !!category;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      prefixo: "ADM",
      e_receita: false,
      cor_hex: "#6366f1",
      ativo: true,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        nome: category.nome || "",
        prefixo: category.prefixo || "ADM",
        e_receita: category.e_receita ?? false,
        cor_hex: category.cor_hex || "#6366f1",
        ativo: category.ativo ?? true,
      });
    } else {
      form.reset({
        nome: "",
        prefixo: "ADM",
        e_receita: false,
        cor_hex: "#6366f1",
        ativo: true,
      });
    }
  }, [category, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("financial_categories" as any)
          .update(values as any)
          .eq("id", category.id);
        if (error) throw error;
        toast.success("Categoria atualizada!");
      } else {
        const { error } = await supabase.from("financial_categories" as any).insert(values as any);
        if (error) throw error;
        toast.success("Categoria cadastrada!");
      }
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar categoria");
    }
  };

  const corHexValue = form.watch("cor_hex");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl><Input placeholder="Nome da categoria" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prefixo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefixo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o prefixo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CV">CV</SelectItem>
                      <SelectItem value="ROP">ROP</SelectItem>
                      <SelectItem value="ADM">ADM</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cor_hex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-10 w-12 cursor-pointer rounded border border-input p-1"
                      />
                      <Input
                        placeholder="#6366f1"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="flex-1 font-mono"
                      />
                      <div
                        className="h-8 w-8 rounded-full border border-input flex-shrink-0"
                        style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(corHexValue) ? corHexValue : "transparent" }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="e_receita"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">É receita</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

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
