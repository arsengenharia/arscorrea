
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectStatusSelectProps {
  status: string;
  onStatusChange: (value: string) => void;
}

export function ProjectStatusSelect({ status, onStatusChange }: ProjectStatusSelectProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'iniciado':
        return 'started';
      case 'concluido':
        return 'completed';
      case 'pendente':
      default:
        return 'pending';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'iniciado':
        return 'Em Andamento';
      case 'concluido':
        return 'Concluído';
      default:
        return 'Pendente';
    }
  };

  return (
    <Select defaultValue={status} onValueChange={onStatusChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue>
          <Badge variant={getStatusBadgeVariant(status)}>
            {getStatusLabel(status)}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pendente">
          <Badge variant="pending">Pendente</Badge>
        </SelectItem>
        <SelectItem value="iniciado">
          <Badge variant="started">Em Andamento</Badge>
        </SelectItem>
        <SelectItem value="concluido">
          <Badge variant="completed">Concluído</Badge>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
