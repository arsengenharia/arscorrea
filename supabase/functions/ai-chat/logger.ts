import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function logAiQuery(
  supabase: SupabaseClient,
  params: {
    module: string;
    prompt: string;
    response?: string;
    model?: string;
    tokens_input?: number;
    tokens_output?: number;
    latency_ms?: number;
    context_type?: string;
    context_id?: string;
    user_id?: string;
    success: boolean;
    error_message?: string;
  }
) {
  await supabase.from("ai_query_log").insert(params).single();
}
