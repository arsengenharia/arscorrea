import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { useState } from "react";
import { User, Phone, Mail, MapPin, FileText, Pencil } from "lucide-react";

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
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

interface ClientDataBlockProps {
  client: Client | null | undefined;
  isLoading: boolean;
  onClientUpdated: () => void;
}

export const ClientDataBlock = ({
  client,
  isLoading,
  onClientUpdated,
}: ClientDataBlockProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const formatAddress = (client: Client) => {
    const parts = [];
    if (client.street) parts.push(client.street);
    if (client.number) parts.push(client.number);
    if (client.complement) parts.push(client.complement);
    if (client.neighborhood) parts.push(client.neighborhood);
    if (client.city && client.state) {
      parts.push(`${client.city}/${client.state}`);
    } else if (client.city) {
      parts.push(client.city);
    }
    if (client.zip_code) parts.push(`CEP: ${client.zip_code}`);
    return parts.join(", ") || "-";
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <>
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-sm text-muted-foreground">Dados do Cliente</h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">{client.name}</p>
                {client.responsible && (
                  <p className="text-sm text-muted-foreground">
                    Resp: {client.responsible}
                  </p>
                )}
              </div>
            </div>
            {client.document && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{client.document}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{client.email}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-sm">{formatAddress(client)}</span>
            </div>
          </div>
        </div>
      </div>

      {client && (
        <EditClientDialog
          client={client}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onClientUpdated={onClientUpdated}
        />
      )}
    </>
  );
};
