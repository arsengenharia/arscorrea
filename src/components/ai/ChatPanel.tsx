import { useState, useRef, useEffect } from "react";
import { useAiChat, type ChatMessage } from "@/hooks/useAiChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, X, Send, Loader2, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  contextType?: string;
  contextId?: string;
}

export function ChatPanel({ contextType, contextId }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, loading, sendMessage, confirmTool, clearChat } = useAiChat(contextType, contextId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        >
          <Bot className="h-6 w-6" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {messages.filter(m => m.role === "assistant").length}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <Card className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] flex flex-col shadow-2xl border-slate-200 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Assistente ARS</p>
                <p className="text-[10px] opacity-80">Claude via Bedrock</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearChat} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" title="Nova conversa">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Context badge */}
          {contextType && contextType !== "general" && (
            <div className="px-3 py-1.5 bg-muted/50 border-b">
              <Badge variant="secondary" className="text-[10px]">
                Contexto: {contextType} {contextId?.substring(0, 8)}
              </Badge>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-12">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Olá! Sou o assistente da ARS.</p>
                <p className="text-xs mt-1">Pergunte sobre obras, financeiro, fornecedores...</p>
                <div className="mt-4 space-y-1.5">
                  {["Qual o saldo da obra?", "Resumo financeiro geral", "Quais anomalias existem?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg border hover:bg-muted transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                )}>
                  {/* Message content */}
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Tool confirmation card */}
                  {msg.pending_tool && (
                    <div className="mt-2 p-2.5 bg-background rounded-lg border border-amber-200">
                      <p className="text-xs font-medium text-amber-800 mb-2">
                        Ação pendente: {msg.pending_tool.display_name}
                      </p>
                      <pre className="text-[10px] text-muted-foreground mb-2 overflow-x-auto">
                        {JSON.stringify(msg.pending_tool.input, null, 2)}
                      </pre>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => confirmTool(msg.pending_tool!.name, msg.pending_tool!.input)}
                          disabled={loading}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => sendMessage("Cancelar, não execute essa ação.")}
                          disabled={loading}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Tool results */}
                  {msg.tool_results && msg.tool_results.length > 0 && (
                    <div className="mt-1.5">
                      {msg.tool_results.map((tr: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] mr-1">
                          {tr.name} {tr.error ? "❌" : "✅"}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className={cn(
                    "text-[10px] mt-1 opacity-50",
                    msg.role === "user" ? "text-right" : ""
                  )}>
                    {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-background">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte algo..."
                disabled={loading}
                className="flex-1 rounded-full"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="rounded-full h-9 w-9"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
