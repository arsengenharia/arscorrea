import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Info } from "lucide-react";
import { ClientDataBlock } from "./ClientDataBlock";

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

interface ProposalWorkSectionProps {
  // Mantemos estas props aqui para NÃO quebrar o componente pai
  // e para evitar ajustes desnecessários no restante do app.
  condoName: string;
  workAddress: string;
  city: string;
  state: string;
  onCondoNameChange: (value: string) => void;
  onWorkAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;

  selectedClient: Client | null | undefined;
  isLoadingClient: boolean;
  onClientUpdated: () => void;
}

export const ProposalWorkSection = (props: ProposalWorkSectionProps) => {
  const { selectedClient, isLoadingClient, onClientUpdated } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Dados da Obra
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Card do Cliente */}
        {!selectedClient && !isLoadingClient ? (
          <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg text-muted-foreground">
            <Info className="h-4 w-4" />
            <span className="text-sm">Selecione um cliente para carregar os dados</span>
          </div>
        ) : (
          <ClientDataBlock
            client={selectedClient || null}
            isLoading={isLoadingClient}
            onClientUpdated={onClientUpdated}
          />
        )}

        {/* Campos da obra removidos conforme solicitado */}
      </CardContent>
    </Card>
  );
};
