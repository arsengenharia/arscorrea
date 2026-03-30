import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Upload, Eye, FileText, FileCheck, RefreshCw, Paperclip, Trash2 } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/formatters";
import { FinanceiroTabs } from "./Financeiro";
import { useNfeInbox, type NfeInboxItem } from "@/hooks/useNfeInbox";
import { NfeReviewDialog } from "@/components/financeiro/NfeReviewDialog";
import { NfeUploadArea } from "@/components/financeiro/NfeUploadArea";
import { NfeManualEntryDialog } from "@/components/financeiro/NfeManualEntryDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function OrigemBadge({ origem }: { origem: string }) {
  if (origem === "email") return <Badge variant="outline"><Mail className="h-3 w-3 mr-1" />Email</Badge>;
  return <Badge variant="outline"><Upload className="h-3 w-3 mr-1" />Upload</Badge>;
}

export default function NfeInbox() {
  const [reviewItem, setReviewItem] = useState<NfeInboxItem | null>(null);
  const [activeTab, setActiveTab] = useState("pendentes");
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [emails, setEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [processingUid, setProcessingUid] = useState<string | null>(null);

  const { items: pendentes, loading: loadingPendentes, refetch: refetchPendentes } =
    useNfeInbox("aguardando_revisao");
  const { items: historico, loading: loadingHistorico, refetch: refetchHistorico } =
    useNfeInbox();

  const handleProcessed = () => {
    refetchPendentes();
    refetchHistorico();
  };

  const handleSyncEmail = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-nfe-from-email", { body: {} });
      if (error) throw error;
      const processed = data?.processed || 0;
      if (processed > 0) {
        toast.success(`${processed} NF-e(s) encontrada(s) no email`);
        refetchPendentes();
        refetchHistorico();
      } else {
        toast.info("Nenhuma NF-e nova no email");
      }
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + (err.message || "verifique a conexão"));
    } finally {
      setSyncing(false);
    }
  };

  const fetchEmailList = async () => {
    setLoadingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-nfe-from-email", {
        body: { action: "list" },
      });
      if (error) throw error;
      setEmails(data?.emails || []);
    } catch (err: any) {
      toast.error("Erro ao listar emails: " + (err.message || ""));
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleProcessEmail = async (uid: string, filename: string) => {
    // Check for duplicate by filename pattern
    if (filename) {
      const { data: existing } = await supabase
        .from("nfe_inbox" as any)
        .select("id, numero_nota, cnpj, status")
        .or(`arquivo_path.ilike.%${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}%`);

      if (existing && existing.length > 0) {
        const confirmed = window.confirm(
          `Atenção: Um arquivo similar "${filename}" já foi importado anteriormente (${existing.length} registro(s) encontrado(s)).\n\n` +
          existing.map((e: any) => `• Status: ${e.status} | CNPJ: ${e.cnpj || "—"} | Nota: ${e.numero_nota || "—"}`).join("\n") +
          "\n\nDeseja importar mesmo assim?"
        );
        if (!confirmed) return;
      }
    }

    setProcessingUid(uid);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-nfe-from-email", {
        body: { action: "process-one", uid, filename },
      });
      if (error) throw error;
      toast.success("NF-e importada para revisão");
      refetchPendentes();
      refetchHistorico();
      fetchEmailList(); // refresh list
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    } finally {
      setProcessingUid(null);
    }
  };

  const handleDeleteNfe = async (id: string) => {
    if (!window.confirm("Excluir este registro de NF-e? Esta ação não pode ser desfeita.")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("nfe_inbox" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("NF-e excluída");
      refetchHistorico();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    } finally {
      setDeletingId(null);
    }
  };

  const renderTable = (
    items: NfeInboxItem[],
    loading: boolean,
    showActions: boolean,
    emptyState?: React.ReactNode,
    showDelete: boolean = false
  ) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>N Nota</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Categoria IA</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead className="w-[80px]"></TableHead>}
            {showDelete && <TableHead className="w-[80px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={showActions || showDelete ? 9 : 8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : items.length === 0 ? (
            <TableRow><TableCell colSpan={showActions || showDelete ? 9 : 8}>
              {emptyState ?? <div className="text-center py-8 text-muted-foreground">Nenhuma nota fiscal encontrada</div>}
            </TableCell></TableRow>
          ) : items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-sm">{formatDate(item.created_at?.substring(0, 10))}</TableCell>
              <TableCell className="font-medium text-sm">{item.razao_social || item.supplier?.trade_name || "—"}</TableCell>
              <TableCell className="font-mono text-xs">{item.cnpj || "—"}</TableCell>
              <TableCell className="text-sm">{item.numero_nota || "—"}</TableCell>
              <TableCell className="text-right text-sm font-medium text-red-600">
                {item.valor_total ? formatBRL(item.valor_total) : "—"}
              </TableCell>
              <TableCell>
                {item.categoria_sugerida ? (
                  <Badge variant="secondary" className="text-xs">
                    {item.categoria_sugerida}
                    {item.ai_confianca ? ` (${Math.round(item.ai_confianca * 100)}%)` : ""}
                  </Badge>
                ) : "—"}
              </TableCell>
              <TableCell><OrigemBadge origem={item.origem} /></TableCell>
              <TableCell><StatusBadge status={item.status} /></TableCell>
              {showActions && (
                <TableCell>
                  <Button size="sm" variant="outline" onPointerUp={(e) => e.stopPropagation()} onClick={() => setTimeout(() => setReviewItem(item), 0)}>
                    <Eye className="h-3 w-3 mr-1" /> Revisar
                  </Button>
                </TableCell>
              )}
              {showDelete && (
                <TableCell>
                  <Button
                    size="sm" variant="ghost"
                    className="text-destructive hover:text-destructive h-7"
                    disabled={deletingId === item.id}
                    onClick={(e) => { e.stopPropagation(); handleDeleteNfe(item.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />

        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Notas Fiscais Eletronicas</h3>
          <div className="flex items-center gap-2">
            {pendentes.length > 0 && (
              <Badge className="bg-amber-100 text-amber-800">
                {pendentes.length} pendente{pendentes.length > 1 ? "s" : ""}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={handleSyncEmail}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar Email"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setManualEntryOpen(true)}>
              <FileText className="h-4 w-4 mr-1" /> Digitar NF-e
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pendentes">
              Pendentes {pendentes.length > 0 && `(${pendentes.length})`}
            </TabsTrigger>
            <TabsTrigger value="historico">Historico</TabsTrigger>
            <TabsTrigger value="upload">Upload Manual</TabsTrigger>
            <TabsTrigger value="inbox" onClick={() => { if (emails.length === 0) fetchEmailList(); }}>
              Inbox
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="mt-4">
            {renderTable(pendentes, loadingPendentes, true, (
              <div className="text-center py-12">
                <FileCheck className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma NF-e pendente</p>
                <p className="text-xs text-muted-foreground mt-1">Notas fiscais chegam por email ou upload manual.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveTab("upload")}>
                  Upload Manual
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            {renderTable(historico, loadingHistorico, false, undefined, true)}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <NfeUploadArea />
          </TabsContent>

          <TabsContent value="inbox" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">nfe@ars.eng.br</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{emails.filter((e: any) => !e.seen).length} não lidos</span>
                    <span>·</span>
                    <span>{emails.length} total</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchEmailList} disabled={loadingEmails}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loadingEmails ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              </div>

              {loadingEmails ? (
                <div className="text-center py-8 text-muted-foreground">Carregando emails...</div>
              ) : emails.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Caixa vazia</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique em Atualizar para buscar emails</p>
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {emails.map((email: any) => {
                    const nfeAtts = (email.attachments || []).filter((a: any) => {
                      const fn = (a.filename || "").toLowerCase();
                      return fn.endsWith(".xml") || fn.endsWith(".pdf");
                    });
                    const hasNfe = nfeAtts.length > 0;
                    // Check if already imported by matching remetente + assunto
                    const isImported = historico.some((h: any) =>
                      h.email_remetente === email.from && h.email_assunto === email.subject
                    );

                    return (
                      <div
                        key={email.uid}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${!email.seen ? "bg-blue-50/50" : ""}`}
                      >
                        {/* Status dot */}
                        <div className="flex-shrink-0">
                          {!email.seen ? (
                            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" title="Não lido" />
                          ) : (
                            <div className="h-2.5 w-2.5 rounded-full bg-transparent" />
                          )}
                        </div>

                        {/* Email content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!email.seen ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                              {email.subject || "(sem assunto)"}
                            </p>
                            {isImported && (
                              <Badge className="bg-green-100 text-green-800 text-[10px] flex-shrink-0">Importado</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {email.from}
                          </p>
                        </div>

                        {/* Attachments badge */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {nfeAtts.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                              {nfeAtts.length} {nfeAtts.length === 1 ? "arquivo" : "arquivos"}
                            </Badge>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-xs text-muted-foreground flex-shrink-0 w-20 text-right">
                          {email.date ? new Date(email.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : ""}
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0">
                          {hasNfe && !isImported ? (
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs"
                              disabled={processingUid === email.uid}
                              onClick={() => handleProcessEmail(email.uid, "")}
                            >
                              {processingUid === email.uid ? "..." : "Importar"}
                            </Button>
                          ) : hasNfe && isImported ? (
                            <span className="text-[10px] text-green-600">✓</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-blue-500" /> Não lido</span>
                <span className="flex items-center gap-1"><Badge className="bg-green-100 text-green-800 text-[9px] px-1 py-0">Importado</Badge> Já no sistema</span>
                <span className="flex items-center gap-1"><Paperclip className="h-2.5 w-2.5" /> Tem anexos NF-e</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <NfeReviewDialog
        item={reviewItem}
        open={!!reviewItem}
        onClose={() => setReviewItem(null)}
        onProcessed={handleProcessed}
      />

      <NfeManualEntryDialog
        open={manualEntryOpen}
        onOpenChange={setManualEntryOpen}
        onSaved={() => { refetchPendentes(); refetchHistorico(); }}
      />
    </Layout>
  );
}
