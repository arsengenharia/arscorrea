import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Phone, Mail, MapPin, FileText, AlertCircle } from "lucide-react";

interface Client {
  id: string;
  name: string;
  document: string | null;
  responsible: string | null;
  phone: string | null;
  email: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

interface ProposalClientSectionProps {
  clientId: string;
  onClientChange: (clientId: string) => void;
  selectedClient: Client | null | undefined;
}

export const ProposalClientSection = ({
  clientId,
  onClientChange,
  selectedClient,
}: ProposalClientSectionProps) => {
  const navigate = useNavigate();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const formatAddress = (client: Client) => {
    const parts = [];
    if (client.street) parts.push(client.street);
    if (client.number) parts.push(client.number);
    if (client.complement) parts.push(client.complement);
    if (client.city) parts.push(client.city);
    if (client.state) parts.push(client.state);
    if (client.zip_code) parts.push(`CEP: ${client.zip_code}`);
    return parts.join(", ") || "-";
  };

  if (!clients || clients.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">Nenhum cliente cadastrado</h3>
              <p className="text-muted-foreground">
                É necessário ter pelo menos um cliente para criar uma proposta.
              </p>
            </div>
            <Button onClick={() => navigate("/clientes/cadastro")}>
              Cadastrar Cliente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="client-select">Selecione o cliente *</Label>
          <Select value={clientId} onValueChange={onClientChange}>
            <SelectTrigger id="client-select" className="w-full">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClient && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedClient.name}</p>
                  {selectedClient.responsible && (
                    <p className="text-sm text-muted-foreground">
                      Resp: {selectedClient.responsible}
                    </p>
                  )}
                </div>
              </div>
              {selectedClient.document && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedClient.document}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {selectedClient.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedClient.phone}</span>
                </div>
              )}
              {selectedClient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedClient.email}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span className="text-sm">{formatAddress(selectedClient)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
