import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react";
import { PaymentLine } from "@/lib/paymentTypes";

interface PaymentSummaryProps {
  contractTotal: number;
  paymentLines: PaymentLine[];
}

export function PaymentSummary({ contractTotal, paymentLines }: PaymentSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calcular totais excluindo comissões
  const paymentOnlyLines = paymentLines.filter((l) => l.kind !== "comissao");
  const totalExpected = paymentOnlyLines.reduce((sum, l) => sum + (l.expected_value || 0), 0);
  const totalReceived = paymentOnlyLines.reduce((sum, l) => sum + (l.received_value || 0), 0);

  // Calcular totais de comissões
  const commissionLines = paymentLines.filter((l) => l.kind === "comissao");
  const commissionExpected = commissionLines.reduce((sum, l) => sum + (l.expected_value || 0), 0);
  const commissionReceived = commissionLines.reduce((sum, l) => sum + (l.received_value || 0), 0);

  // Diferenças
  const expectedDifference = contractTotal - totalExpected;
  const receivedBalance = totalExpected - totalReceived;
  const commissionBalance = commissionExpected - commissionReceived;

  // Alertas
  const alerts: { type: "warning" | "error" | "info"; message: string }[] = [];

  if (Math.abs(expectedDifference) > 0.01) {
    alerts.push({
      type: "warning",
      message: `Valor previsto difere do total do contrato em ${formatCurrency(Math.abs(expectedDifference))}`,
    });
  }

  if (totalReceived > totalExpected) {
    alerts.push({
      type: "error",
      message: "Valores recebidos superam o previsto",
    });
  }

  if (commissionBalance > 0) {
    alerts.push({
      type: "info",
      message: `Comissão pendente: ${formatCurrency(commissionBalance)}`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Total Contrato
            </div>
            <p className="text-xl font-bold">{formatCurrency(contractTotal)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Previsto
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalExpected)}</p>
            {Math.abs(expectedDifference) > 0.01 && (
              <p className="text-xs text-muted-foreground">
                Diferença: {formatCurrency(expectedDifference)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingDown className="h-4 w-4" />
              Recebido
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalReceived)}</p>
            {receivedBalance > 0 && (
              <p className="text-xs text-muted-foreground">
                A receber: {formatCurrency(receivedBalance)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Comissão
            </div>
            <p className="text-xl font-bold">
              {formatCurrency(commissionReceived)}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}/ {formatCurrency(commissionExpected)}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              variant={alert.type === "error" ? "destructive" : "default"}
              className={
                alert.type === "warning"
                  ? "border-yellow-500 bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
                  : alert.type === "info"
                  ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                  : ""
              }
            >
              {alert.type === "warning" && <AlertTriangle className="h-4 w-4" />}
              {alert.type === "info" && <Info className="h-4 w-4" />}
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}
