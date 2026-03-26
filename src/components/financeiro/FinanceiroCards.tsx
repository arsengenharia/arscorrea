import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";
import { formatBRL, formatPercent } from "@/lib/formatters";

interface FinanceiroCardsProps {
  totalRecebido: number;
  totalGasto: number;
  saldo: number;
  margem: number;
  iecAtual: number | null;
}

export function FinanceiroCards({ totalRecebido, totalGasto, saldo, margem, iecAtual }: FinanceiroCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">{formatBRL(totalRecebido)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700">{formatBRL(totalGasto)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo da Obra</CardTitle>
          <Wallet className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${saldo >= 0 ? "text-green-700" : "text-red-700"}`}>{formatBRL(saldo)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Margem Bruta</CardTitle>
          <BarChart3 className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(margem)}</div>
          {iecAtual !== null && (
            <p className={`text-xs mt-1 ${iecAtual > 1 ? "text-red-600" : "text-green-600"}`}>
              IEC: {iecAtual.toFixed(3)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
