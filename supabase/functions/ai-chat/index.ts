import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callBedrock } from "./bedrock.ts";
import { loadTools, executeTool } from "./tools.ts";
import { buildSystemPrompt } from "./context.ts";
import { getOrCreateConversation, getConversationHistory, saveMessage, maybeSummarizeHistory } from "./memory.ts";
import { logAiQuery } from "./logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const contextCache = new Map<string, { systemPrompt: string; contextData: any; ts: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { message, conversation_id, context_type, context_id, confirm_tool } = await req.json();

    if (!message && !confirm_tool) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth -- extract user from JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Service client for AI operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Decode user from JWT (works with both HS256 and ES256 tokens)
    let userId: string | null = null;
    const token = authHeader.replace("Bearer ", "");
    if (token && token.includes(".")) {
      try {
        const parts = token.split(".");
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        userId = payload.sub || null;
      } catch { /* ignore */ }
    }

    if (!userId) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser(token);
        userId = authUser?.id || null;
      } catch { /* ignore */ }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: userId };

    // Get user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    const userRole = roleData?.role || "client";

    // Get or create conversation
    const conversation = await getOrCreateConversation(
      supabase, conversation_id || null, user.id, context_type, context_id
    );

    // Update user preferences — track most used project
    try {
      if (context_type === "project" && context_id) {
        const { data: pref } = await supabase.from("ai_user_preferences")
          .select("id, projeto_padrao")
          .eq("user_id", userId)
          .maybeSingle();

        if (!pref) {
          // Create preferences for new user
          await supabase.from("ai_user_preferences").insert({
            user_id: userId,
            projeto_padrao: context_id,
          });
        }
        // Don't update every time — just on first creation
      }
    } catch { /* ignore */ }

    // Build context (pass current message for question-type detection)
    const currentMessage = message || confirm_tool?.message || "";
    const cacheKey = `ctx_${conversation.id}`;
    const cached = contextCache.get(cacheKey);
    let systemPrompt: string;
    let contextData: any;

    if (cached && Date.now() - cached.ts < 60_000) {
      systemPrompt = cached.systemPrompt;
      contextData = cached.contextData;
    } else {
      const result = await buildSystemPrompt(
        supabase, conversation.context_type, conversation.context_id, user.id, currentMessage
      );
      systemPrompt = result.systemPrompt;
      contextData = result.contextData;
      contextCache.set(cacheKey, { systemPrompt, contextData, ts: Date.now() });
    }

    // Load tools for user's role
    const tools = await loadTools(supabase, userRole);

    // Get conversation history
    const history = await getConversationHistory(supabase, conversation.id);

    // Build messages
    const messages: any[] = [
      ...history,
      { role: "user", content: message || confirm_tool?.message || "continuar" },
    ];

    // Save user message
    if (message) {
      await saveMessage(supabase, conversation.id, "user", message);
    }

    // Call Bedrock with agentic tool loop (max 3 iterations)
    const bedrockTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    let assistantText = "";
    let toolCalls: any[] = [];
    let toolResults: any[] = [];
    let currentMessages = [...messages];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (let iteration = 0; iteration < 3; iteration++) {
      const resp = await callBedrock(systemPrompt, currentMessages, bedrockTools.length > 0 ? bedrockTools : undefined);
      totalInputTokens += resp.usage.input_tokens;
      totalOutputTokens += resp.usage.output_tokens;

      // Collect text from this response
      for (const block of resp.content) {
        if (block.type === "text") {
          assistantText += (assistantText && block.text ? "\n\n" : "") + (block.text || "");
        }
      }

      // If no tool use, we're done
      if (resp.stop_reason !== "tool_use") break;

      // Process tool calls
      const toolUseBlocks = resp.content.filter((b: any) => b.type === "tool_use");
      if (toolUseBlocks.length === 0) break;

      // Add assistant response to messages
      currentMessages.push({ role: "assistant", content: resp.content });

      // Process each tool call and collect results
      const toolResultContents: any[] = [];

      for (const block of toolUseBlocks) {
        const toolDef = tools.find(t => t.name === block.name);

        // Check if tool requires confirmation
        if (toolDef?.requires_confirmation && !confirm_tool) {
          await saveMessage(supabase, conversation.id, "assistant", assistantText || "Preciso da sua confirmacao.", {
            model: "claude-sonnet-4", tool_name: block.name, tool_input: block.input,
          });
          return new Response(JSON.stringify({
            conversation_id: conversation.id,
            response: assistantText || "Posso executar esta acao para voce:",
            pending_tool: { name: block.name, display_name: toolDef.description, input: block.input },
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Execute tool
        const result = await executeTool(supabase, block.name!, block.input);
        toolCalls.push({ name: block.name, input: block.input });
        toolResults.push({ name: block.name, result: result.result, error: result.error });

        const toolMsgContent = JSON.stringify(result.result ?? result.error ?? "no data").substring(0, 2000);
        await saveMessage(supabase, conversation.id, "tool", toolMsgContent, {
          tool_name: block.name, tool_input: block.input, tool_output: result.result || { error: result.error },
        });

        // Truncate large results
        let resultStr = "";
        try { resultStr = JSON.stringify(result.result ?? result.error ?? "no data"); } catch { resultStr = "error"; }
        if (resultStr.length > 1500) resultStr = resultStr.substring(0, 1500) + "...[truncado]";

        toolResultContents.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: resultStr,
        });
      }

      // Add tool results to messages for next iteration
      currentMessages.push({ role: "user", content: toolResultContents });
    }

    const response = { usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens } };

    // Save assistant response
    await saveMessage(supabase, conversation.id, "assistant", assistantText, {
      model: "claude-sonnet-4-6",
      tokens_input: response.usage.input_tokens,
      tokens_output: response.usage.output_tokens,
      latency_ms: Date.now() - startTime,
      sources: toolResults.length > 0 ? toolResults : undefined,
      context_used: contextData,
    });
    // Trigger summarization in background (non-blocking)
    maybeSummarizeHistory(supabase, conversation.id).catch(() => {});

    // Auto-learn from conversation
    try {
      const lowerMsg = (message || "").toLowerCase();

      // Detect corrections: "não, o X é Y", "errado, na verdade", "corrija"
      const isCorrection = /\b(n[aã]o|errado|incorreto|corrija|na verdade|o certo|o correto)\b/.test(lowerMsg);

      // Detect confirmations of non-obvious facts: "sim, exatamente", "isso mesmo"
      const isConfirmation = /\b(sim|exatamente|isso mesmo|correto|perfeito)\b/.test(lowerMsg) && toolCalls.length > 0;

      if (isCorrection && message) {
        const { error: knErr } = await supabase.from("ai_knowledge").insert({
          tipo: "correcao",
          conteudo: `Usuario corrigiu: "${message.substring(0, 300)}". Resposta: "${assistantText.substring(0, 200)}"`,
          scope_type: (conversation.context_type === "general" || !conversation.context_type) ? "global" : conversation.context_type,
          scope_id: conversation.context_id || null,
          user_id: userId,
          conversation_id: conversation.id,
          confianca: 0.9,
        });
        // Log the result regardless
        await supabase.from("ai_query_log").insert({
          module: "knowledge_learn",
          prompt: knErr ? "FAILED: " + knErr.message : "SUCCESS",
          response: message?.substring(0, 200),
          success: !knErr,
          error_message: knErr?.message,
          user_id: userId,
        });
      }
    } catch (learnErr) { console.error("Learn error:", learnErr); }

    // Log
    await logAiQuery(supabase, {
      module: "chat",
      prompt: message,
      response: assistantText,
      model: "claude-sonnet-4-6",
      tokens_input: response.usage.input_tokens,
      tokens_output: response.usage.output_tokens,
      latency_ms: Date.now() - startTime,
      context_type: conversation.context_type,
      context_id: conversation.context_id,
      user_id: user.id,
      success: true,
    });

    // Update conversation title from first message
    if (!conversation.title && message) {
      const title = message.length > 60 ? message.substring(0, 60) + "..." : message;
      await supabase.from("ai_conversations").update({ title }).eq("id", conversation.id);
    }

    // Check for frontend actions in tool results (navigate, filter, etc.)
    let frontendAction = null;
    for (const tr of toolResults) {
      if (tr.result?.action === "navigate") {
        frontendAction = { type: "navigate", path: tr.result.path, description: tr.result.description };
      } else if (tr.result?.action === "filter_entries") {
        const { action, ...params } = tr.result;
        frontendAction = { type: "filter_entries", path: "/financeiro/lancamentos", description: "Filtros aplicados nos lançamentos", params };
      } else if (tr.result?.action === "filter_recebiveis") {
        const { action, ...params } = tr.result;
        frontendAction = { type: "filter_recebiveis", path: "/financeiro/recebiveis", description: "Filtros aplicados nos recebíveis", params };
      } else if (tr.result?.action === "generate_report") {
        frontendAction = {
          type: "generate_report",
          path: tr.result.path,
          description: tr.result.description,
          project_id: tr.result.project_id,
          report_type: tr.result.report_type,
        };
      }
    }

    return new Response(JSON.stringify({
      conversation_id: conversation.id,
      response: assistantText,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      tool_results: toolResults.length > 0 ? toolResults : undefined,
      action: frontendAction,
      usage: response.usage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("AI Chat error:", err);

    // Log error
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await logAiQuery(supabase, {
        module: "chat",
        prompt: "error",
        model: "claude-sonnet-4-6",
        success: false,
        error_message: String(err),
        latency_ms: Date.now() - startTime,
      });
    } catch (_) {}

    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
