import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PeriodType, DateRange } from "@/hooks/use-dashboard-metrics";

interface DashboardFiltersProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  customRange: DateRange;
  onCustomRangeChange: (range: DateRange) => void;
  activeTab?: string;
  managerFilter?: string;
  onManagerFilterChange?: (value: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  projectManagers?: string[];
  projectStatuses?: string[];
}

const periodOptions: { label: string; value: PeriodType }[] = [
  { label: "Hoje", value: "today" },
  { label: "7 dias", value: "7days" },
  { label: "30 dias", value: "30days" },
  { label: "Mês", value: "month" },
  { label: "Personalizado", value: "custom" },
];

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  concluded: "Concluída",
  paused: "Pausada",
};

export function DashboardFilters({
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
  activeTab,
  managerFilter,
  onManagerFilterChange,
  statusFilter,
  onStatusFilterChange,
  projectManagers = [],
  projectStatuses = [],
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1">
        {periodOptions.map((option) => (
          <Button
            key={option.value}
            variant={period === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onPeriodChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !customRange.start && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customRange.start
                  ? format(customRange.start, "dd/MM/yyyy", { locale: ptBR })
                  : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.start}
                onSelect={(date) =>
                  date && onCustomRangeChange({ ...customRange, start: date })
                }
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !customRange.end && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customRange.end
                  ? format(customRange.end, "dd/MM/yyyy", { locale: ptBR })
                  : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange.end}
                onSelect={(date) =>
                  date && onCustomRangeChange({ ...customRange, end: date })
                }
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {activeTab === "projects" && (
        <div className="flex items-center gap-2 ml-2">
          {projectManagers.length > 0 && (
            <Select value={managerFilter || "all"} onValueChange={(v) => onManagerFilterChange?.(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Gestor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Gestores</SelectItem>
                {projectManagers.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {projectStatuses.length > 0 && (
            <Select value={statusFilter || "all"} onValueChange={(v) => onStatusFilterChange?.(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {projectStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
