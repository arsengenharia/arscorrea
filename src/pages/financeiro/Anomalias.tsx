import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

const tipoLabels: Record<string, string> = {
  preco_acima_media: "Preço Acima da Média",
  nfe_duplicata_suspeita: "NF-e Duplicata Suspeita",
  lancamento_sem_conciliacao: "Sem Conciliação",
  divergencia_contrato: "Divergência Contratual",
  orcamento_estourado: "Orçamento Estourado",
  fornecedor_novo_valor_alto: "Fornecedor Novo Alto Valor",
  lancamento_sem_nfe: "Pagamento Sem NF-e",
  medicao_vs_faturamento: "Medição vs Faturamento",
  outro: "Outro",
};

function severityBadge(sev: string) {
  switch (sev) {
    case "critica":
      return (
        <span className="inline-flex items-center rounded-full bg-red-600 text-white text-xs font-semibold px-2.5 py-0.5">
          Crítica
        </span>
      );
    case "alta":
      return (
        <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 border border-orange-200">
          Alta
        </span>
      );
    case "media":
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 border border-amber-200">
          Média
        </span>
      );
    case "baixa":
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-0.5 border border-gray-300">
          Baixa
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-xs px-2.5 py-0.5">
          {sev}
        </span>
      );
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "aberta":
      return (
        <span className="inline-flex items-center rounded-full border border-slate-300 text-slate-700 text-xs font-medium px-2.5 py-0.5">
          Aberta
        </span>
      );
    case "em_analise":
      return (
        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 border border-amber-200">
          Em Análise
        </span>
      );
    case "resolvida":
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 border border-green-200">
          Resolvida
        </span>
      );
    case "ignorada":
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-0.5">
          Ignorada
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5">
          {status}
        </span>
      );
  }
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function Anomalias() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("todas");
  const [filterSeverity, setFilterSeverity] = useState("todas");
  const [filterType, setFilterType] = useState("todos");

  const [resolveDialog, setResolveDialog] = useState<{
    open: boolean;
    anomaly: any | null;
  }>({ open: false, anomaly: null });
  const [resolveStatus, setResolveStatus] = useState("resolvida");
  const [resolveNota, setResolveNota] = useState("");

  const { data: anomalies = [], isLoading } = useQuery({
    queryKey: ["anomalies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anomalies" as any)
        .select("*, project:projects(name), supplier:suppliers(trade_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      resolucao_nota,
    }: {
      id: string;
      status: string;
      resolucao_nota?: string;
    }) => {
      const payload: any = { status };
      if (resolucao_nota !== undefined) payload.resolucao_nota = resolucao_nota;
      if (status === "resolvida" || status === "ignorada") {
        payload.resolvida_em = new Date().toISOString();
      }
      const { error } = await (supabase as any)
        .from("anomalies")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      toast.success("Anomalia atualizada com sucesso.");
      setResolveDialog({ open: false, anomaly: null });
      setResolveNota("");
    },
    onError: () => {
      toast.error("Erro ao atualizar anomalia.");
    },
  });

  const sevenDaysAgo = subDays(new Date(), 7).toISOString();

  const totalAbertas = anomalies.filter((a) => a.status === "aberta").length;
  const totalCriticas = anomalies.filter(
    (a) => a.severidade === "critica"
  ).length;
  const totalResolvidas = anomalies.filter(
    (a) => a.status === "resolvida"
  ).length;
  const totalEstaSemana = anomalies.filter(
    (a) => a.created_at >= sevenDaysAgo
  ).length;

  const uniqueTypes = Array.from(new Set(anomalies.map((a) => a.tipo))).filter(
    Boolean
  );

  const filtered = anomalies.filter((a) => {
    if (filterStatus !== "todas" && a.status !== filterStatus) return false;
    if (filterSeverity !== "todas" && a.severidade !== filterSeverity)
      return false;
    if (filterType !== "todos" && a.tipo !== filterType) return false;
    return true;
  });

  const handleIgnore = (anomaly: any) => {
    updateMutation.mutate({ id: anomaly.id, status: "ignorada" });
  };

  const handleResolveSubmit = () => {
    if (!resolveDialog.anomaly) return;
    updateMutation.mutate({
      id: resolveDialog.anomaly.id,
      status: resolveStatus,
      resolucao_nota: resolveNota,
    });
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Financeiro
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoramento de anomalias detectadas automaticamente
          </p>
        </div>

        <FinanceiroTabs />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Abertas</p>
                <p className="text-2xl font-bold text-slate-800">
                  {totalAbertas}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <ShieldAlert className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Críticas</p>
                <p className="text-2xl font-bold text-slate-800">
                  {totalCriticas}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resolvidas</p>
                <p className="text-2xl font-bold text-slate-800">
                  {totalResolvidas}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold text-slate-800">
                  {totalEstaSemana}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="aberta">Abertas</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="resolvida">Resolvidas</SelectItem>
              <SelectItem value="ignorada">Ignoradas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {uniqueTypes.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipoLabels[tipo] ?? tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="shadow-sm border-slate-100">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm animate-pulse">
                Carregando anomalias...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                <ShieldAlert className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhuma anomalia encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Data
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Severidade
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Título
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Obra
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">
                        Valores
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((anomaly, idx) => (
                      <tr
                        key={anomaly.id}
                        className={
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        }
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {anomaly.created_at
                            ? format(
                                new Date(anomaly.created_at),
                                "dd/MM/yyyy"
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {severityBadge(anomaly.severidade)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[160px]">
                          {tipoLabels[anomaly.tipo] ?? anomaly.tipo}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px]">
                          <div className="truncate" title={anomaly.titulo}>
                            {anomaly.titulo}
                          </div>
                          {anomaly.descricao && (
                            <div
                              className="text-xs text-slate-400 truncate"
                              title={anomaly.descricao}
                            >
                              {anomaly.descricao}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {anomaly.project?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-slate-700">
                          {anomaly.valor_detectado != null ? (
                            <div>{formatCurrency(anomaly.valor_detectado)}</div>
                          ) : null}
                          {anomaly.valor_referencia != null ? (
                            <div className="text-xs text-slate-400">
                              ref: {formatCurrency(anomaly.valor_referencia)}
                            </div>
                          ) : null}
                          {anomaly.valor_detectado == null &&
                          anomaly.valor_referencia == null
                            ? "—"
                            : null}
                        </td>
                        <td className="px-4 py-3">
                          {statusBadge(anomaly.status)}
                        </td>
                        <td className="px-4 py-3">
                          {anomaly.status !== "resolvida" &&
                          anomaly.status !== "ignorada" ? (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                onClick={() => {
                                  setResolveDialog({
                                    open: true,
                                    anomaly,
                                  });
                                  setResolveStatus("resolvida");
                                  setResolveNota("");
                                }}
                              >
                                Resolver
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2 text-slate-500"
                                onClick={() => handleIgnore(anomaly)}
                              >
                                Ignorar
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolve Dialog */}
        <Dialog
          open={resolveDialog.open}
          onOpenChange={(open) => setResolveDialog({ open, anomaly: resolveDialog.anomaly })}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Resolver Anomalia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Anomalia</p>
                <p className="text-sm font-medium text-slate-800">
                  {resolveDialog.anomaly?.titulo}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Novo status
                </label>
                <Select value={resolveStatus} onValueChange={setResolveStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="resolvida">Resolvida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Nota de resolução
                </label>
                <Textarea
                  placeholder="Descreva como a anomalia foi resolvida ou está sendo investigada..."
                  value={resolveNota}
                  onChange={(e) => setResolveNota(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setResolveDialog({ open: false, anomaly: null })}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleResolveSubmit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
