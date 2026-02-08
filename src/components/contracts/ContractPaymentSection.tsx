import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

interface ContractPaymentSectionProps {
  paymentNotes: string;
  entryValue: number;
  installmentsCount: number;
  installmentValue: number;
  total: number;
  onPaymentNotesChange: (value: string) => void;
  onEntryValueChange: (value: number) => void;
  onInstallmentsCountChange: (value: number) => void;
  onInstallmentValueChange: (value: number) => void;
  onGenerateFinancialEntries?: () => void;
}

export function ContractPaymentSection({
  paymentNotes,
  entryValue,
  installmentsCount,
  installmentValue,
  total,
  onPaymentNotesChange,
  onEntryValueChange,
  onInstallmentsCountChange,
  onInstallmentValueChange,
  onGenerateFinancialEntries,
}: ContractPaymentSectionProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate suggested installment value
  const suggestedInstallmentValue = installmentsCount > 0 
    ? (total - entryValue) / installmentsCount 
    : 0;

  const handleUseSuggested = () => {
    onInstallmentValueChange(Math.round(suggestedInstallmentValue * 100) / 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Forma de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Forma de Pagamento (texto livre)</Label>
          <Textarea
            value={paymentNotes}
            onChange={(e) => onPaymentNotesChange(e.target.value)}
            placeholder="Ex: 30% de entrada + 5 parcelas mensais iguais..."
            rows={3}
          />
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Valores estruturados</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Entrada</Label>
              <Input
                type="number"
                value={entryValue}
                onChange={(e) => onEntryValueChange(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Nº de Parcelas</Label>
              <Input
                type="number"
                value={installmentsCount}
                onChange={(e) => onInstallmentsCountChange(parseInt(e.target.value) || 0)}
                min="0"
                step="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor por Parcela</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={installmentValue}
                  onChange={(e) => onInstallmentValueChange(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
                {installmentsCount > 0 && suggestedInstallmentValue > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleUseSuggested}
                    title={`Usar sugerido: ${formatCurrency(suggestedInstallmentValue)}`}
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {installmentsCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatCurrency(suggestedInstallmentValue)}
                </p>
              )}
            </div>
          </div>
        </div>

        {onGenerateFinancialEntries && (entryValue > 0 || installmentsCount > 0) && (
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onGenerateFinancialEntries}
              className="w-full"
            >
              Gerar Lançamentos Financeiros
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Cria registros de entrada e parcelas no módulo financeiro
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
