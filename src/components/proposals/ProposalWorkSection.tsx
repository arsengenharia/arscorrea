import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

interface ProposalWorkSectionProps {
  condoName: string;
  workAddress: string;
  city: string;
  state: string;
  onCondoNameChange: (value: string) => void;
  onWorkAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
}

export const ProposalWorkSection = ({
  condoName,
  workAddress,
  city,
  state,
  onCondoNameChange,
  onWorkAddressChange,
  onCityChange,
  onStateChange,
}: ProposalWorkSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Dados da Obra
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="condo-name">Condomínio / Empreendimento</Label>
            <Input
              id="condo-name"
              value={condoName}
              onChange={(e) => onCondoNameChange(e.target.value)}
              placeholder="Nome do condomínio ou empreendimento"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-address">Endereço da Obra</Label>
            <Input
              id="work-address"
              value={workAddress}
              onChange={(e) => onWorkAddressChange(e.target.value)}
              placeholder="Endereço completo"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="Cidade"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">UF</Label>
            <Select value={state} onValueChange={onStateChange}>
              <SelectTrigger id="state">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_STATES.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
