import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator } from "lucide-react";

interface ProposalTotalsSectionProps {
  subtotal: number;
  discountType: "percent" | "fixed";
  discountValue: number;
  total: number;
  onDiscountTypeChange: (value: "percent" | "fixed") => void;
  onDiscountValueChange: (value: number) => void;
}

export const ProposalTotalsSection = ({
  subtotal,
  discountType,
  discountValue,
  total,
  onDiscountTypeChange,
  onDiscountValueChange,
}: ProposalTotalsSectionProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const discountAmount =
    discountType === "percent"
      ? subtotal * (discountValue / 100)
      : discountValue;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Totais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-w-md ml-auto">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

          <div className="space-y-2">
            <Label>Desconto</Label>
            <div className="flex gap-2">
              <Select
                value={discountType}
                onValueChange={(v) => onDiscountTypeChange(v as "percent" | "fixed")}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">R$ (fixo)</SelectItem>
                  <SelectItem value="percent">% (percentual)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step={discountType === "percent" ? "0.1" : "0.01"}
                value={discountValue || ""}
                onChange={(e) => onDiscountValueChange(parseFloat(e.target.value) || 0)}
                className="flex-1"
                placeholder={discountType === "percent" ? "0%" : "R$ 0,00"}
              />
            </div>
            {discountValue > 0 && (
              <p className="text-sm text-muted-foreground">
                Desconto: {formatCurrency(discountAmount)}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center py-3 border-t-2 border-primary">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
