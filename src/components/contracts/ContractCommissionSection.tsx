import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContractCommissionSectionProps {
  expectedValue: number;
  expectedDate: string;
  notes: string;
  onExpectedValueChange: (value: number) => void;
  onExpectedDateChange: (date: string) => void;
  onNotesChange: (notes: string) => void;
}

export function ContractCommissionSection({
  expectedValue,
  expectedDate,
  notes,
  onExpectedValueChange,
  onExpectedDateChange,
  onNotesChange,
}: ContractCommissionSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comissionamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Valor Previsto</Label>
            <Input
              type="number"
              value={expectedValue}
              onChange={(e) => onExpectedValueChange(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>Data de Previsão</Label>
            <Input
              type="date"
              value={expectedDate}
              onChange={(e) => onExpectedDateChange(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Observações sobre o comissionamento..."
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
