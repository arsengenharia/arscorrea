# NF-e Plano C — Frontend Inbox + Aprovacao

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NF-e inbox page with real-time updates, review/approval dialog, manual XML upload, and a badge counter in the sidebar showing pending NF-e count.

**Architecture:** One main page (`/financeiro/nfe`) with 3 sections: pending inbox table (Supabase Realtime subscription), approval dialog (select project + bank account + category, view items), and upload area (drag-and-drop XML/PDF). Badge in TopNavigation shows count of `aguardando_revisao` items.

**Tech Stack:** React 18, TypeScript, Supabase Realtime, Shadcn UI, React Query.

---

## Pre-requisites

- **Plano A completed** (nfe_inbox table, NF-e tab in financeiro)
- **Plano B completed** (edge functions deployed)
- Existing pages: `/financeiro/nfe` placeholder exists (from Plano A Task 5)

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `src/hooks/useNfeInbox.ts` | Supabase Realtime subscription for nfe_inbox changes |
| `src/hooks/useNfePendingCount.ts` | Returns count of `aguardando_revisao` items (for badge) |
| `src/components/financeiro/NfeReviewDialog.tsx` | Dialog: readonly NF-e data + editable project/category/bank account selection |
| `src/components/financeiro/NfeUploadArea.tsx` | Drag-and-drop / file input for manual XML/PDF upload |

### Modified Files

| File | Change |
|---|---|
| `src/pages/financeiro/NfeInbox.tsx` | Replace placeholder with full implementation |
| `src/components/layout/TopNavigation.tsx` | Add badge with pending NF-e count next to "Financeiro" menu item |

---

## Task 1: Realtime hook `useNfeInbox`

**Files:**
- Create: `src/hooks/useNfeInbox.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useNfeInbox.ts
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NfeInboxItem {
  id: string;
  status: string;
  origem: string;
  arquivo_path: string;
  arquivo_tipo: string;
  cnpj: string | null;
  razao_social: string | null;
  numero_nota: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  chave_nfe: string | null;
  supplier_id: string | null;
  categoria_sugerida: string | null;
  ai_confianca: number | null;
  ai_justificativa: string | null;
  itens_json: any[] | null;
  obras_ativas_json: any[] | null;
  observacao: string | null;
  created_at: string;
  email_remetente: string | null;
  supplier?: { trade_name: string } | null;
}

export function useNfeInbox(statusFilter?: string) {
  const [items, setItems] = useState<NfeInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    let query = supabase
      .from("nfe_inbox" as any)
      .select("*, supplier:suppliers(trade_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    setItems((data as unknown as NfeInboxItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();

    // Realtime subscription — re-fetch on any change to nfe_inbox
    const channel = supabase
      .channel("nfe-inbox-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nfe_inbox" },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  return { items, loading, refetch: fetchItems };
}
```

- [ ] **Step 2: Create the pending count hook**

```typescript
// src/hooks/useNfePendingCount.ts
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useNfePendingCount() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    const { count: c } = await supabase
      .from("nfe_inbox" as any)
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando_revisao");
    setCount(c ?? 0);
  };

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel("nfe-inbox-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nfe_inbox" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNfeInbox.ts src/hooks/useNfePendingCount.ts
git commit -m "feat: add Supabase Realtime hooks for NF-e inbox"
```

---

## Task 2: Review/Approval Dialog

**Files:**
- Create: `src/components/financeiro/NfeReviewDialog.tsx`

- [ ] **Step 1: Create the dialog component**

```tsx
// src/components/financeiro/NfeReviewDialog.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { ExternalLink, Bot, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDate } from "@/lib/formatters";
import type { NfeInboxItem } from "@/hooks/useNfeInbox";

interface NfeReviewDialogProps {
  item: NfeInboxItem | null;
  open: boolean;
  onClose: () => void;
  onProcessed: () => void;
}

export function NfeReviewDialog({ item, open, onClose, onProcessed }: NfeReviewDialogProps) {
  const [projectId, setProjectId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [categoriaCodigo, setCategoriaCodigo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  // Projects query
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-nfe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, bank_account_id")
        .in("status", ["Pendente", "Em Andamento", "pendente", "em andamento", "em_andamento", "iniciado"])
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; bank_account_id: string | null }[];
    },
    enabled: open,
  });

  // Bank accounts query
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-for-nfe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("id, banco, conta, descricao")
        .eq("ativo", true)
        .order("banco");
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  // Categories query (only CV and ADM — expenses)
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-for-nfe"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories" as any)
        .select("id, nome, codigo, prefixo")
        .eq("ativo", true)
        .eq("e_receita", false)
        .order("prefixo")
        .order("nome");
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  // Pre-fill category when item changes
  if (item && !categoriaCodigo && item.categoria_sugerida) {
    setCategoriaCodigo(item.categoria_sugerida);
  }

  // Auto-fill bank account when project is selected
  const handleProjectChange = (pid: string) => {
    setProjectId(pid);
    const proj = projects.find((p) => p.id === pid);
    if (proj?.bank_account_id) {
      setBankAccountId(proj.bank_account_id);
    }
  };

  const handleApprove = async () => {
    if (!projectId) { toast.error("Selecione uma obra"); return; }
    if (!categoriaCodigo) { toast.error("Selecione uma categoria"); return; }
    if (!bankAccountId) { toast.error("Selecione uma conta bancaria"); return; }
    if (!item) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("approve-nfe", {
        body: {
          nfe_inbox_id: item.id,
          project_id: projectId,
          bank_account_id: bankAccountId,
          categoria_codigo: categoriaCodigo,
          observacoes,
        },
      });

      if (error) throw error;
      toast.success("NF-e aprovada e lancamento criado!");
      resetForm();
      onProcessed();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao aprovar: " + (err.message ?? "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await supabase
        .from("nfe_inbox" as any)
        .update({ status: "rejeitado", observacao: observacoes || "Rejeitada pelo usuario" })
        .eq("id", item.id);
      toast.success("NF-e rejeitada");
      resetForm();
      onProcessed();
      onClose();
    } catch {
      toast.error("Erro ao rejeitar");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setProjectId("");
    setBankAccountId("");
    setCategoriaCodigo("");
    setObservacoes("");
  };

  if (!item) return null;

  const itens = (item.itens_json ?? []) as Array<{ xProd: string; vProd: number; NCM: string }>;
  const confiancaPct = item.ai_confianca ? Math.round(item.ai_confianca * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar NF-e</DialogTitle>
        </DialogHeader>

        {/* Readonly NF-e data */}
        <Card className="bg-muted/40">
          <CardContent className="pt-4 pb-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Fornecedor</p>
              <p className="font-medium">{item.razao_social || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">CNPJ</p>
              <p className="font-mono text-xs">{item.cnpj || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">N Nota</p>
              <p className="font-medium">{item.numero_nota || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Valor Total</p>
              <p className="font-semibold text-red-600">{item.valor_total ? formatBRL(item.valor_total) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Data Emissao</p>
              <p>{item.data_emissao ? formatDate(item.data_emissao) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Origem</p>
              <p>{item.origem === "email" ? "Email" : "Upload manual"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Chave NF-e</p>
              <p className="font-mono text-[10px] break-all">{item.chave_nfe || "—"}</p>
            </div>
            <div>
              <a
                href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/nfe-attachments/${item.arquivo_path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-xs flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Ver arquivo original
              </a>
            </div>
          </CardContent>
        </Card>

        {/* AI suggestion */}
        {item.categoria_sugerida && (
          <div className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-blue-500" />
            <span>Sugestao IA:</span>
            <Badge variant="secondary">{item.categoria_sugerida}</Badge>
            <span className="text-muted-foreground">({confiancaPct}% confianca)</span>
            {item.ai_justificativa && (
              <span className="text-muted-foreground text-xs">— {item.ai_justificativa}</span>
            )}
          </div>
        )}

        {/* Items table */}
        {itens.length > 0 && (
          <div className="border rounded-lg max-h-40 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{it.xProd}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.NCM}</TableCell>
                    <TableCell className="text-right text-sm">{formatBRL(it.vProd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Obra *</Label>
              <Select value={projectId} onValueChange={handleProjectChange}>
                <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Conta Bancaria *</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.banco} - {a.conta}{a.descricao ? ` (${a.descricao})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select value={categoriaCodigo} onValueChange={setCategoriaCodigo}>
              <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => (
                  <SelectItem key={c.codigo} value={c.codigo}>[{c.prefixo}] {c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="destructive" size="sm" onClick={handleReject} disabled={saving}>
            <XCircle className="h-4 w-4 mr-1" /> Rejeitar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleApprove} disabled={saving}>
              {saving ? "Processando..." : "Aprovar e Lancar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/financeiro/NfeReviewDialog.tsx
git commit -m "feat: add NF-e review/approval dialog with project and category selection"
```

---

## Task 3: Upload Area component

**Files:**
- Create: `src/components/financeiro/NfeUploadArea.tsx`

- [ ] **Step 1: Create the upload component**

```tsx
// src/components/financeiro/NfeUploadArea.tsx
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileUp } from "lucide-react";
import { toast } from "sonner";

export function NfeUploadArea() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) => f.name.endsWith(".xml") || f.name.endsWith(".pdf")
    );

    if (fileArray.length === 0) {
      toast.error("Selecione arquivos XML ou PDF de NF-e");
      return;
    }

    setUploading(true);
    let uploaded = 0;

    for (const file of fileArray) {
      const path = `inbox/${Date.now()}-${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from("nfe-attachments")
        .upload(path, file, { contentType: file.type });

      if (uploadErr) {
        toast.error(`Erro ao enviar ${file.name}: ${uploadErr.message}`);
        continue;
      }

      const isXml = file.name.toLowerCase().endsWith(".xml");

      const { error: insertErr } = await supabase.from("nfe_inbox" as any).insert({
        status: "recebido",
        origem: "upload_manual",
        arquivo_path: path,
        arquivo_tipo: isXml ? "xml" : "pdf",
      });

      if (insertErr) {
        toast.error(`Erro ao registrar ${file.name}`);
      } else {
        uploaded++;
      }
    }

    if (uploaded > 0) {
      toast.success(`${uploaded} arquivo(s) enviado(s) para processamento`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Manual de NF-e</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Arraste arquivos XML ou PDF de NF-e aqui, ou clique para selecionar
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Enviando..." : "Selecionar Arquivos"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/financeiro/NfeUploadArea.tsx
git commit -m "feat: add NF-e drag-and-drop upload component"
```

---

## Task 4: NfeInbox full page implementation

**Files:**
- Modify: `src/pages/financeiro/NfeInbox.tsx`

- [ ] **Step 1: Replace placeholder with full implementation**

```tsx
// src/pages/financeiro/NfeInbox.tsx
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
                  <Button size="sm" variant="outline" onClick={() => setReviewItem(item)}>
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
```

- [ ] **Step 2: Verify build**

```bash
cd /tmp/arscorrea && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/financeiro/NfeInbox.tsx
git commit -m "feat: implement NF-e inbox page with pending/historico/upload tabs"
```

---

## Task 5: Badge in TopNavigation

**Files:**
- Modify: `src/components/layout/TopNavigation.tsx`

- [ ] **Step 1: Add pending count badge**

In `src/components/layout/TopNavigation.tsx`:

Add import:
```typescript
import { useNfePendingCount } from "@/hooks/useNfePendingCount";
```

Inside the `TopNavigation` component, add:
```typescript
const nfePendingCount = useNfePendingCount();
```

In the desktop nav section, find the menu item rendering and add a badge after the "Financeiro" item text. The menuItems array renders `<span>{item.title}</span>`. Add conditional badge:

After `<span>{item.title}</span>`, add:
```tsx
{item.title === "Financeiro" && nfePendingCount > 0 && (
  <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-amber-500 text-white text-[10px] font-bold px-1">
    {nfePendingCount}
  </span>
)}
```

Apply the same in the mobile Sheet menu.

- [ ] **Step 2: Verify build, commit**

```bash
git add src/components/layout/TopNavigation.tsx
git commit -m "feat: add NF-e pending count badge to Financeiro menu item"
```

---

## Summary

| Task | What | Effort |
|---|---|---|
| 1 | Realtime hooks (inbox + count) | Low |
| 2 | Review/approval dialog | Medium |
| 3 | Upload area (drag-and-drop) | Low |
| 4 | NfeInbox full page (3 tabs) | Medium |
| 5 | Badge in TopNavigation | Trivial |

**Total: 5 tasks, ~15 steps.**

After all 3 plans: the complete NF-e module is operational — email reception, XML parsing, AI classification, manual upload, review/approval UI, automatic financial entry creation, real-time notifications.
