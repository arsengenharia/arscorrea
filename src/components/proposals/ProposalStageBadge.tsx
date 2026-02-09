import { Badge } from "@/components/ui/badge";

interface ProposalStageBadgeProps {
  stageName: string | null;
}

const stageColors: Record<string, string> = {
  "Proposta em aberto (inicial)": "bg-blue-100 text-blue-700 hover:bg-blue-200",
  "Visita agendada": "bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
  "Visita realizada": "bg-purple-100 text-purple-700 hover:bg-purple-200",
  "Proposta enviada": "bg-cyan-100 text-cyan-700 hover:bg-cyan-200",
  "Reunião marcada para entrega": "bg-amber-100 text-amber-700 hover:bg-amber-200",
  "Proposta em aberto": "bg-sky-100 text-sky-700 hover:bg-sky-200",
  "Proposta recusada": "bg-red-100 text-red-700 hover:bg-red-200",
  "Proposta aprovada": "bg-green-100 text-green-700 hover:bg-green-200",
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
