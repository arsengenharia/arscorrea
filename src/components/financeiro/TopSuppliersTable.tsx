import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL } from "@/lib/formatters";

interface EntryForSuppliers {
  valor: number;
  supplier: { trade_name: string } | null;
}

interface TopSuppliersTableProps {
  entries: EntryForSuppliers[];
}

export function TopSuppliersTable({ entries }: TopSuppliersTableProps) {
  // Filter costs with suppliers
  const costs = entries.filter((e) => e.valor < 0 && e.supplier !== null);

  if (costs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Fornecedores</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Sem dados de fornecedores
        </CardContent>
      </Card>
    );
  }

  // Group by supplier name
  const supplierMap: Record<string, number> = {};
  costs.forEach((e) => {
    const name = e.supplier!.trade_name;
    supplierMap[name] = (supplierMap[name] ?? 0) + Math.abs(e.valor);
  });

  const sorted = Object.entries(supplierMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Fornecedores</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Total Gasto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(([name, total], index) => (
              <TableRow key={name}>
                <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell className="text-right font-mono text-red-600">{formatBRL(total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
