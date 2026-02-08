
import { HomeIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClientInfoCardProps {
  client: {
    name: string;
    code?: string | null;
    responsible?: string | null;
    email?: string | null;
    phone?: string | null;
    street?: string | null;
    number?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
  } | null;
}

export function ClientInfoCard({ client }: ClientInfoCardProps) {
  if (!client) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{client.name}</h3>
          {client.code && (
            <Badge variant="outline" className="mt-1">
              Código: {client.code}
            </Badge>
          )}
        </div>

        {client.responsible && (
          <div>
            <p className="text-sm font-medium">Responsável</p>
            <p className="text-sm text-muted-foreground">
              {client.responsible}
            </p>
          </div>
        )}

        {(client.email || client.phone) && (
          <div className="space-y-2">
            {client.email && (
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {client.email}
                </p>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-sm font-medium">Telefone</p>
                <p className="text-sm text-muted-foreground">
                  {client.phone}
                </p>
              </div>
            )}
          </div>
        )}

        {(client.street || client.city || client.state) && (
          <div className="flex items-start gap-2">
            <HomeIcon className="w-4 h-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium">Endereço</p>
              <p className="text-sm text-muted-foreground">
                {[
                  client.street && `${client.street}${client.number ? `, ${client.number}` : ''}`,
                  client.city,
                  client.state,
                  client.zip_code
                ].filter(Boolean).join(' - ')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
