import { Badge } from "@/components/ui/badge";

interface ContractStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  em_assinatura: { label: "Em Assinatura", variant: "secondary" },
  encerrado: { label: "Encerrado", variant: "outline" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" as const };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
