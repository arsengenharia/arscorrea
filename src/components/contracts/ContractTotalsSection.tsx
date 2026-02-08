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

interface ContractTotalsSectionProps {
  subtotal: number;
  discountType: string;
  discountValue: number;
  total: number;
  onDiscountTypeChange: (type: string) => void;
  onDiscountValueChange: (value: number) => void;
}

export function ContractTotalsSection({
  subtotal,
  discountType,
  discountValue,
  total,
  onDiscountTypeChange,
  onDiscountValueChange,
}: ContractTotalsSectionProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Totais</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-muted-foreground">Desconto</Label>
              <div className="flex gap-2 mt-1">
                <Select value={discountType} onValueChange={onDiscountTypeChange}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">R$</SelectItem>
                    <SelectItem value="percent">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => onDiscountValueChange(parseFloat(e.target.value) || 0)}
                  className="flex-1"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
