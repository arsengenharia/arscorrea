import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileCheck } from "lucide-react";

interface ProposalTermsSectionProps {
  validityDays: number;
  executionDays: number;
  paymentTerms: string;
  warrantyTerms: string;
  exclusions: string;
  notes: string;
  onValidityDaysChange: (value: number) => void;
  onExecutionDaysChange: (value: number) => void;
  onPaymentTermsChange: (value: string) => void;
  onWarrantyTermsChange: (value: string) => void;
  onExclusionsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export const ProposalTermsSection = ({
  validityDays,
  executionDays,
  paymentTerms,
  warrantyTerms,
  exclusions,
  notes,
  onValidityDaysChange,
  onExecutionDaysChange,
  onPaymentTermsChange,
  onWarrantyTermsChange,
  onExclusionsChange,
  onNotesChange,
}: ProposalTermsSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Condições Comerciais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="execution-days">Prazo de Execução (dias)</Label>
            <Input
              id="execution-days"
              type="number"
              min="1"
              value={executionDays}
              onChange={(e) => onExecutionDaysChange(parseInt(e.target.value) || 60)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validity-days">Validade da Proposta (dias)</Label>
            <Input
              id="validity-days"
              type="number"
              min="1"
              value={validityDays}
              onChange={(e) => onValidityDaysChange(parseInt(e.target.value) || 10)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-terms">Forma de Pagamento</Label>
          <Textarea
            id="payment-terms"
            value={paymentTerms}
            onChange={(e) => onPaymentTermsChange(e.target.value)}
            placeholder="Descreva as condições de pagamento..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="warranty-terms">Garantia</Label>
          <Textarea
            id="warranty-terms"
            value={warrantyTerms}
            onChange={(e) => onWarrantyTermsChange(e.target.value)}
            placeholder="Descreva os termos de garantia..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exclusions">Exclusões</Label>
          <Textarea
            id="exclusions"
            value={exclusions}
            onChange={(e) => onExclusionsChange(e.target.value)}
            placeholder="Liste o que não está incluso na proposta..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Observações gerais..."
            className="min-h-[100px]"
          />
        </div>
      </CardContent>
    </Card>
  );
};
