import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NfeInboxItem {
  id: string;
  status: string;
  origem: string;
  arquivo_path: string;
  arquivo_tipo: string;
  cnpj: string | null;
  razao_social: string | null;
  numero_nota: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  chave_nfe: string | null;
  supplier_id: string | null;
  categoria_sugerida: string | null;
  ai_confianca: number | null;
  ai_justificativa: string | null;
  itens_json: any[] | null;
  obras_ativas_json: any[] | null;
  observacao: string | null;
  created_at: string;
  email_remetente: string | null;
  supplier?: { trade_name: string } | null;
}

export function useNfeInbox(statusFilter?: string) {
  const [items, setItems] = useState<NfeInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    let query = (supabase.from("nfe_inbox" as any) as any)
      .select("*, supplier:suppliers(trade_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    setItems((data as NfeInboxItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();

    const channelName = `nfe-inbox-${statusFilter ?? "all"}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nfe_inbox" },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  return { items, loading, refetch: fetchItems };
}
