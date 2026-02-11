import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { Loader2, Search } from "lucide-react";

const CLIENT_TYPES = [
  { value: "pessoa_fisica", label: "Pessoa Física" },
  { value: "pessoa_juridica", label: "Pessoa Jurídica" },
  { value: "condominio", label: "Condomínio" },
];

const SEGMENTS = [
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
];

const SERVICE_REPS = [
  "Ana Andrade",
  "Ana Corrêa",
  "André Amaral",
  "Outro",
];

const LEAD_CHANNELS = [
  { value: "google", label: "Google" },
  { value: "instagram", label: "Instagram" },
  { value: "indicacao", label: "Indicação" },
  { value: "sindico", label: "Síndico profissional" },
  { value: "organico", label: "Orgânico" },
];

const clientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  document: z.string().optional().or(z.literal("")),
  responsible: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  zip_code: z.string().min(8, "CEP deve ter 8 dígitos").optional().or(z.literal("")),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  observations: z.string().optional(),
  service_rep: z.string().min(1, "Responsável pelo atendimento é obrigatório"),
  service_rep_other: z.string().optional(),
  lead_channel: z.string().min(1, "Canal do lead é obrigatório"),
  lead_referral: z.string().optional(),
  lead_date: z.string().min(1, "Data do lead é obrigatória"),
  client_type: z.string().optional(),
  segment: z.string().optional(),
}).refine((data) => {
  if (data.service_rep === "Outro" && (!data.service_rep_other || data.service_rep_other.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Informe o nome do responsável",
  path: ["service_rep_other"],
}).refine((data) => {
  if (data.lead_channel === "indicacao" && (!data.lead_referral || data.lead_referral.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Informe quem indicou",
  path: ["lead_referral"],
}).refine((data) => {
  if (data.lead_channel === "sindico" && (!data.lead_referral || data.lead_referral.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Informe o nome do síndico",
  path: ["lead_referral"],
});

type ClientFormValues = z.infer<typeof clientSchema>;

export function ClientForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [documentNotProvided, setDocumentNotProvided] = useState(false);
  const navigate = useNavigate();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      document: "",
      responsible: "",
      phone: "",
      email: "",
      zip_code: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      observations: "",
      service_rep: "",
      service_rep_other: "",
      lead_channel: "",
      lead_referral: "",
      lead_date: new Date().toISOString().split('T')[0],
      client_type: "",
      segment: "",
    },
  });

  const watchServiceRep = form.watch("service_rep");
  const watchLeadChannel = form.watch("lead_channel");
  const watchZipCode = form.watch("zip_code");

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      form.setValue("street", data.logradouro || "");
      form.setValue("neighborhood", data.bairro || "");
      form.setValue("city", data.localidade || "");
      form.setValue("state", data.uf || "");
      
      toast.success("Endereço preenchido automaticamente");
    } catch (error) {
      console.error("Error fetching CEP:", error);
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepBlur = () => {
    const cep = form.getValues("zip_code");
    if (cep && cep.replace(/\D/g, "").length === 8) {
      fetchAddressByCep(cep);
    }
  };

  const onSubmit = async (values: ClientFormValues) => {
    setIsSubmitting(true);
    try {
      const finalServiceRep = values.service_rep === "Outro" 
        ? values.service_rep_other 
        : values.service_rep;

      const insertData: TablesInsert<"clients"> = {
        name: values.name,
        code: "",
        document: values.document || null,
        responsible: values.responsible || null,
        phone: values.phone || null,
        email: values.email || null,
        street: values.street || null,
        number: values.number || null,
        complement: values.complement || null,
        neighborhood: values.neighborhood || null,
        city: values.city || null,
        state: values.state || null,
        zip_code: values.zip_code || null,
        observations: values.observations || null,
        service_rep: finalServiceRep || null,
        lead_channel: values.lead_channel || null,
        lead_referral: values.lead_referral || null,
        lead_date: values.lead_date || null,
        client_type: values.client_type || null,
        segment: values.segment || null,
      } as any;

      const { data, error } = await supabase
        .from("clients")
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error("Error inserting client:", error);
        toast.error("Erro ao cadastrar cliente. Tente novamente.");
        throw error;
      }
      
      toast.success("Cliente cadastrado com sucesso!");
      navigate("/clientes");
    } catch (error) {
      console.error("Error adding client:", error);
      toast.error("Erro ao cadastrar cliente. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Cadastro de Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Dados Básicos */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Dados Básicos</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>CPF/CNPJ</FormLabel>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={documentNotProvided}
                          onCheckedChange={(checked: boolean) => {
                            setDocumentNotProvided(checked);
                            if (checked) {
                              form.setValue("document", "");
                              form.clearErrors("document");
                            }
                          }}
                        />
                        Não informado
                      </label>
                    </div>
                    <FormControl>
                      <Input placeholder="CPF ou CNPJ do cliente" disabled={documentNotProvided} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do responsável" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cliente</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CLIENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
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
                  name="segment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Segmento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o segmento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SEGMENTS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Endereço</h3>
              
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="00000-000" 
                          {...field} 
                          onBlur={(e) => {
                            field.onBlur();
                            handleCepBlur();
                          }}
                        />
                        {isLoadingCep && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="Número" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Apartamento, Bloco, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado (UF)</FormLabel>
                      <FormControl>
                        <Input placeholder="UF" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Qualificação do Lead */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Qualificação do Lead</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="service_rep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável pelo Atendimento *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o responsável" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVICE_REPS.map((rep) => (
                            <SelectItem key={rep} value={rep}>
                              {rep}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchServiceRep === "Outro" && (
                  <FormField
                    control={form.control}
                    name="service_rep_other"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Responsável *</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lead_channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canal do Lead *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o canal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEAD_CHANNELS.map((channel) => (
                            <SelectItem key={channel.value} value={channel.value}>
                              {channel.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchLeadChannel === "indicacao" && (
                  <FormField
                    control={form.control}
                    name="lead_referral"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indicado por *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome de quem indicou" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchLeadChannel === "sindico" && (
                  <FormField
                    control={form.control}
                    name="lead_referral"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Síndico *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do síndico profissional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="lead_date"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Data do Lead *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Observações */}
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações adicionais"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Cadastrando..." : "Cadastrar Cliente"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
