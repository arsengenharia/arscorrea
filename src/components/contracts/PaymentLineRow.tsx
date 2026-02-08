import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { PaymentLine, PAYMENT_KINDS, PAYMENT_STATUSES } from "@/lib/paymentTypes";

interface PaymentLineRowProps {
  line: PaymentLine;
  index: number;
  totalLines: number;
  onUpdate: (field: keyof PaymentLine, value: string | number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function PaymentLineRow({
  line,
  index,
  totalLines,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: PaymentLineRowProps) {
  const formatCurrencyInput = (value: number) => {
    return value ? value.toString() : "";
  };

  return (
    <TableRow>
      <TableCell className="w-[60px]">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMoveDown}
            disabled={index === totalLines - 1}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>

      <TableCell className="min-w-[120px]">
        <Select value={line.kind} onValueChange={(v) => onUpdate("kind", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_KINDS.map((kind) => (
              <SelectItem key={kind.value} value={kind.value}>
                {kind.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="min-w-[150px]">
        <Input
          value={line.description}
          onChange={(e) => onUpdate("description", e.target.value)}
          placeholder="Descrição"
        />
      </TableCell>

      <TableCell className="w-[120px]">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={formatCurrencyInput(line.expected_value)}
          onChange={(e) => onUpdate("expected_value", parseFloat(e.target.value) || 0)}
          placeholder="0,00"
        />
      </TableCell>

      <TableCell className="w-[130px]">
        <Input
          type="date"
          value={line.expected_date || ""}
          onChange={(e) => onUpdate("expected_date", e.target.value)}
        />
      </TableCell>

      <TableCell className="w-[120px]">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={formatCurrencyInput(line.received_value)}
          onChange={(e) => onUpdate("received_value", parseFloat(e.target.value) || 0)}
          placeholder="0,00"
        />
      </TableCell>

      <TableCell className="w-[130px]">
        <Input
          type="date"
          value={line.received_date || ""}
          onChange={(e) => onUpdate("received_date", e.target.value)}
        />
      </TableCell>

      <TableCell className="w-[120px]">
        <Select value={line.status} onValueChange={(v) => onUpdate("status", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="w-[50px]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
