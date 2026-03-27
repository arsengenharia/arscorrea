import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface NextPayment {
  id: string;
  contractNumber: string;
  clientName: string;
  description: string;
  expectedDate: string | null;
  expectedValue: number;
  saldoAberto: number;
}

interface NextPaymentsTableProps {
  data: NextPayment[];
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function NextPaymentsTable({ data, isLoading }: NextPaymentsTableProps) {
  return (
    <Card className="shadow-sm border-slate-100">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-md bg-sky-50">
            <Calendar className="h-4 w-4 text-sky-600" />
          </div>
          <h3 className="font-semibold text-base text-slate-800">Proximos Vencimentos</h3>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum vencimento pendente
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.contractNumber}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{payment.clientName}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{payment.description}</TableCell>
                    <TableCell>
                      {payment.expectedDate
                        ? format(new Date(payment.expectedDate), "dd/MM/yyyy", { locale: ptBR })
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.expectedValue)}</TableCell>
                    <TableCell className="text-right font-medium text-amber-600">
                      {formatCurrency(payment.saldoAberto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
