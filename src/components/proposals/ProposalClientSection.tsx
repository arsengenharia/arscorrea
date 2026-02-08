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
import { AlertCircle } from "lucide-react";

interface ProposalClientSectionProps {
  clientId: string;
  onClientChange: (clientId: string) => void;
}

export const ProposalClientSection = ({
  clientId,
  onClientChange,
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
        <CardTitle>Cliente</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};
