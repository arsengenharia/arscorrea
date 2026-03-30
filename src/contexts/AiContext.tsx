import { createContext, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";

interface AiContextValue {
  contextType: string;
  contextId: string | null;
  contextLabel: string;
}

const AiContext = createContext<AiContextValue>({
  contextType: "general",
  contextId: null,
  contextLabel: "Geral",
});

export function useAiContext() {
  return useContext(AiContext);
}

export function AiContextProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const value = useMemo<AiContextValue>(() => {
    const path = location.pathname;

    // /obras/:projectId/* → project context
    const obraMatch = path.match(/\/obras\/([0-9a-f-]{36})/);
    if (obraMatch) {
      return { contextType: "project", contextId: obraMatch[1], contextLabel: "Obra" };
    }

    // /fornecedores/:supplierId → supplier context
    const fornecedorMatch = path.match(/\/fornecedores\/([0-9a-f-]{36})/);
    if (fornecedorMatch) {
      return { contextType: "supplier", contextId: fornecedorMatch[1], contextLabel: "Fornecedor" };
    }

    // /contratos/:id/* → contract context
    const contratoMatch = path.match(/\/contratos\/([0-9a-f-]{36})/);
    if (contratoMatch) {
      return { contextType: "contract", contextId: contratoMatch[1], contextLabel: "Contrato" };
    }

    // /clientes/:id → client context
    const clienteMatch = path.match(/\/clientes\/([0-9a-f-]{36})/);
    if (clienteMatch) {
      return { contextType: "client", contextId: clienteMatch[1], contextLabel: "Cliente" };
    }

    // /financeiro/* → general context with financial label (so ai_build_context returns summary)
    if (path.startsWith("/financeiro")) {
      return { contextType: "general", contextId: null, contextLabel: "Financeiro" };
    }

    // Default
    return { contextType: "general", contextId: null, contextLabel: "Geral" };
  }, [location.pathname]);

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}
