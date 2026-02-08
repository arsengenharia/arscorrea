
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Pencil, Trash2, MessageCircle, MapPin } from "lucide-react";
import { ViewClientDialog } from "./ViewClientDialog";
import { EditClientDialog } from "./EditClientDialog";
import { toast } from "sonner";
import { ProjectsSearch } from "../projects/ProjectsSearch";
import { useNavigate } from "react-router-dom";

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
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`,
    "_blank"
  );
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

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log('Fetching clients...');
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }

      console.log('Clients fetched:', data);
      return data;
    }
  });

  const handleEdit = (client: any) => {
    setSelectedClient(client);
    setEditDialogOpen(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        if (error.message.includes('foreign key constraint')) {
          toast.error('Este cliente não pode ser excluído pois possui projetos vinculados.');
          return;
        }
        toast.error('Erro ao excluir cliente');
        return;
      }

      toast.success('Cliente excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erro ao excluir cliente');
    }
  };

  const handleClientUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.code?.toLowerCase().includes(search.toLowerCase()) ||
    client.document?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-10">
            <h3 className="text-lg font-medium text-destructive">Erro ao carregar clientes</h3>
            <p className="text-muted-foreground mt-2">Por favor, tente novamente mais tarde.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="space-y-4">
            <div className="w-full h-12 bg-muted animate-pulse rounded-md" />
            <div className="w-full h-64 bg-muted animate-pulse rounded-md" />
          </div>
        </div>
      </Layout>
    );
  }

  const handleView = (client: any) => {
    setSelectedClient(client);
    setViewDialogOpen(true);
  };

  const handleRowClick = (client: any) => {
    setSelectedClient(client);
    setEditDialogOpen(true);
  };

  if (!clients || clients.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-10">
            <h3 className="text-lg font-medium">Nenhum cliente cadastrado</h3>
            <p className="text-muted-foreground mt-2">Comece cadastrando um novo cliente.</p>
            <Button onClick={() => window.location.href = "/clientes/cadastro"} className="mt-4">
              Cadastrar Cliente
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Lista de Clientes</h2>
          <Button 
            variant="outline" 
            onClick={() => navigate('/clientes')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        
        <div className="space-y-4">
          <ProjectsSearch 
            search={search} 
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
          
          {filteredClients?.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground mt-2">Tente buscar com outros termos.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="whitespace-nowrap font-semibold text-muted-foreground">
                      Nome
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-semibold text-muted-foreground">
                      Código
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-semibold text-muted-foreground">
                      CPF/CNPJ
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-semibold text-muted-foreground">
                      Telefone
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-semibold text-muted-foreground">
                      Endereço
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap font-semibold text-muted-foreground">
                      Ações
                    </TableHead>
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
                    ].filter(Boolean).join(", ");

                    return (
                      <TableRow 
                        key={client.id} 
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {client.name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {client.code || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {client.document || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {client.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{client.phone}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => openWhatsApp(client.phone!)}
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {fullAddress ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm truncate max-w-[150px]" title={fullAddress}>
                                {fullAddress}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => openGoogleMaps(fullAddress)}
                                title="Abrir no Google Maps"
                              >
                                <MapPin className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleView(client)}
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(client)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(client.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {selectedClient && (
        <>
          <ViewClientDialog
            client={selectedClient}
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
          />
          <EditClientDialog
            client={selectedClient}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onClientUpdated={handleClientUpdated}
          />
        </>
      )}
    </Layout>
  );
}
