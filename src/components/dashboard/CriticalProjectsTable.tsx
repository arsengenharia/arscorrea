import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface CriticalProject {
  id: string;
  name: string;
  clientName: string;
  status: string;
  endDate: string | null;
  daysOverdue: number;
  manager: string;
}

interface CriticalProjectsTableProps {
  data: CriticalProject[];
  isLoading: boolean;
}

export function CriticalProjectsTable({ data, isLoading }: CriticalProjectsTableProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Obras Críticas / Em Atraso</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhuma obra em atraso.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Gestor</TableHead>
                <TableHead className="text-right">Dias em Atraso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((project) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/obras/${project.id}/relatorio`)}
                >
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.clientName}</TableCell>
                  <TableCell>{project.manager}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={project.daysOverdue > 30 ? "destructive" : "secondary"}>
                      {project.daysOverdue}d
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
