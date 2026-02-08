import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Proposal {
  id: string;
  number: string | null;
  title: string | null;
  total: number | null;
  client_id: string;
  clients: {
    name: string;
    document: string | null;
  };
}

interface ContractProposalSelectProps {
  value: string;
  onChange: (proposalId: string, proposal: Proposal) => void;
  disabled?: boolean;
}

export function ContractProposalSelect({ value, onChange, disabled }: ContractProposalSelectProps) {
  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposals-for-contract"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select(`
          id,
          number,
          title,
          total,
          client_id,
          scope_text,
          subtotal,
          discount_type,
          discount_value,
          payment_terms,
          clients (
            id,
            name,
            document,
            phone,
            email,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            zip_code,
            responsible
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleChange = (proposalId: string) => {
    const proposal = proposals?.find((p) => p.id === proposalId);
    if (proposal) {
      onChange(proposalId, proposal as unknown as Proposal);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Proposta *</Label>
      <Select value={value} onValueChange={handleChange} disabled={disabled || isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione uma proposta"} />
        </SelectTrigger>
        <SelectContent>
          {proposals?.map((proposal) => (
            <SelectItem key={proposal.id} value={proposal.id}>
              <span className="flex items-center gap-2">
                <span className="font-medium">{proposal.number || "Sem número"}</span>
                <span className="text-muted-foreground">-</span>
                <span>{proposal.clients?.name}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-primary">{formatCurrency(proposal.total)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
