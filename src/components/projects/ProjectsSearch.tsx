
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProjectsSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

export function ProjectsSearch({ 
  search, 
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
}: ProjectsSearchProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar obras..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 py-6 rounded-xl border-gray-200 bg-white"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className={`w-full sm:w-[180px] rounded-xl border-gray-200 bg-white ${isMobile ? 'py-4' : 'py-6'}`}>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="iniciado">Em andamento</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className={`w-full sm:w-[180px] rounded-xl border-gray-200 bg-white ${isMobile ? 'py-4' : 'py-6'}`}>
            <SelectValue placeholder="Nome (A-Z)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nome (A-Z)</SelectItem>
            <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
            <SelectItem value="start_date">Data de início (antiga)</SelectItem>
            <SelectItem value="start_date-desc">Data de início (recente)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
