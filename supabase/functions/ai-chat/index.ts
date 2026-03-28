import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callBedrock } from "./bedrock.ts";
import { loadTools, executeTool } from "./tools.ts";
import { buildSystemPrompt } from "./context.ts";
import { getOrCreateConversation, getConversationHistory, saveMessage } from "./memory.ts";
import { logAiQuery } from "./logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Build context (pass current message for question-type detection)
    const currentMessage = message || confirm_tool?.message || "";
    const { systemPrompt, contextData } = await buildSystemPrompt(
      supabase, conversation.context_type, conversation.context_id, user.id, currentMessage
    );

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

    // Call Bedrock
    const bedrockTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    const response = await callBedrock(systemPrompt, messages, bedrockTools.length > 0 ? bedrockTools : undefined);

    const latencyMs = Date.now() - startTime;

    // Process response
    let assistantText = "";
    let toolCalls: any[] = [];
    let toolResults: any[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        assistantText += block.text;
      } else if (block.type === "tool_use") {
        const toolDef = tools.find(t => t.name === block.name);

        // Check if tool requires confirmation
        if (toolDef?.requires_confirmation && !confirm_tool) {
          // Return pending confirmation
          await saveMessage(supabase, conversation.id, "assistant", assistantText || "Preciso da sua confirmacao para executar esta acao.", {
            model: "claude-sonnet-4-6",
            tokens_input: response.usage.input_tokens,
            tokens_output: response.usage.output_tokens,
            latency_ms: latencyMs,
            tool_name: block.name,
            tool_input: block.input,
            context_used: contextData,
          });

          await logAiQuery(supabase, {
            module: "chat",
            prompt: message,
            response: assistantText,
            model: "claude-sonnet-4-6",
            tokens_input: response.usage.input_tokens,
            tokens_output: response.usage.output_tokens,
            latency_ms: latencyMs,
            context_type: conversation.context_type,
            context_id: conversation.context_id,
            user_id: user.id,
            success: true,
          });

          return new Response(JSON.stringify({
            conversation_id: conversation.id,
            response: assistantText || "Posso executar esta acao para voce:",
            pending_tool: {
              name: block.name,
              display_name: toolDef.description,
              input: block.input,
            },
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Execute tool
        const result = await executeTool(supabase, block.name!, block.input);
        toolCalls.push({ name: block.name, input: block.input });
        toolResults.push({ name: block.name, result: result.result, error: result.error });

        // Save tool message
        await saveMessage(supabase, conversation.id, "tool", JSON.stringify(result.result || result.error), {
          tool_name: block.name,
          tool_input: block.input,
          tool_output: result.result || { error: result.error },
        });

        // If tool was executed, call Bedrock again with result
        const followUpMessages = [
          ...messages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [{
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(result.result || { error: result.error }),
            }],
          },
        ];

        const followUp = await callBedrock(systemPrompt, followUpMessages);
        for (const fb of followUp.content) {
          if (fb.type === "text") assistantText += (assistantText ? "\n\n" : "") + fb.text;
        }

        response.usage.input_tokens += followUp.usage.input_tokens;
        response.usage.output_tokens += followUp.usage.output_tokens;
      }
    }

    // Save assistant response
    await saveMessage(supabase, conversation.id, "assistant", assistantText, {
      model: "claude-sonnet-4-6",
      tokens_input: response.usage.input_tokens,
      tokens_output: response.usage.output_tokens,
      latency_ms: Date.now() - startTime,
      sources: toolResults.length > 0 ? toolResults : undefined,
      context_used: contextData,
    });

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
