import { useEffect, useCallback } from "react";

// ─── AI Command pub/sub system ───────────────────────────────────────────────
// Pages subscribe with useAiCommandListener(commandType, handler)
// ChatPanel emits commands via emitAiCommand()

const AI_COMMAND_EVENT = "AI_COMMAND";

export interface AiCommand {
  type: string;
  params: Record<string, any>;
}

export function emitAiCommand(command: AiCommand) {
  window.dispatchEvent(new CustomEvent(AI_COMMAND_EVENT, { detail: command }));
}

export function useAiCommandListener(
  commandType: string,
  handler: (params: Record<string, any>) => void
) {
  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent<AiCommand>).detail;
      if (detail.type === commandType) {
        stableHandler(detail.params);
      }
    };
    window.addEventListener(AI_COMMAND_EVENT, listener);
    return () => window.removeEventListener(AI_COMMAND_EVENT, listener);
  }, [commandType, stableHandler]);
}
