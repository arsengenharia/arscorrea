import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Upload, Eye, FileText, FileCheck, RefreshCw } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/formatters";
import { FinanceiroTabs } from "./Financeiro";
import { useNfeInbox, type NfeInboxItem } from "@/hooks/useNfeInbox";
import { NfeReviewDialog } from "@/components/financeiro/NfeReviewDialog";
import { NfeUploadArea } from "@/components/financeiro/NfeUploadArea";
import { NfeManualEntryDialog } from "@/components/financeiro/NfeManualEntryDialog";

function OrigemBadge({ origem }: { origem: string }) {
  if (origem === "email") return <Badge variant="outline"><Mail className="h-3 w-3 mr-1" />Email</Badge>;
  return <Badge variant="outline"><Upload className="h-3 w-3 mr-1" />Upload</Badge>;
}

export default function NfeInbox() {
  const [reviewItem, setReviewItem] = useState<NfeInboxItem | null>(null);
  const [activeTab, setActiveTab] = useState("pendentes");
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const renderTable = (items: NfeInboxItem[], loading: boolean, showActions: boolean, emptyState?: React.ReactNode) => (
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={showActions ? 9 : 8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : items.length === 0 ? (
            <TableRow><TableCell colSpan={showActions ? 9 : 8}>
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
            {renderTable(historico, loadingHistorico, false)}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <NfeUploadArea />
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
