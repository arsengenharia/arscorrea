import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
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
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg font-medium">Obras Críticas / Em Atraso</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Nenhuma obra em atraso.
          </div>
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
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/obras/${project.id}/relatorio`)}
                >
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.clientName}</TableCell>
                  <TableCell>{project.manager}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={project.daysOverdue > 30 ? "destructive" : "secondary"}
                      className={project.daysOverdue > 30 ? "" : "bg-amber-50 text-amber-700 border-transparent"}
                    >
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
