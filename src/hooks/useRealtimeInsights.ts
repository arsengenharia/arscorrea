import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeInsights() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("insights-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "nfe_inbox" }, () => {
        queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
        queryClient.invalidateQueries({ queryKey: ["insights-resolved"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_financial_entries" }, () => {
        queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
        queryClient.invalidateQueries({ queryKey: ["insights-resolved"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cost_allocations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "medicoes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_payments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["insights-risks"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
