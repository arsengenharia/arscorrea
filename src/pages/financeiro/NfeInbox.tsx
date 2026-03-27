import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Upload, Eye } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/formatters";
import { FinanceiroTabs } from "./Financeiro";
import { useNfeInbox, type NfeInboxItem } from "@/hooks/useNfeInbox";
import { NfeReviewDialog } from "@/components/financeiro/NfeReviewDialog";
import { NfeUploadArea } from "@/components/financeiro/NfeUploadArea";
import { NfeManualEntryForm } from "@/components/financeiro/NfeManualEntryForm";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    recebido: { label: "Recebido", className: "bg-blue-100 text-blue-800" },
    processando: { label: "Processando", className: "bg-yellow-100 text-yellow-800" },
    aguardando_revisao: { label: "Aguardando Revisao", className: "bg-amber-100 text-amber-800" },
    aprovado: { label: "Aprovado", className: "bg-green-100 text-green-800" },
    rejeitado: { label: "Rejeitado", className: "bg-red-100 text-red-800" },
    duplicata: { label: "Duplicata", className: "bg-gray-100 text-gray-800" },
    erro: { label: "Erro", className: "bg-red-100 text-red-800" },
  };
  const s = map[status] ?? { label: status, className: "" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
}

function OrigemBadge({ origem }: { origem: string }) {
  if (origem === "email") return <Badge variant="outline"><Mail className="h-3 w-3 mr-1" />Email</Badge>;
  return <Badge variant="outline"><Upload className="h-3 w-3 mr-1" />Upload</Badge>;
}

export default function NfeInbox() {
  const [reviewItem, setReviewItem] = useState<NfeInboxItem | null>(null);
  const [activeTab, setActiveTab] = useState("pendentes");

  const { items: pendentes, loading: loadingPendentes, refetch: refetchPendentes } =
    useNfeInbox("aguardando_revisao");
  const { items: historico, loading: loadingHistorico, refetch: refetchHistorico } =
    useNfeInbox();

  const handleProcessed = () => {
    refetchPendentes();
    refetchHistorico();
  };

  const renderTable = (items: NfeInboxItem[], loading: boolean, showActions: boolean) => (
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
            <TableRow><TableCell colSpan={showActions ? 9 : 8} className="text-center py-8 text-muted-foreground">Nenhuma nota fiscal encontrada</TableCell></TableRow>
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
          {pendentes.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800">
              {pendentes.length} pendente{pendentes.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pendentes">
              Pendentes {pendentes.length > 0 && `(${pendentes.length})`}
            </TabsTrigger>
            <TabsTrigger value="historico">Historico</TabsTrigger>
            <TabsTrigger value="upload">Upload Manual</TabsTrigger>
            <TabsTrigger value="manual">Inserção Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="mt-4">
            {renderTable(pendentes, loadingPendentes, true)}
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            {renderTable(historico, loadingHistorico, false)}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <NfeUploadArea />
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <NfeManualEntryForm />
          </TabsContent>
        </Tabs>
      </div>

      <NfeReviewDialog
        item={reviewItem}
        open={!!reviewItem}
        onClose={() => setReviewItem(null)}
        onProcessed={handleProcessed}
      />
    </Layout>
  );
}
