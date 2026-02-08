import { Badge } from "@/components/ui/badge";

interface ProposalStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  sent: { label: "Enviada", variant: "default" },
  approved: { label: "Aprovada", variant: "default" },
  rejected: { label: "Rejeitada", variant: "destructive" },
};

export const ProposalStatusBadge = ({ status }: ProposalStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge
      variant={config.variant}
      className={
        status === "approved"
          ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
          : status === "sent"
          ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
          : ""
      }
    >
      {config.label}
    </Badge>
  );
};
