import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Trash2, Ruler, TrendingUp, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDate } from "@/lib/formatters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type MedicaoStatus = "rascunho" | "em_aprovacao" | "aprovada" | "faturada" | "rejeitada";

interface Medicao {
  id: string;
  project_id: string;
  contract_id: string | null;
  numero: number;
  periodo_inicio: string;
  periodo_fim: string;
  valor_medido: number;
  valor_acumulado: number | null;
  percentual_fisico: number | null;
  status: MedicaoStatus;
  responsavel: string | null;
  observacoes: string | null;
  documento_url: string | null;
  financial_entry_id: string | null;
  contract_payment_id: string | null;
  created_at: string;
  contract: { titulo: string | null } | null;
}

interface Contract {
  id: string;
  titulo: string | null;
  contract_number: string | null;
}

interface MedicaoFormData {
  numero: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_medido: string;
  percentual_fisico: string;
  responsavel: string;
  observacoes: string;
  status: MedicaoStatus;
  contract_id: string;
}

const STATUS_LABELS: Record<MedicaoStatus, string> = {
  rascunho: "Rascunho",
  em_aprovacao: "Em Aprovação",
  aprovada: "Aprovada",
  faturada: "Faturada",
  rejeitada: "Rejeitada",
};

function statusBadge(status: MedicaoStatus) {
  switch (status) {
    case "aprovada":
      return <Badge className="bg-green-100 text-green-800 border-green-200">Aprovada</Badge>;
    case "em_aprovacao":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Em Aprovação</Badge>;
    case "faturada":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Faturada</Badge>;
    case "rejeitada":
      return <Badge className="bg-red-100 text-red-800 border-red-200">Rejeitada</Badge>;
    default:
      return <Badge variant="outline">Rascunho</Badge>;
  }
}

interface MedicaoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contracts: Contract[];
  medicao: Medicao | null;
  nextNumero: number;
  onSaved: () => void;
}

function MedicaoForm({ open, onOpenChange, projectId, contracts, medicao, nextNumero, onSaved }: MedicaoFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MedicaoFormData>(() => ({
    numero: medicao ? String(medicao.numero) : String(nextNumero),
    periodo_inicio: medicao?.periodo_inicio ?? "",
    periodo_fim: medicao?.periodo_fim ?? "",
    valor_medido: medicao ? String(medicao.valor_medido) : "",
    percentual_fisico: medicao?.percentual_fisico != null ? String(medicao.percentual_fisico) : "",
    responsavel: medicao?.responsavel ?? "",
    observacoes: medicao?.observacoes ?? "",
    status: medicao?.status ?? "rascunho",
    contract_id: medicao?.contract_id ?? "__none__",
  }));

  // Reset form when dialog opens/closes or medicao changes
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setForm({
        numero: medicao ? String(medicao.numero) : String(nextNumero),
        periodo_inicio: medicao?.periodo_inicio ?? "",
        periodo_fim: medicao?.periodo_fim ?? "",
        valor_medido: medicao ? String(medicao.valor_medido) : "",
        percentual_fisico: medicao?.percentual_fisico != null ? String(medicao.percentual_fisico) : "",
        responsavel: medicao?.responsavel ?? "",
        observacoes: medicao?.observacoes ?? "",
        status: medicao?.status ?? "rascunho",
        contract_id: medicao?.contract_id ?? "__none__",
      });
    }
    onOpenChange(val);
  };

  const set = (field: keyof MedicaoFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.periodo_inicio || !form.periodo_fim || !form.valor_medido) {
      toast.error("Preencha os campos obrigatórios: período e valor medido.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        project_id: projectId,
        numero: parseInt(form.numero) || nextNumero,
        periodo_inicio: form.periodo_inicio,
        periodo_fim: form.periodo_fim,
        valor_medido: parseFloat(form.valor_medido) || 0,
        percentual_fisico: form.percentual_fisico ? parseFloat(form.percentual_fisico) : null,
        responsavel: form.responsavel || null,
        observacoes: form.observacoes || null,
        status: form.status,
        contract_id: form.contract_id && form.contract_id !== "__none__" ? form.contract_id : null,
      };

      if (medicao) {
        const { error } = await supabase
          .from("medicoes" as any)
          .update(payload)
          .eq("id", medicao.id);
        if (error) throw error;
        toast.success("Medição atualizada!");
      } else {
        const { error } = await supabase
          .from("medicoes" as any)
          .insert(payload);
        if (error) throw error;
        toast.success("Medição criada!");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar medição");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{medicao ? "Editar Medição" : "Nova Medição"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="numero">Nº</Label>
              <Input
                id="numero"
                type="number"
                min={1}
                value={form.numero}
                onChange={(e) => set("numero", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as MedicaoStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as MedicaoStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="periodo_inicio">Início do Período *</Label>
              <Input
                id="periodo_inicio"
                type="date"
                value={form.periodo_inicio}
                onChange={(e) => set("periodo_inicio", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="periodo_fim">Fim do Período *</Label>
              <Input
                id="periodo_fim"
                type="date"
                value={form.periodo_fim}
                onChange={(e) => set("periodo_fim", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="valor_medido">Valor Medido (R$) *</Label>
              <Input
                id="valor_medido"
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={form.valor_medido}
                onChange={(e) => set("valor_medido", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="percentual_fisico">% Físico</Label>
              <Input
                id="percentual_fisico"
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0–100"
                value={form.percentual_fisico}
                onChange={(e) => set("percentual_fisico", e.target.value)}
              />
            </div>
          </div>

          {contracts.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="contract_id">Contrato</Label>
              <Select value={form.contract_id} onValueChange={(v) => set("contract_id", v)}>
                <SelectTrigger id="contract_id">
                  <SelectValue placeholder="Nenhum contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum contrato</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contract_number ? `${c.contract_number} — ` : ""}{c.titulo ?? "Contrato sem título"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="responsavel">Responsável pela Medição</Label>
            <Input
              id="responsavel"
              placeholder="Nome do responsável"
              value={form.responsavel}
              onChange={(e) => set("responsavel", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              rows={3}
              placeholder="Observações sobre esta medição..."
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : medicao ? "Salvar alterações" : "Criar medição"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Medicoes() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMedicao, setEditingMedicao] = useState<Medicao | null>(null);
  const [deletingMedicao, setDeletingMedicao] = useState<Medicao | null>(null);

  const { data: project } = useQuery({
    queryKey: ["project-name", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: medicoes = [], isLoading } = useQuery({
    queryKey: ["medicoes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicoes" as any)
        .select("*, contract:contracts(titulo)")
        .eq("project_id", projectId!)
        .order("numero", { ascending: false });
      if (error) throw error;
      return data as unknown as Medicao[];
    },
    enabled: !!projectId,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["project-contracts", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, titulo, contract_number")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!projectId,
  });

  const totalMedido = medicoes.reduce((sum, m) => sum + (m.valor_medido ?? 0), 0);
  const latestPercentual = medicoes.find((m) => m.percentual_fisico != null)?.percentual_fisico ?? null;

  const statusCounts = medicoes.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {});

  const nextNumero = medicoes.length > 0
    ? Math.max(...medicoes.map((m) => m.numero)) + 1
    : 1;

  const handleDelete = async () => {
    if (!deletingMedicao) return;
    try {
      const { error } = await supabase
        .from("medicoes" as any)
        .delete()
        .eq("id", deletingMedicao.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["medicoes", projectId] });
      toast.success("Medição excluída!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir medição");
    } finally {
      setDeletingMedicao(null);
    }
  };

  const openCreate = () => {
    setEditingMedicao(null);
    setFormOpen(true);
  };

  const openEdit = (m: Medicao) => {
    setEditingMedicao(m);
    setFormOpen(true);
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/obras/${projectId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">
              Medições{project?.name ? ` — ${project.name}` : ""}
            </h2>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nova Medição
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Total Medido */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Medido</p>
                  <p className="text-xl font-bold font-mono">{formatBRL(totalMedido)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* % Físico */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart2 className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">% Físico (última)</p>
                  <p className="text-xl font-bold">
                    {latestPercentual != null ? `${latestPercentual.toFixed(1)}%` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contagem / Status */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Medições</p>
                  <p className="text-xl font-bold">{medicoes.length}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(statusCounts).map(([s, count]) => (
                      <span key={s} className="text-xs text-muted-foreground">
                        {STATUS_LABELS[s as MedicaoStatus]}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Nº</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead className="text-right">Valor Medido</TableHead>
                <TableHead className="text-right">% Físico</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : medicoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma medição encontrada. Clique em "Nova Medição" para começar.
                  </TableCell>
                </TableRow>
              ) : (
                medicoes.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono font-medium">#{m.numero}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatDate(m.periodo_inicio)} – {formatDate(m.periodo_fim)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.contract?.titulo ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatBRL(m.valor_medido)}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.percentual_fisico != null ? `${m.percentual_fisico.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{m.responsavel ?? "—"}</TableCell>
                    <TableCell>{statusBadge(m.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingMedicao(m)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Form Dialog */}
        <MedicaoForm
          open={formOpen}
          onOpenChange={setFormOpen}
          projectId={projectId!}
          contracts={contracts}
          medicao={editingMedicao}
          nextNumero={nextNumero}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["medicoes", projectId] })}
        />

        {/* Delete Confirm */}
        <AlertDialog open={!!deletingMedicao} onOpenChange={(o) => { if (!o) setDeletingMedicao(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Medição</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a medição #{deletingMedicao?.numero}? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
