import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInvestigation(projectId: string) {
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["investigation-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          client:clients(id, name, code, email, phone)
        `
        )
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ["investigation-entries", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select(
          "id, data, valor, situacao, tipo_documento, observacoes, supplier_id, category:financial_categories(nome, prefixo, cor_hex), supplier:suppliers(trade_name)"
        )
        .eq("project_id", projectId)
        .order("data", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!projectId,
  });

  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ["investigation-anomalies", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anomalies" as any)
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "aberta")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!projectId,
  });

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ["investigation-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: medicoes, isLoading: medicoesLoading } = useQuery({
    queryKey: ["investigation-medicoes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicoes")
        .select("*")
        .eq("project_id", projectId)
        .order("periodo_fim", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ["investigation-contract", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("project_id", projectId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const isLoading =
    projectLoading ||
    entriesLoading ||
    anomaliesLoading ||
    documentsLoading ||
    medicoesLoading ||
    contractLoading;

  return {
    project,
    entries: entries || [],
    anomalies: anomalies || [],
    documents: documents || [],
    medicoes: medicoes || [],
    contract,
    isLoading,
  };
}
