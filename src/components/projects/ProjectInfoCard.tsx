
import { format } from "date-fns";
import { CalendarIcon, UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formatDate = (date: string | null) => {
  if (!date) return 'Não definida';
  return format(new Date(date), 'dd/MM/yyyy');
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'pendente':
      return 'pending';
    case 'iniciado':
      return 'started';
    case 'concluido':
      return 'completed';
    default:
      return 'default';
  }
};

interface ProjectInfoCardProps {
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  projectManager?: string | null;
}

export function ProjectInfoCard({ name, status, startDate, endDate, projectManager }: ProjectInfoCardProps) {
  // Convert status to display format
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'iniciado':
        return 'Em Andamento';
      case 'concluido':
        return 'Concluído';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações da Obra</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          <Badge variant={getStatusBadgeVariant(status)} className="mt-2">
            {getStatusLabel(status)}
          </Badge>
        </div>
        

        {projectManager && (
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Gestor da Obra</p>
              <p className="text-sm text-muted-foreground">
                {projectManager}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Data de Início</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(startDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Data de Conclusão</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(endDate)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
