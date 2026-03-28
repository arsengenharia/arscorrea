import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useNfePendingCount() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    const { count: c } = await (supabase.from("nfe_inbox" as any) as any)
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando_revisao");
    setCount(c ?? 0);
  };

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel("nfe-inbox-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nfe_inbox" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
