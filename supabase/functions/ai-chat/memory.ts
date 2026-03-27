import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  conversationId: string | null,
  userId: string,
  contextType?: string,
  contextId?: string
) {
  if (conversationId) {
    const { data } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();
    if (data) return data;
  }

  // Create new conversation
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: userId,
      context_type: contextType || "general",
      context_id: contextId || null,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  limit = 20
) {
  const { data } = await supabase
    .from("ai_messages")
    .select("role, content, tool_name, tool_input, tool_output")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  return (data || []).map((m: any) => {
    if (m.role === "tool" && m.tool_output) {
      return { role: "user" as const, content: `[Tool result for ${m.tool_name}]: ${typeof m.tool_output === 'string' ? m.tool_output : JSON.stringify(m.tool_output)}` };
    }
    return { role: m.role as "user" | "assistant", content: m.content };
  });
}

export async function saveMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: string,
  content: string,
  extra?: {
    model?: string;
    tokens_input?: number;
    tokens_output?: number;
    latency_ms?: number;
    tool_name?: string;
    tool_input?: any;
    tool_output?: any;
    sources?: any;
    context_used?: any;
  }
) {
  await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role,
    content,
    model: extra?.model,
    tokens_input: extra?.tokens_input,
    tokens_output: extra?.tokens_output,
    latency_ms: extra?.latency_ms,
    tool_name: extra?.tool_name,
    tool_input: extra?.tool_input,
    tool_output: extra?.tool_output,
    sources: extra?.sources,
    context_used: extra?.context_used,
  });
}
