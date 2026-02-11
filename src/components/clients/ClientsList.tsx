import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Eye,
  Pencil,
  Trash2,
  MessageCircle,
  MapPin,
  Users,
  UserPlus,
  SearchX,
  Phone,
  FileText,
} from "lucide-react";
import { ViewClientDialog } from "./ViewClientDialog";
import { EditClientDialog } from "./EditClientDialog";
import { toast } from "sonner";
import { ProjectsSearch } from "../projects/ProjectsSearch";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const GOOGLE_MAPS_API_KEY = "AIzaSyBEZQ3dPHqho8u6nfKSVWlAVIXzG7Yawck";

const formatPhoneForWhatsApp = (phone: string): string => {
  const numbers = phone.replace(/\D/g, "");
  if (numbers.length <= 11) {
    return `55${numbers}`;
  }
  return numbers;
};

const openWhatsApp = (phone: string) => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  window.open(`https://wa.me/${formattedPhone}`, "_blank");
};

const openGoogleMaps = (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`, "_blank");
};

// Helper para iniciais do nome
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export default function ClientsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("name");
  const [clientTypeFilter, setClientTypeFilter] = useState("todos");
  const [segmentFilter, setSegmentFilter] = useState("todos");

  const {
    data: clients,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      console.log("Fetching clients...");
      const { data, error } = await supabase.from("clients").select("*").order("name", { ascending: true });

      if (error) {
        console.error("Error fetching clients:", error);
        throw error;
      }

      console.log("Clients fetched:", data);
      return data;
    },
  });

  const handleEdit = (client: any) => {
    setSelectedClient(client);
    setEditDialogOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    if (
      !window.confirm(
        "Tem certeza que deseja excluir este cliente e TODOS os dados vinculados (propostas, contratos, projetos)?",
      )
    )
      return;

    try {
      // 1. Buscar propostas do cliente
      const { data: proposals } = await supabase.from("proposals").select("id").eq("client_id", clientId);

      // 2. Para cada proposta, excluir contratos e dados relacionados
      if (proposals && proposals.length > 0) {
        for (const proposal of proposals) {
          // Buscar contratos da proposta
          const { data: contracts } = await supabase.from("contracts").select("id").eq("proposal_id", proposal.id);

          if (contracts && contracts.length > 0) {
            for (const contract of contracts) {
              await supabase.from("contract_payments").delete().eq("contract_id", contract.id);
              await supabase.from("contract_items").delete().eq("contract_id", contract.id);
              await supabase.from("contract_financial").delete().eq("contract_id", contract.id);
            }
            await supabase.from("contracts").delete().eq("proposal_id", proposal.id);
          }

          // Excluir imports e itens da proposta
          await supabase.from("proposal_imports").delete().eq("proposal_id", proposal.id);
          await supabase.from("proposal_items").delete().eq("proposal_id", proposal.id);
        }
        // Excluir propostas
        await supabase.from("proposals").delete().eq("client_id", clientId);
      }

      // 3. Buscar projetos do cliente
      const { data: projects } = await supabase.from("projects").select("id").eq("client_id", clientId);

      if (projects && projects.length > 0) {
        for (const project of projects) {
          // Buscar etapas do projeto
          const { data: stages } = await supabase.from("stages").select("id").eq("project_id", project.id);

          if (stages && stages.length > 0) {
            for (const stage of stages) {
              await supabase.from("stage_photos").delete().eq("stage_id", stage.id);
            }
            await supabase.from("stages").delete().eq("project_id", project.id);
          }
        }
        await supabase.from("projects").delete().eq("client_id", clientId);
      }

      // 4. Excluir arquivos do cliente
      await supabase.from("client_files").delete().eq("client_id", clientId);

      // 5. Finalmente excluir o cliente
      const { error } = await supabase.from("clients").delete().eq("id", clientId);

      if (error) throw error;

      toast.success("Cliente e todos os dados vinculados excluídos com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error("Erro ao excluir cliente: " + (error?.message || "Erro desconhecido"));
    }
  };

  const handleClientUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const filteredClients =
    clients?.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.code?.toLowerCase().includes(search.toLowerCase()) ||
        client.document?.toLowerCase().includes(search.toLowerCase());
      const matchesType = clientTypeFilter === "todos" || client.client_type === clientTypeFilter;
      const matchesSegment = segmentFilter === "todos" || client.segment === segmentFilter;
      return matchesSearch && matchesType && matchesSegment;
    }) || [];

  const handleView = (client: any) => {
    navigate(`/clientes/${client.id}`);
  };

  // --- Loading State ---
  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-10 w-full" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-6 flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <div className="bg-red-50 text-red-500 p-4 rounded-full inline-block mb-4">
              <SearchX className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-destructive">Erro ao carregar clientes</h3>
            <p className="text-muted-foreground mt-2">Por favor, tente novamente mais tarde.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 pb-20 animate-in fade-in duration-500">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gerenciamento de Clientes</h2>
              <p className="text-muted-foreground">Cadastre e gerencie sua base de clientes.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => (window.location.href = "/clientes/cadastro")}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-white border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex-1">
                  <ProjectsSearch
                    search={search}
                    onSearchChange={setSearch}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={clientTypeFilter}
                    onChange={(e) => setClientTypeFilter(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="todos">Tipo: Todos</option>
                    <option value="Pessoa Física">Pessoa Física</option>
                    <option value="Pessoa Jurídica">Pessoa Jurídica</option>
                    <option value="Condomínio">Condomínio</option>
                  </select>
                  <select
                    value={segmentFilter}
                    onChange={(e) => setSegmentFilter(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="todos">Segmento: Todos</option>
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!clients || clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <Users className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">Nenhum cliente cadastrado</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm">
                    Sua base de clientes está vazia. Adicione o primeiro cliente para começar a gerar propostas.
                  </p>
                  <Button onClick={() => (window.location.href = "/clientes/cadastro")} className="mt-6">
                    Cadastrar Primeiro Cliente
                  </Button>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-slate-50 p-3 rounded-full mb-3">
                    <SearchX className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-base font-medium text-slate-900">Nenhum resultado encontrado</h3>
                  <p className="text-sm text-slate-500 mt-1">Não encontramos clientes com os termos pesquisados.</p>
                  <Button variant="link" onClick={() => setSearch("")} className="mt-2 text-blue-600">
                    Limpar busca
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="w-[300px]">Nome / Empresa</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => {
                        const fullAddress = [
                          client.street,
                          client.number,
                          client.neighborhood,
                          client.city,
                          client.state,
                        ]
                          .filter(Boolean)
                          .join(", ");

                        return (
                          <TableRow key={client.id} className="hover:bg-slate-50/60 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-slate-200 bg-white">
                                  <AvatarFallback className="text-xs font-medium text-blue-600 bg-blue-50">
                                    {getInitials(client.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-900">{client.name}</span>
                                  {client.code && <span className="text-xs text-slate-500">Cód: {client.code}</span>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-sm text-slate-600 font-mono">
                                  {client.document || <span className="text-slate-300">-</span>}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {client.phone ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-2 text-slate-600 hover:text-green-700 hover:bg-green-50 px-2"
                                        onClick={() => openWhatsApp(client.phone!)}
                                      >
                                        <MessageCircle className="h-4 w-4 text-green-600" />
                                        <span>{client.phone}</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Conversar no WhatsApp</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-slate-400 text-sm pl-2">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {fullAddress ? (
                                <div className="flex items-center gap-2 max-w-[200px]">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                                    onClick={() => openGoogleMaps(fullAddress)}
                                    title="Ver no Maps"
                                  >
                                    <MapPin className="h-4 w-4" />
                                  </Button>
                                  <span className="text-sm text-slate-600 truncate" title={fullAddress}>
                                    {client.neighborhood || client.city || "Ver endereço"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-sm pl-2">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                        onClick={() => handleView(client)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Detalhes</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                        onClick={() => handleEdit(client)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDelete(client.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Excluir</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedClient && (
          <>
            <ViewClientDialog client={selectedClient} open={viewDialogOpen} onOpenChange={setViewDialogOpen} />
            <EditClientDialog
              client={selectedClient}
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              onClientUpdated={handleClientUpdated}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
