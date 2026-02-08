import { useState } from "react";
import { addMonths, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentLine } from "@/lib/paymentTypes";

interface GeneratePaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractTotal: number;
  onGenerate: (lines: PaymentLine[]) => void;
}

export function GeneratePaymentsDialog({
  open,
  onOpenChange,
  contractTotal,
  onGenerate,
}: GeneratePaymentsDialogProps) {
  const [entryValue, setEntryValue] = useState(0);
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(
    format(addMonths(new Date(), 1), "yyyy-MM-dd")
  );
  const [includeCommission, setIncludeCommission] = useState(false);
  const [commissionValue, setCommissionValue] = useState(0);
  const [commissionDate, setCommissionDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  const installmentValue =
    installmentsCount > 0 ? (contractTotal - entryValue) / installmentsCount : 0;

  const handleGenerate = () => {
    const lines: PaymentLine[] = [];
    let orderIndex = 0;

    // Entrada
    if (entryValue > 0) {
      lines.push({
        kind: "entrada",
        description: "Entrada",
        expected_value: entryValue,
        expected_date: format(new Date(), "yyyy-MM-dd"),
        received_value: 0,
        received_date: null,
        status: "pendente",
        order_index: orderIndex++,
      });
    }

    // Parcelas
    const firstDate = new Date(firstInstallmentDate);
    for (let i = 0; i < installmentsCount; i++) {
      const parcelDate = addMonths(firstDate, i);
      lines.push({
        kind: "parcela",
        description: `Parcela ${i + 1}/${installmentsCount}`,
        expected_value: installmentValue,
        expected_date: format(parcelDate, "yyyy-MM-dd"),
        received_value: 0,
        received_date: null,
        status: "pendente",
        order_index: orderIndex++,
      });
    }

    // Comissão
    if (includeCommission && commissionValue > 0) {
      lines.push({
        kind: "comissao",
        description: "Comissão",
        expected_value: commissionValue,
        expected_date: commissionDate,
        received_value: 0,
        received_date: null,
        status: "pendente",
        order_index: orderIndex++,
      });
    }

    onGenerate(lines);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerar Linhas de Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">Total do Contrato</p>
            <p className="text-lg font-bold">{formatCurrency(contractTotal)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry">Valor da Entrada</Label>
              <Input
                id="entry"
                type="number"
                min="0"
                step="0.01"
                value={entryValue || ""}
                onChange={(e) => setEntryValue(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installments">Nº de Parcelas</Label>
              <Input
                id="installments"
                type="number"
                min="1"
                value={installmentsCount}
                onChange={(e) =>
                  setInstallmentsCount(parseInt(e.target.value) || 1)
                }
              />
            </div>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">Valor por Parcela</p>
            <p className="text-lg font-bold">{formatCurrency(installmentValue)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstDate">Data da 1ª Parcela</Label>
            <Input
              id="firstDate"
              type="date"
              value={firstInstallmentDate}
              onChange={(e) => setFirstInstallmentDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Parcelas subsequentes a cada 30 dias
            </p>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCommission"
                checked={includeCommission}
                onCheckedChange={(checked) =>
                  setIncludeCommission(checked as boolean)
                }
              />
              <Label htmlFor="includeCommission">Incluir linha de comissão</Label>
            </div>

            {includeCommission && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="commissionValue">Valor da Comissão</Label>
                  <Input
                    id="commissionValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={commissionValue || ""}
                    onChange={(e) =>
                      setCommissionValue(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commissionDate">Data Prevista</Label>
                  <Input
                    id="commissionDate"
                    type="date"
                    value={commissionDate}
                    onChange={(e) => setCommissionDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate}>Gerar Linhas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
