import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  DollarSign,
  AlertTriangle,
  FileText,
  Ruler,
  Clock,
  ArrowRight,
  Download,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useInvestigation } from "@/hooks/useInvestigation";
import { triggerAiAnalysis } from "@/components/ai/AnalyzeButton";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface InvestigationPanelProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// --- Timeline item types ---

interface TimelineItem {
  id: string;
  date: string;
  type: "entry" | "medicao" | "anomaly";
  title: string;
  description?: string;
  value?: number;
  severity?: string;
  status?: string;
  meta?: Record<string, any>;
}

function severityColor(severity: string) {
  switch (severity?.toLowerCase()) {
    case "critica":
      return "bg-red-100 text-red-800 border-red-200";
    case "alta":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "media":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function statusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "aprovada":
      return "bg-green-100 text-green-800";
    case "pendente":
      return "bg-amber-100 text-amber-800";
    case "rejeitada":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function fileIcon(fileType: string | null) {
  if (!fileType) return <FileText className="h-4 w-4 text-slate-400" />;
  if (fileType.includes("pdf"))
    return <FileText className="h-4 w-4 text-red-500" />;
  if (fileType.includes("image"))
    return <FileText className="h-4 w-4 text-blue-500" />;
  if (fileType.includes("sheet") || fileType.includes("excel"))
    return <FileText className="h-4 w-4 text-green-500" />;
  return <FileText className="h-4 w-4 text-slate-400" />;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "dd MMM yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string) {
  try {
    return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

// --- Main Component ---

export function InvestigationPanel({
  projectId,
  open,
  onOpenChange,
}: InvestigationPanelProps) {
  const { project, entries, anomalies, documents, medicoes, contract, isLoading } =
    useInvestigation(projectId);

  const [aiRequested, setAiRequested] = useState(false);

  // Build unified timeline from entries, medicoes, anomalies
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    entries.forEach((e: any) => {
      items.push({
        id: `entry-${e.id}`,
        date: e.data,
        type: "entry",
        title: e.category?.nome || e.tipo_documento || "Lançamento",
        description: e.supplier?.trade_name || e.observacoes || undefined,
        value: e.valor,
        status: e.situacao,
      });
    });

    medicoes.forEach((m) => {
      items.push({
        id: `medicao-${m.id}`,
        date: m.periodo_fim,
        type: "medicao",
        title: `Medição #${m.numero}`,
        description: m.observacoes || undefined,
        value: m.valor_medido,
        status: m.status,
        meta: { percentual: m.percentual_fisico },
      });
    });

    anomalies.forEach((a: any) => {
      items.push({
        id: `anomaly-${a.id}`,
        date: a.created_at,
        type: "anomaly",
        title: a.titulo,
        description: a.descricao || undefined,
        severity: a.severidade,
        value: a.valor_detectado ?? undefined,
      });
    });

    // Sort by date desc, take top 20
    items.sort((a, b) => (b.date > a.date ? 1 : -1));
    return items.slice(0, 20);
  }, [entries, medicoes, anomalies]);

  // Build suggested actions
  const suggestedActions = useMemo(() => {
    const actions: {
      id: string;
      label: string;
      icon: React.ReactNode;
      action: () => void;
      variant: "default" | "destructive" | "outline";
    }[] = [];

    if (anomalies.length > 0) {
      actions.push({
        id: "resolve-anomalies",
        label: `Resolver ${anomalies.length} anomalia${anomalies.length > 1 ? "s" : ""} aberta${anomalies.length > 1 ? "s" : ""}`,
        icon: <AlertTriangle className="h-4 w-4" />,
        action: () =>
          triggerAiAnalysis(
            `Liste e analise as ${anomalies.length} anomalias abertas desta obra e sugira ações para resolvê-las.`
          ),
        variant: "destructive",
      });
    }

    const pendingMedicoes = medicoes.filter(
      (m) => m.status?.toLowerCase() === "pendente"
    );
    if (pendingMedicoes.length > 0) {
      actions.push({
        id: "pending-medicoes",
        label: `Atualizar ${pendingMedicoes.length} medição(ões) pendente(s)`,
        icon: <Ruler className="h-4 w-4" />,
        action: () =>
          triggerAiAnalysis(
            "Analise as medições pendentes desta obra e sugira próximos passos."
          ),
        variant: "outline",
      });
    }

    const entriesWithoutSupplier = entries.filter(
      (e: any) => !e.supplier_id && !e.supplier
    );
    if (entriesWithoutSupplier.length > 0) {
      actions.push({
        id: "missing-supplier",
        label: `Completar fornecedor em ${entriesWithoutSupplier.length} lançamento${entriesWithoutSupplier.length > 1 ? "s" : ""}`,
        icon: <DollarSign className="h-4 w-4" />,
        action: () =>
          triggerAiAnalysis(
            `Existem ${entriesWithoutSupplier.length} lançamentos sem fornecedor nesta obra. Identifique e sugira como completar.`
          ),
        variant: "outline",
      });
    }

    if (!contract) {
      actions.push({
        id: "no-contract",
        label: "Nenhum contrato vinculado",
        icon: <FileText className="h-4 w-4" />,
        action: () =>
          triggerAiAnalysis(
            "Esta obra não possui contrato vinculado. Analise a situação e sugira próximos passos."
          ),
        variant: "outline",
      });
    }

    return actions;
  }, [anomalies, medicoes, entries, contract]);

  const handleRequestAi = () => {
    setAiRequested(true);
    triggerAiAnalysis(
      "Faça uma análise executiva completa desta obra, incluindo: resumo financeiro, status das medições, anomalias detectadas, riscos e recomendações."
    );
  };

  const handleDownloadDocument = async (doc: any) => {
    const { data } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const timelineIcon = (type: string) => {
    switch (type) {
      case "entry":
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <DollarSign className="h-3.5 w-3.5" />
          </div>
        );
      case "medicao":
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-600">
            <Ruler className="h-3.5 w-3.5" />
          </div>
        );
      case "anomaly":
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        );
      default:
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Clock className="h-3.5 w-3.5" />
          </div>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[450px] p-0 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
          <SheetHeader>
            <div className="flex items-start justify-between pr-6">
              <div className="space-y-1">
                <SheetTitle className="text-lg font-bold text-slate-900 leading-tight">
                  {project?.name || "Carregando..."}
                </SheetTitle>
                <SheetDescription className="text-sm text-slate-500">
                  {project?.client?.name || ""}
                </SheetDescription>
              </div>
              {project?.status && (
                <Badge
                  variant="secondary"
                  className={
                    project.status?.toLowerCase() === "em andamento"
                      ? "bg-blue-100 text-blue-800"
                      : project.status?.toLowerCase() === "concluído"
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-700"
                  }
                >
                  {project.status}
                </Badge>
              )}
            </div>
          </SheetHeader>
          {contract && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <FileText className="h-3 w-3" />
              <span>
                Contrato: {contract.title || contract.contract_number || "S/N"}{" "}
                {contract.total
                  ? `- ${formatCurrency(contract.total)}`
                  : ""}
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">
              {/* Section 1: Resumo Executivo */}
              <section>
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Resumo Executivo
                </h3>
                {!aiRequested ? (
                  <Card className="p-4 border-dashed border-slate-200 bg-slate-50/50">
                    <p className="text-sm text-slate-500 mb-3">
                      Gere um resumo inteligente com dados financeiros,
                      medições, anomalias e recomendações.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRequestAi}
                      className="gap-2"
                    >
                      <Bot className="h-4 w-4" />
                      Gerar resumo com IA
                    </Button>
                  </Card>
                ) : (
                  <Card className="p-4 border-blue-100 bg-blue-50/50">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        Solicitação enviada ao assistente. Verifique o chat.
                      </span>
                    </div>
                  </Card>
                )}
              </section>

              <Separator />

              {/* Section 2: Timeline de Eventos */}
              <section>
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Timeline de Eventos
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {timeline.length}
                  </Badge>
                </h3>
                {timeline.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">
                    Nenhum evento encontrado.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {timeline.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 py-2 group hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                      >
                        {timelineIcon(item.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800 truncate">
                              {item.title}
                            </span>
                            {item.severity && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${severityColor(item.severity)}`}
                              >
                                {item.severity}
                              </Badge>
                            )}
                            {item.type === "medicao" && item.status && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] px-1.5 py-0 ${statusColor(item.status)}`}
                              >
                                {item.status}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-400">
                              {formatDateShort(item.date)}
                            </span>
                            {item.value !== undefined && item.value !== null && (
                              <span className="text-[11px] font-medium text-slate-600">
                                {formatCurrency(item.value)}
                              </span>
                            )}
                            {item.type === "medicao" &&
                              item.meta?.percentual != null && (
                                <span className="text-[11px] text-purple-600">
                                  {item.meta.percentual}% fisico
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              {/* Section 3: Documentos */}
              <section>
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-500" />
                  Documentos
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {documents.length}
                  </Badge>
                </h3>
                {documents.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">
                    Nenhum documento encontrado.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => handleDownloadDocument(doc)}
                        className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                      >
                        {fileIcon(doc.file_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                            {doc.file_name}
                          </p>
                          {doc.description && (
                            <p className="text-xs text-slate-400 truncate">
                              {doc.description}
                            </p>
                          )}
                        </div>
                        <Download className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              {/* Section 4: Ações Sugeridas */}
              <section>
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Ações Sugeridas
                </h3>
                {suggestedActions.length === 0 ? (
                  <Card className="p-4 border-green-100 bg-green-50/50">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Nenhuma ação pendente identificada.</span>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {suggestedActions.map((action) => (
                      <Button
                        key={action.id}
                        variant={action.variant}
                        size="sm"
                        onClick={action.action}
                        className="w-full justify-start gap-2 text-left h-auto py-2.5 px-3"
                      >
                        {action.icon}
                        <span className="flex-1 text-sm">{action.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
