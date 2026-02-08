import { Badge } from "@/components/ui/badge";

interface ProposalStageBadgeProps {
  stageName: string | null;
}

const stageColors: Record<string, string> = {
  "Em aberto": "bg-blue-100 text-blue-700 hover:bg-blue-200",
  "Fachada": "bg-green-100 text-green-700 hover:bg-green-200",
  "Em análise": "bg-amber-100 text-amber-700 hover:bg-amber-200",
  "Perdida": "bg-red-100 text-red-700 hover:bg-red-200",
};

export const ProposalStageBadge = ({ stageName }: ProposalStageBadgeProps) => {
  if (!stageName) return <span className="text-muted-foreground">-</span>;

  const colorClasses = stageColors[stageName] || "bg-gray-100 text-gray-700";

  return (
    <Badge variant="outline" className={`border-0 ${colorClasses}`}>
      {stageName}
    </Badge>
  );
};
