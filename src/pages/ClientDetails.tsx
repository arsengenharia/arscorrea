import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Pencil, MessageCircle, MapPin, FileText, User,
  Briefcase, Building2, DollarSign, Phone, Mail, Calendar,
  ExternalLink,
} from "lucide-react";
import { ClientFilesDialog } from "@/components/clients/ClientFilesDialog";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const formatCurrency = (value: number | null) =>
  (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (date: string | null) =>
  date ? new Date(date + "T00:00:00").toLocaleDateString("pt-BR") : "-";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  won: "Ganha",
  lost: "Perdida",
  ativo: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
  pending: "Pendente",
  in_progress: "Em Andamento",
  completed: "Concluído",
};

export default function ClientDetails() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: proposals } = useQuery({
    queryKey: ["client-proposals", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: contracts } = useQuery({
    queryKey: ["client-contracts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, proposals!inner(client_id)")
        .eq("proposals.client_id", clientId!);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: projects } = useQuery({
    queryKey: ["client-projects", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: payments } = useQuery({
    queryKey: ["client-payments", clientId],
    queryFn: async () => {
      if (!contracts || contracts.length === 0) return [];
      const contractIds = contracts.map((c) => c.id);
      const { data, error } = await supabase
        .from("contract_payments")
        .select("*")
        .in("contract_id", contractIds);
      if (error) throw error;
      return data;
    },
    enabled: !!contracts && contracts.length > 0,
  });

  if (loadingClient) {
    return (
      <Layout>
        <div className="container mx-auto p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="container mx-auto p-6 text-center py-20">
          <p className="text-muted-foreground">Cliente não encontrado.</p>
          <Button variant="link" onClick={() => navigate("/clientes/lista")}>
            Voltar à lista
          </Button>
        </div>
      </Layout>
    );
  }

  const fullAddress = [client.street, client.number, client.complement, client.neighborhood, client.city, client.state, client.zip_code]
    .filter(Boolean)
    .join(", ");

  const openWhatsApp = () => {
    if (!client.phone) return;
    const numbers = client.phone.replace(/\D/g, "");
    const formatted = numbers.length <= 11 ? `55${numbers}` : numbers;
    window.open(`https://wa.me/${formatted}`, "_blank");
  };

  // Financial calculations
  const totalContracts = contracts?.reduce((sum, c) => sum + (Number(c.total) || 0), 0) ?? 0;
  const totalReceived = payments
    ?.filter((p) => p.status === "pago")
    .reduce((sum, p) => sum + (Number(p.received_value) || 0), 0) ?? 0;
  const balance = totalContracts - totalReceived;

  const proposalsByStatus = {
    won: proposals?.filter((p) => p.status === "won").length ?? 0,
    lost: proposals?.filter((p) => p.status === "lost").length ?? 0,
    active: proposals?.filter((p) => p.status !== "won" && p.status !== "lost").length ?? 0,
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate("/clientes/lista")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
              <p className="text-sm text-muted-foreground">Cód: {client.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
            {client.phone && (
              <Button variant="outline" size="sm" onClick={openWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-1 text-green-600" /> WhatsApp
              </Button>
            )}
            {fullAddress && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`, "_blank")}
              >
                <MapPin className="h-4 w-4 mr-1 text-blue-500" /> Maps
              </Button>
            )}
            <ClientFilesDialog clientId={client.id} clientName={client.name} trigger={
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" /> Arquivos
              </Button>
            } />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dados" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="propostas">Propostas ({proposals?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="contratos">Contratos ({contracts?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="obras">Obras ({projects?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          </TabsList>

          {/* Dados Cadastrais */}
          <TabsContent value="dados">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Dados Pessoais</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{client.client_type || "-"}</span></div>
                    <div><span className="text-muted-foreground">Segmento:</span> <span className="font-medium">{client.segment || "-"}</span></div>
                    <div><span className="text-muted-foreground">Documento:</span> <span className="font-medium font-mono">{client.document || "-"}</span></div>
                    <div><span className="text-muted-foreground">Responsável:</span> <span className="font-medium">{client.responsible || "-"}</span></div>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {client.phone}</div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {client.email}</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Endereço</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  {fullAddress ? (
                    <p>{fullAddress}</p>
                  ) : (
                    <p className="text-muted-foreground">Endereço não informado.</p>
                  )}
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" /> CRM</CardTitle></CardHeader>
                <CardContent className="text-sm grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><span className="text-muted-foreground">Canal:</span> <span className="font-medium">{client.lead_channel || "-"}</span></div>
                  <div><span className="text-muted-foreground">Representante:</span> <span className="font-medium">{client.service_rep || "-"}</span></div>
                  <div><span className="text-muted-foreground">Data do Lead:</span> <span className="font-medium">{formatDate(client.lead_date)}</span></div>
                  <div><span className="text-muted-foreground">Indicação:</span> <span className="font-medium">{client.lead_referral || "-"}</span></div>
                  {client.observations && (
                    <div className="col-span-full"><span className="text-muted-foreground">Observações:</span> <p className="mt-1">{client.observations}</p></div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Propostas */}
          <TabsContent value="propostas">
            <Card>
              <CardContent className="p-0">
                {!proposals || proposals.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhuma proposta vinculada.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prev. Fechamento</TableHead>
                        <TableHead>Motivo Perda</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposals.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-sm">{p.number || "-"}</TableCell>
                          <TableCell>{p.title || "-"}</TableCell>
                          <TableCell>{formatCurrency(p.total)}</TableCell>
                          <TableCell><Badge variant="outline">{statusLabels[p.status || ""] || p.status}</Badge></TableCell>
                          <TableCell>{formatDate(p.expected_close_date)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.loss_reason || "-"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/propostas/${p.id}`}><ExternalLink className="h-4 w-4" /></Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contratos */}
          <TabsContent value="contratos">
            <Card>
              <CardContent className="p-0">
                {!contracts || contracts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhum contrato vinculado.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Contrato</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-sm">{c.contract_number || "-"}</TableCell>
                          <TableCell>{c.title || "-"}</TableCell>
                          <TableCell>{formatCurrency(c.total)}</TableCell>
                          <TableCell><Badge variant="outline">{statusLabels[c.status || ""] || c.status}</Badge></TableCell>
                          <TableCell>{formatDate(c.due_date)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/contratos/${c.id}`}><ExternalLink className="h-4 w-4" /></Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Obras */}
          <TabsContent value="obras">
            <Card>
              <CardContent className="p-0">
                {!projects || projects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Nenhuma obra vinculada.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Término</TableHead>
                        <TableHead>Gerente</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell><Badge variant="outline">{statusLabels[p.status] || p.status}</Badge></TableCell>
                          <TableCell>{formatDate(p.start_date)}</TableCell>
                          <TableCell>{formatDate(p.end_date)}</TableCell>
                          <TableCell>{p.project_manager || "-"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/obras/${p.id}`}><ExternalLink className="h-4 w-4" /></Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financeiro */}
          <TabsContent value="financeiro">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Contratos</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatCurrency(totalContracts)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pagamentos Recebidos</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo Devedor</CardTitle></CardHeader>
                <CardContent><p className={`text-2xl font-bold ${balance > 0 ? "text-amber-600" : "text-green-600"}`}>{formatCurrency(balance)}</p></CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Propostas por Status</CardTitle></CardHeader>
              <CardContent className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Ganhas: <strong>{proposalsByStatus.won}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm">Perdidas: <strong>{proposalsByStatus.lost}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Em andamento: <strong>{proposalsByStatus.active}</strong></span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <EditClientDialog
          client={client}
          open={editOpen}
          onOpenChange={setEditOpen}
          onClientUpdated={() => queryClient.invalidateQueries({ queryKey: ["client", clientId] })}
        />
      </div>
    </Layout>
  );
}
