import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";

const projectFormSchema = z.object({
  client_id: z.string().uuid("Selecione um cliente"),
  status: z.string().min(1, "Status é obrigatório"),
  project_manager: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export function ProjectForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      status: "pendente",
      project_manager: "",
    },
  });

  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });

  const { mutate: createProject } = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      // Get the client name for the project name
      const client = clients?.find(c => c.id === values.client_id);
      
      const projectData = {
        name: client?.name || 'Cliente',
        client_id: values.client_id,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        status: values.status,
        project_manager: values.project_manager || null,
      };

      const { data, error } = await supabase
        .from("projects")
        .insert(projectData)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Obra cadastrada com sucesso!");
      setIsSubmitting(false);
      // Invalidate projects query to update list
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/obras?tab=list");
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      const errorMessage = error?.message || "Erro desconhecido";
      const errorCode = error?.code || "";
      toast.error(`Erro ao cadastrar obra: ${errorMessage}${errorCode ? ` (${errorCode})` : ""}`);
      console.error("Supabase error:", error);
    },
  });

  const onSubmit = useCallback((values: ProjectFormValues) => {
    setIsSubmitting(true);
    createProject(values);
  }, [createProject]);

  const getStatusBadgeVariant = useCallback((status: string) => {
    switch (status) {
      case 'iniciado':
        return 'started';
      case 'concluido':
        return 'completed';
      case 'pendente':
      default:
        return 'pending';
    }
  }, []);

  if (isLoadingClients) {
    return <div className="text-center py-4">Carregando clientes...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Cliente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white h-12">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white h-12">
                      <SelectValue placeholder="Selecione um status">
                        {field.value && (
                          <Badge variant={getStatusBadgeVariant(field.value)}>
                            {field.value === 'pendente' && 'Pendente'}
                            {field.value === 'iniciado' && 'Em Andamento'}
                            {field.value === 'concluido' && 'Concluído'}
                          </Badge>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pendente">
                      <Badge variant="pending">Pendente</Badge>
                    </SelectItem>
                    <SelectItem value="iniciado">
                      <Badge variant="started">Em Andamento</Badge>
                    </SelectItem>
                    <SelectItem value="concluido">
                      <Badge variant="completed">Concluído</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="project_manager"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Gestor da Obra</FormLabel>
              <FormControl>
                <Input placeholder="Nome do gestor da obra" {...field} className="h-12 text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Data de Início</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="h-12 text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Data de Término Prevista</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="h-12 text-base" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto h-12 text-base px-8">
          {isSubmitting ? "Cadastrando..." : "Cadastrar Obra"}
        </Button>
      </form>
    </Form>
  );
}
