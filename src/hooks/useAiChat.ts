import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pending_tool?: { name: string; display_name: string; input: any };
  tool_results?: any[];
  action?: { type: string; path: string; description?: string; params?: Record<string, any> };
  timestamp: Date;
}

const CONV_KEY = "ars_chat_conversation_id";

export function useAiChat(contextType?: string, contextId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try { return localStorage.getItem(CONV_KEY); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<{ type: string; path: string; description?: string; params?: Record<string, any> } | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Persist conversationId
  useEffect(() => {
    try {
      if (conversationId) localStorage.setItem(CONV_KEY, conversationId);
      else localStorage.removeItem(CONV_KEY);
    } catch { /* ignore */ }
  }, [conversationId]);

  // Load conversation history from backend on mount
  useEffect(() => {
    if (!conversationId || historyLoaded) return;

    (async () => {
      try {
        const { data } = await supabase
          .from("ai_messages" as any)
          .select("id, role, content, created_at")
          .eq("conversation_id", conversationId)
          .in("role", ["user", "assistant"])
          .order("created_at", { ascending: true })
          .limit(50);

        if (data && data.length > 0) {
          const restored: ChatMessage[] = (data as any[]).map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content || "",
            timestamp: new Date(m.created_at),
          }));
          setMessages(restored);
        } else {
          // Conversation may have been deleted or invalid
          setConversationId(null);
        }
      } catch {
        // If fetch fails, start fresh
        setConversationId(null);
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, [conversationId, historyLoaded]);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: text,
          conversation_id: conversationId,
          context_type: contextType || "general",
          context_id: contextId || null,
        },
      });

      if (error) throw error;

      if (data.conversation_id && data.conversation_id !== conversationId) {
        setConversationId(data.conversation_id);
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        pending_tool: data.pending_tool,
        tool_results: data.tool_results,
        action: data.action,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (data.action) {
        setLastAction(data.action);
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Erro: ${err.message || "Não foi possível processar sua mensagem."}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, contextType, contextId]);

  const confirmTool = useCallback(async (toolName: string, toolInput: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          conversation_id: conversationId,
          confirm_tool: { name: toolName, input: toolInput, message: "Confirmado, pode executar." },
          message: "Confirmado, pode executar.",
          context_type: contextType || "general",
          context_id: contextId || null,
        },
      });

      if (error) throw error;

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        tool_results: data.tool_results,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Erro ao executar: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, contextType, contextId]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setHistoryLoaded(false);
  }, []);

  return { messages, loading, sendMessage, confirmTool, clearChat, conversationId, lastAction };
}
