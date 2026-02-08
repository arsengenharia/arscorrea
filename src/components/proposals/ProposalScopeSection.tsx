import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

interface ProposalScopeSectionProps {
  scopeText: string;
  onScopeChange: (value: string) => void;
}

export const ProposalScopeSection = ({
  scopeText,
  onScopeChange,
}: ProposalScopeSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Escopo dos Serviços
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={scopeText}
          onChange={(e) => onScopeChange(e.target.value)}
          placeholder="Descreva o escopo dos serviços..."
          className="min-h-[300px] font-mono text-sm"
        />
      </CardContent>
    </Card>
  );
};
