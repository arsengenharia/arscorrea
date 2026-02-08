import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, User } from "lucide-react";
import { EditClientDialog } from "@/components/clients/EditClientDialog";

interface Client {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  responsible?: string | null;
}

interface ContractClientSectionProps {
  client: Client | null;
  onClientUpdated?: () => void;
}

export function ContractClientSection({ client, onClientUpdated }: ContractClientSectionProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (!client) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Selecione uma proposta para visualizar os dados do cliente.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatAddress = () => {
    const parts = [
      client.street,
      client.number,
      client.complement,
      client.neighborhood,
      client.city,
      client.state,
      client.zip_code,
    ].filter(Boolean);
    return parts.join(", ") || "Não informado";
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Dados do Cliente
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            className="gap-1"
          >
            <Pencil className="h-3 w-3" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{client.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CNPJ/CPF</p>
              <p className="font-medium">{client.document || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Responsável</p>
              <p className="font-medium">{client.responsible || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{client.phone || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">E-mail</p>
              <p className="font-medium">{client.email || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Endereço</p>
              <p className="font-medium">{formatAddress()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditClientDialog
        client={client}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onClientUpdated={onClientUpdated || (() => {})}
      />
    </>
  );
}
