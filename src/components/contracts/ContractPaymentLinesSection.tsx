import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Wand2, CreditCard } from "lucide-react";
import { PaymentLine } from "@/lib/paymentTypes";
import { PaymentSummary } from "./PaymentSummary";
import { PaymentLineRow } from "./PaymentLineRow";
import { GeneratePaymentsDialog } from "./GeneratePaymentsDialog";

interface ContractPaymentLinesSectionProps {
  contractTotal: number;
  paymentLines: PaymentLine[];
  onPaymentLinesChange: (lines: PaymentLine[]) => void;
  paymentNotes: string;
  onPaymentNotesChange: (notes: string) => void;
}

export function ContractPaymentLinesSection({
  contractTotal,
  paymentLines,
  onPaymentLinesChange,
  paymentNotes,
  onPaymentNotesChange,
}: ContractPaymentLinesSectionProps) {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  const addLine = () => {
    const newLine: PaymentLine = {
      id: crypto.randomUUID(),
      kind: "parcela",
      description: "",
      expected_value: 0,
      expected_date: null,
      received_value: 0,
      received_date: null,
      status: "pendente",
      order_index: paymentLines.length,
    };
    onPaymentLinesChange([...paymentLines, newLine]);
  };

  const updateLine = (index: number, field: keyof PaymentLine, value: string | number) => {
    const updated = [...paymentLines];
    updated[index] = { ...updated[index], [field]: value };
    onPaymentLinesChange(updated);
  };

  const removeLine = (index: number) => {
    const updated = paymentLines.filter((_, i) => i !== index);
    // Reindex
    updated.forEach((line, i) => {
      line.order_index = i;
    });
    onPaymentLinesChange(updated);
  };

  const moveLine = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= paymentLines.length) return;

    const updated = [...paymentLines];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    
    // Reindex
    updated.forEach((line, i) => {
      line.order_index = i;
    });
    
    onPaymentLinesChange(updated);
  };

  const handleGenerate = (lines: PaymentLine[]) => {
    // Add IDs to generated lines
    const linesWithIds = lines.map((line) => ({
      ...line,
      id: crypto.randomUUID(),
    }));
    onPaymentLinesChange(linesWithIds);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Forma de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <PaymentSummary contractTotal={contractTotal} paymentLines={paymentLines} />

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={addLine} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Linha
          </Button>
          <Button
            onClick={() => setShowGenerateDialog(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Gerar Linhas (Assistido)
          </Button>
        </div>

        {/* Lines Table */}
        {paymentLines.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]"></TableHead>
                  <TableHead className="min-w-[120px]">Tipo</TableHead>
                  <TableHead className="min-w-[150px]">Descrição</TableHead>
                  <TableHead className="w-[120px]">Previsto</TableHead>
                  <TableHead className="w-[130px]">Data Prev.</TableHead>
                  <TableHead className="w-[120px]">Recebido</TableHead>
                  <TableHead className="w-[130px]">Data Rec.</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentLines.map((line, index) => (
                  <PaymentLineRow
                    key={line.id || index}
                    line={line}
                    index={index}
                    totalLines={paymentLines.length}
                    onUpdate={(field, value) => updateLine(index, field, value)}
                    onMoveUp={() => moveLine(index, "up")}
                    onMoveDown={() => moveLine(index, "down")}
                    onRemove={() => removeLine(index)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            <p>Nenhuma linha de pagamento</p>
            <p className="text-sm">
              Adicione manualmente ou use o assistente para gerar
            </p>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Observações de Pagamento</Label>
          <Textarea
            value={paymentNotes}
            onChange={(e) => onPaymentNotesChange(e.target.value)}
            placeholder="Informações adicionais sobre a forma de pagamento..."
            rows={2}
          />
        </div>

        <GeneratePaymentsDialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
          contractTotal={contractTotal}
          onGenerate={handleGenerate}
        />
      </CardContent>
    </Card>
  );
}
