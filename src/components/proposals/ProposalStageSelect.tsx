import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ProposalStageBadge } from "./ProposalStageBadge";

interface ProposalStageSelectProps {
  proposalId: string;
  currentStageId: string | null;
  currentStageName: string | null;
}

type ProposalStage = {
  id: string;
  name: string;
  order_index: number;
};

export const ProposalStageSelect = ({
  proposalId,
  currentStageId,
  currentStageName,
}: ProposalStageSelectProps) => {
  const queryClient = useQueryClient();

  const { data: stages } = useQuery({
    queryKey: ["proposal-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_stages")
        .select("id, name, order_index")
        .eq("is_active", true)
        .order("order_index");

      if (error) throw error;
      return data as ProposalStage[];
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase
        .from("proposals")
        .update({ stage_id: stageId })
        .eq("id", proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Situação atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar situação");
    },
  });

  const handleChange = (stageId: string) => {
    if (stageId !== currentStageId) {
      updateStageMutation.mutate(stageId);
    }
  };

  return (
    <Select value={currentStageId || undefined} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px] h-8 border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 p-0">
        <SelectValue>
          <ProposalStageBadge stageName={currentStageName} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {stages?.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            {stage.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
