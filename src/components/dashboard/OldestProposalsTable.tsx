import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils"; // Assumindo utilitário padrão do shadcn/ui

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

// Lógica de Cores: Escala de 3 em 3 dias (Verde -> Vermelho)
// Usamos cores pastéis (bg-50/100) para o fundo e cores fortes (text-900) para o texto
const getRowStyles = (days: number) => {
  if (days <= 3) return "bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-900"; // 0-3: Verde Fresco
  if (days <= 6) return "bg-lime-50 hover:bg-lime-100 border-lime-100 text-lime-900"; // 4-6: Lima
  if (days <= 9) return "bg-yellow-50 hover:bg-yellow-100 border-yellow-100 text-yellow-900"; // 7-9: Amarelo
  if (days <= 12) return "bg-amber-50 hover:bg-amber-100 border-amber-100 text-amber-900"; // 10-12: Âmbar
  if (days <= 15) return "bg-orange-50 hover:bg-orange-100 border-orange-100 text-orange-900"; // 13-15: Laranja
  if (days <= 18) return "bg-red-50 hover:bg-red-100 border-red-100 text-red-900"; // 16-18: Vermelho Claro
  return "bg-rose-100 hover:bg-rose-200 border-rose-200 text-rose-950 font-medium"; // 19+: Vermelho Intenso
};

const getBadgeStyles = (days: number) => {
  if (days <= 3) return "bg-emerald-200/50 text-emerald-800 hover:bg-emerald-200";
  if (days <= 6) return "bg-lime-200/50 text-lime-800 hover:bg-lime-200";
  if (days <= 9) return "bg-yellow-200/50 text-yellow-800 hover:bg-yellow-200";
  if (days <= 12) return "bg-amber-200/50 text-amber-800 hover:bg-amber-200";
  if (days <= 15) return "bg-orange-200/50 text-orange-800 hover:bg-orange-200";
  if (days <= 18) return "bg-red-200/50 text-red-800 hover:bg-red-200";
  return "bg-rose-300/50 text-rose-900 hover:bg-rose-300";
};

export function OldestProposalsTable({ data, isLoading }: OldestProposalsTableProps) {
  return (
    <Card className="shadow-none border border-slate-100 bg-white">
      <CardHeader className="pb-4 pt-6 px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-xl">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-slate-800">Atenção: Propostas Antigas</CardTitle>
            <p className="text-xs text-slate-400 mt-1">Prioridade baseada no tempo de abertura</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Clock className="h-8 w-8 mb-2 opacity-20" />
            <span className="text-sm">Nenhuma proposta crítica em aberto</span>
          </div>
        ) : (
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-4">
                    Número
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Cliente
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
                    Tempo
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-right pr-4">
                    Valor
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="space-y-2">
                {/* Adicionamos space-y para criar separação entre as 'cartas' da tabela */}
                {data.map((proposal) => (
                  <TableRow
                    key={proposal.id}
                    className={cn(
                      "transition-all duration-200 border-b-0",
                      "rounded-lg border", // Borda sutil para definição
                      getRowStyles(proposal.daysOpen),
                    )}
                    // Hack CSS para bordas arredondadas em TableRow funcionar bem
                    style={{
                      display: "table-row",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                    }}
                  >
                    <TableCell className="font-medium py-3 pl-4 rounded-l-lg">{proposal.number}</TableCell>
                    <TableCell className="max-w-[180px] truncate py-3 font-medium opacity-90">
                      {proposal.clientName}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-0 font-semibold shadow-none backdrop-blur-sm",
                          getBadgeStyles(proposal.daysOpen),
                        )}
                      >
                        {proposal.daysOpen} dias
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-3 pr-4 rounded-r-lg font-semibold opacity-90">
                      {formatCurrency(proposal.total)}
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
