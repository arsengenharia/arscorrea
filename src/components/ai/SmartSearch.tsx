import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Building, Users, Truck, FileText, Bot, ArrowRight } from "lucide-react";
import { triggerAiAnalysis } from "./AnalyzeButton";
import { cn } from "@/lib/utils";

const AI_KEYWORDS = [
  "qual", "quanto", "como", "por que", "porque", "onde", "quando", "quem",
  "o que", "tem", "existe", "mostre", "compare", "resuma", "analise",
  "projete", "preveja", "calcule", "liste", "explique", "investigue",
];

function isQuestion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.endsWith("?")) return true;
  return AI_KEYWORDS.some((kw) => lower.startsWith(kw));
}

interface SearchResult {
  type: "project" | "client" | "supplier" | "contract";
  id: string;
  name: string;
  subtitle?: string;
}

export function SmartSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Entity search
  const { data: results = [] } = useQuery<SearchResult[]>({
    queryKey: ["smart-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2 || isQuestion(debouncedQuery)) return [];

      const searchTerm = `%${debouncedQuery}%`;
      const allResults: SearchResult[] = [];

      // Projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, status")
        .ilike("name", searchTerm)
        .limit(3);
      if (projects) {
        allResults.push(...projects.map((p) => ({
          type: "project" as const, id: p.id, name: p.name, subtitle: p.status,
        })));
      }

      // Clients
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, phone")
        .ilike("name", searchTerm)
        .limit(3);
      if (clients) {
        allResults.push(...clients.map((c) => ({
          type: "client" as const, id: c.id, name: c.name, subtitle: c.phone,
        })));
      }

      // Suppliers
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id, trade_name, document")
        .ilike("trade_name", searchTerm)
        .limit(3);
      if (suppliers) {
        allResults.push(...suppliers.map((s) => ({
          type: "supplier" as const, id: s.id, name: s.trade_name, subtitle: s.document,
        })));
      }

      // Contracts
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, title, contract_number")
        .ilike("title", searchTerm)
        .limit(3);
      if (contracts) {
        allResults.push(...contracts.map((c) => ({
          type: "contract" as const, id: c.id, name: c.title, subtitle: c.contract_number,
        })));
      }

      return allResults;
    },
    enabled: debouncedQuery.length >= 2 && !isQuestion(debouncedQuery),
  });

  const showAiOption = query.length >= 3 && isQuestion(query);
  const hasResults = results.length > 0 || showAiOption;

  const iconMap = {
    project: Building,
    client: Users,
    supplier: Truck,
    contract: FileText,
  };

  const pathMap = {
    project: (id: string) => `/obras/${id}`,
    client: (id: string) => `/clientes/${id}`,
    supplier: (id: string) => `/fornecedores/${id}`,
    contract: (id: string) => `/contratos/${id}`,
  };

  const labelMap = {
    project: "Obra",
    client: "Cliente",
    supplier: "Fornecedor",
    contract: "Contrato",
  };

  const handleSelect = (result: SearchResult) => {
    navigate(pathMap[result.type](result.id));
    setQuery("");
    setOpen(false);
  };

  const handleAiQuestion = () => {
    triggerAiAnalysis(query);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "Enter") {
      if (showAiOption) { handleAiQuestion(); return; }
      if (results.length > 0 && selectedIdx >= 0) { handleSelect(results[selectedIdx]); return; }
      if (query.length >= 3) { handleAiQuestion(); return; }
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, -1)); }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative hidden md:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelectedIdx(-1); }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar obras, clientes, fornecedores... ou perguntar"
        className="pl-9 w-72 lg:w-96 rounded-full bg-muted/50 border-transparent focus:border-primary focus:bg-background h-9 text-sm"
      />

      {/* Dropdown */}
      {open && hasResults && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1 w-full bg-background border rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {/* Entity results */}
          {results.map((r, i) => {
            const Icon = iconMap[r.type];
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors",
                  i === selectedIdx && "bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground">{labelMap[r.type]}{r.subtitle ? ` · ${r.subtitle}` : ""}</p>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            );
          })}

          {/* AI question option */}
          {showAiOption && (
            <>
              {results.length > 0 && <div className="border-t" />}
              <button
                onClick={handleAiQuestion}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-primary/5 transition-colors"
              >
                <Bot className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">Perguntar ao assistente</p>
                  <p className="text-[11px] text-muted-foreground truncate">"{query}"</p>
                </div>
                <ArrowRight className="h-3 w-3 text-primary" />
              </button>
            </>
          )}

          {/* Always show AI option for non-empty queries */}
          {!showAiOption && query.length >= 3 && (
            <>
              {results.length > 0 && <div className="border-t" />}
              <button
                onClick={handleAiQuestion}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors opacity-60"
              >
                <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">Pressione Enter para perguntar ao assistente</p>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
