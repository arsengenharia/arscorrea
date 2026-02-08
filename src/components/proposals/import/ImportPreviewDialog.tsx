import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, AlertTriangle } from "lucide-react";
import { ParsedProposalData } from "./types";

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ParsedProposalData;
  onApply: (data: ParsedProposalData) => void;
}

const ConfidenceBadge = ({ value }: { value: number }) => {
  if (value >= 0.8) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        Alta
      </Badge>
    );
  }
  if (value >= 0.5) {
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        Média
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      Baixa
    </Badge>
  );
};

const formatCurrency = (value: number | null) => {
  if (value === null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const ImportPreviewDialog = ({
  open,
  onOpenChange,
  data,
  onApply,
}: ImportPreviewDialogProps) => {
  const hasLowConfidence = Object.values(data.confidence || {}).some((v) => v < 0.5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Pré-visualização da Importação
            {hasLowConfidence && (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
          </DialogTitle>
          <DialogDescription>
            Revise os dados extraídos do PDF antes de aplicar na proposta.
            {hasLowConfidence && (
              <span className="text-yellow-600 block mt-1">
                Alguns campos têm baixa confiança. Verifique-os após aplicar.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Scope */}
            {data.scope_text && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Escopo</h4>
                  <ConfidenceBadge value={data.confidence?.scope_text || 0} />
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {data.scope_text}
                </div>
              </div>
            )}

            {/* Items */}
            {data.items && data.items.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Itens ({data.items.length})</h4>
                  <ConfidenceBadge value={data.confidence?.items || 0} />
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[70px]">Unid.</TableHead>
                        <TableHead className="w-[80px] text-right">Qtd</TableHead>
                        <TableHead className="w-[100px] text-right">Unit.</TableHead>
                        <TableHead className="w-[100px] text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-xs">
                            {item.category || "Outros"}
                          </TableCell>
                          <TableCell className="text-sm">{item.description}</TableCell>
                          <TableCell className="text-xs">{item.unit || "-"}</TableCell>
                          <TableCell className="text-right text-xs">
                            {item.quantity ?? "-"}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Totals */}
            {data.totals && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Totais</h4>
                  <ConfidenceBadge value={data.confidence?.totals || 0} />
                </div>
                <div className="bg-muted/50 p-3 rounded-md space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(data.totals.subtotal)}</span>
                  </div>
                  {data.totals.discount_value && data.totals.discount_value > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Desconto ({data.totals.discount_type === "percent" ? "%" : "R$"}):
                      </span>
                      <span>
                        {data.totals.discount_type === "percent"
                          ? `${data.totals.discount_value}%`
                          : formatCurrency(data.totals.discount_value)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(data.totals.total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Terms */}
            {data.payment_terms && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Forma de Pagamento</h4>
                  <ConfidenceBadge value={data.confidence?.payment_terms || 0} />
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">
                  {data.payment_terms}
                </div>
              </div>
            )}

            {/* Warranty */}
            {data.warranty_terms && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Garantia</h4>
                  <ConfidenceBadge value={data.confidence?.warranty_terms || 0} />
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">
                  {data.warranty_terms}
                </div>
              </div>
            )}

            {/* Exclusions */}
            {data.exclusions && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Exclusões</h4>
                  <ConfidenceBadge value={data.confidence?.exclusions || 0} />
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">
                  {data.exclusions}
                </div>
              </div>
            )}

            {/* Notes */}
            {data.notes && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Observações</h4>
                  <ConfidenceBadge value={data.confidence?.notes || 0} />
                </div>
                <div className="bg-muted/50 p-3 rounded-md text-sm whitespace-pre-wrap">
                  {data.notes}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={() => onApply(data)}>
            <Check className="h-4 w-4 mr-2" />
            Aplicar na Proposta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
