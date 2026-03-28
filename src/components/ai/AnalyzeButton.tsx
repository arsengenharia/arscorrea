import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyzeButtonProps {
  label?: string;
  prompt: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

// We need a way to programmatically send a message to the ChatPanel.
// Use a global event bus for simplicity.

export const AI_ANALYZE_EVENT = "ai-analyze";

export function triggerAiAnalysis(prompt: string) {
  window.dispatchEvent(new CustomEvent(AI_ANALYZE_EVENT, { detail: { prompt } }));
}

export function AnalyzeButton({ label = "Analisar com IA", prompt, variant = "outline", size = "sm" }: AnalyzeButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => triggerAiAnalysis(prompt)}
      className="gap-1.5"
    >
      <Bot className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
