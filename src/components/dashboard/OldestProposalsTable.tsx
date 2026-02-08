import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface OldestProposal {
  id: string;
  number: string;
  clientName: string;
  daysOpen: number;
  total: number;
}

interface OldestProposalsTableProps {
  data: OldestProposal[];
  isLoading: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getDaysVariant = (days: number): "default" | "secondary" | "destructive" | "outline" => {
  if (days > 60) return "destructive";
  if (days > 30) return "secondary";
  return "outline";
};

export function OldestProposalsTable({ data, isLoading }: OldestProposalsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-medium">Propostas Mais Antigas em Aberto</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma proposta em aberto
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Dias em Aberto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((proposal) => (
                  <TableRow key={proposal.id}>
                    <TableCell className="font-medium">{proposal.number}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{proposal.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={getDaysVariant(proposal.daysOpen)}>
                        {proposal.daysOpen} dias
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(proposal.total)}</TableCell>
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
