import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const RECENT_LIMIT = 8;
const SUMMARIZE_THRESHOLD = 16;

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
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { count } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"]);

  const totalMessages = count ?? 0;

  if (totalMessages <= RECENT_LIMIT) {
    return fetchRecentMessages(supabase, conversationId, RECENT_LIMIT);
  }

  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("context_snapshot")
    .eq("id", conversationId)
    .single();

  const summary = (conv?.context_snapshot as any)?.summary;
  const recent = await fetchRecentMessages(supabase, conversationId, RECENT_LIMIT);

  if (summary) {
    return [
      { role: "user" as const, content: `[Resumo da conversa anterior: ${summary}]` },
      { role: "assistant" as const, content: "Entendido, tenho o contexto da conversa anterior." },
      ...recent,
    ];
  }

  return recent;
}

async function fetchRecentMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data } = await supabase
    .from("ai_messages")
    .select("role, content, tool_name, tool_output")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant", "tool"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  const reversed = [...data].reverse();

  return reversed.map((m: any) => {
    if (m.role === "tool" && m.tool_output) {
      const output = typeof m.tool_output === "string" ? m.tool_output : JSON.stringify(m.tool_output);
      return { role: "user" as const, content: `[Tool ${m.tool_name}]: ${output.substring(0, 500)}` };
    }
    return { role: (m.role === "tool" ? "user" : m.role) as "user" | "assistant", content: m.content || "" };
  });
}

export async function maybeSummarizeHistory(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<void> {
  const { count } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"]);

  const totalMessages = count ?? 0;
  if (totalMessages < SUMMARIZE_THRESHOLD) return;

  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("context_snapshot")
    .eq("id", conversationId)
    .single();

  const lastSummarizedAt = (conv?.context_snapshot as any)?.summarized_at;
  if (lastSummarizedAt) {
    const elapsed = Date.now() - new Date(lastSummarizedAt).getTime();
    if (elapsed < 5 * 60 * 1000) return;
  }

  const { data: olderMessages } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(totalMessages - RECENT_LIMIT);

  if (!olderMessages || olderMessages.length < 4) return;

  const text = olderMessages
    .map((m: any) => `${m.role}: ${(m.content || "").substring(0, 200)}`)
    .join("\n");

  try {
    const { AwsClient } = await import("https://esm.sh/aws4fetch@1.0.20");
    const region = Deno.env.get("AWS_REGION") || "us-east-1";
    const aws = new AwsClient({
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
      region,
      service: "bedrock",
    });

    const resp = await aws.fetch(
      `https://bedrock-runtime.${region}.amazonaws.com/model/us.anthropic.claude-3-5-haiku-20241022-v1:0/invoke`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          system: "Resuma esta conversa em 2-3 frases em portugues. Foque nos temas discutidos, decisoes tomadas e dados mencionados. Seja conciso.",
          messages: [{ role: "user", content: text.substring(0, 3000) }],
          max_tokens: 200,
        }),
      }
    );

    if (resp.ok) {
      const result = await resp.json();
      const summary = result.content?.[0]?.text || "";

      if (summary.length > 10) {
        await supabase.from("ai_conversations").update({
          context_snapshot: {
            summary,
            summarized_at: new Date().toISOString(),
            messages_summarized: olderMessages.length,
          },
        }).eq("id", conversationId);
      }
    }
  } catch (err) {
    console.error("Summarization error:", err);
  }
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
