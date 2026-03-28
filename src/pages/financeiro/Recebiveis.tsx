import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAiCommandListener } from "@/hooks/useAiCommands";
import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import { HandCoins, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDate } from "@/lib/formatters";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractPayment {
  id: string;
  contract_id: string;
  kind: "entrada" | "parcela" | "comissao";
  expected_value: number;
  expected_date: string | null;
  received_value: number | null;
  received_date: string | null;
  status: "pendente" | "parcial" | "recebido";
  order_index: number | null;
  description: string | null;
  notes: string | null;
  contract: {
    titulo: string | null;
    contract_number: string | null;
    project_id: string | null;
    status: string | null;
    client: { name: string } | null;
    project: { name: string } | null;
  } | null;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];

function getDisplayStatus(payment: ContractPayment): "recebido" | "vencido" | "parcial" | "pendente" {
  if (payment.status === "recebido") return "recebido";
  if (payment.expected_date && payment.expected_date < today) return "vencido";
  if (payment.status === "parcial") return "parcial";
  return "pendente";
}

function StatusBadge({ payment }: { payment: ContractPayment }) {
  const s = getDisplayStatus(payment);
  if (s === "recebido") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Recebido</Badge>;
  if (s === "vencido") return <Badge variant="destructive">Vencido</Badge>;
  if (s === "parcial") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Parcial</Badge>;
  return <Badge variant="outline">Pendente</Badge>;
}

function KindBadge({ kind }: { kind: string }) {
  if (kind === "entrada") return <Badge variant="secondary">Entrada</Badge>;
  if (kind === "comissao") return <Badge variant="secondary">Comissão</Badge>;
  return <Badge variant="outline">Parcela</Badge>;
}

// ─── Registrar Recebimento Dialog ─────────────────────────────────────────────

function RegistrarRecebimentoDialog({
  payment,
  open,
  onClose,
  onSaved,
}: {
  payment: ContractPayment | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [tipoPagamento, setTipoPagamento] = useState("Pix");
  const [bankAccountId, setBankAccountId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [valor, setValor] = useState(0);

  const remaining = payment
    ? Number(payment.expected_value || 0) - Number(payment.received_value || 0)
    : 0;

  useEffect(() => {
    if (payment) {
      setValor(remaining);
      setData(new Date().toISOString().split("T")[0]);
      setTipoPagamento("Pix");
    }
  }, [payment]);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bank_accounts" as any)
        .select("id, banco, conta, descricao")
        .eq("ativo", true)
        .order("banco");
      return (data as any[]) ?? [];
    },
    enabled: open,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["revenue-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_categories" as any)
        .select("id, nome, codigo, prefixo")
        .eq("ativo", true)
        .eq("e_receita", true)
        .order("nome");
      return (data as any[]) ?? [];
    },
    enabled: open,
  });

  // Auto-fill bank account from project
  useEffect(() => {
    if (open && payment?.contract?.project_id) {
      supabase
        .from("projects")
        .select("bank_account_id")
        .eq("id", payment.contract.project_id)
        .single()
        .then(({ data: proj }: { data: any }) => {
          if (proj?.bank_account_id) setBankAccountId(proj.bank_account_id);
        });
    }
  }, [open, payment]);

  // Auto-select default category
  useEffect(() => {
    if (categorias.length > 0 && !categoriaId) {
      const defaultCat =
        categorias.find((c: any) => c.codigo === "aporte_clientes") ||
        categorias[0];
      setCategoriaId(defaultCat.id);
    }
  }, [categorias]);

  const handleConfirm = async () => {
    if (!payment) return;
    if (!bankAccountId) { toast.error("Selecione uma conta bancária"); return; }
    if (!categoriaId) { toast.error("Selecione uma categoria"); return; }
    if (valor <= 0) { toast.error("Valor deve ser positivo"); return; }

    setSaving(true);
    try {
      // 1. Create financial entry
      const { error } = await supabase.from("project_financial_entries" as any).insert({
        project_id: payment.contract?.project_id,
        bank_account_id: bankAccountId,
        category_id: categoriaId,
        data,
        valor,
        tipo_documento: tipoPagamento,
        situacao: "pendente",
        observacoes: `Recebimento ${payment.contract?.titulo || ""} — ${
          payment.kind === "entrada" ? "Entrada" : payment.kind === "comissao" ? "Comissão" : "Parcela"
        }`,
        contract_payment_id: payment.id,
      });
      if (error) throw error;

      // 2. Auto-sync contract payment status
      const newReceived = Number(payment.received_value || 0) + valor;
      const expected = Number(payment.expected_value);
      const newStatus = newReceived >= expected ? "recebido" : "parcial";

      await supabase.from("contract_payments").update({
        received_value: newReceived,
        received_date: data,
        status: newStatus,
      }).eq("id", payment.id);

      // 3. Recalculate project balance if RPC exists
      try {
        await supabase.rpc("calc_project_balance" as any, {
          p_project_id: payment.contract?.project_id,
        });
      } catch (_) {
        // RPC may not exist; ignore
      }

      toast.success("Recebimento registrado com sucesso!");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Recebimento</DialogTitle>
        </DialogHeader>

        {/* Payment details — readonly */}
        <Card className="bg-muted/40">
          <CardContent className="pt-4 pb-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Contrato</p>
              <p className="font-medium">{payment.contract?.titulo || payment.contract?.contract_number || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Cliente</p>
              <p className="font-medium">{payment.contract?.client?.name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Obra</p>
              <p className="font-medium">{payment.contract?.project?.name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Tipo</p>
              <p className="font-medium">
                {payment.kind === "entrada" ? "Entrada" : payment.kind === "comissao" ? "Comissão" : "Parcela"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Valor Previsto</p>
              <p className="font-semibold">{formatBRL(Number(payment.expected_value))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Saldo a Receber</p>
              <p className="font-semibold text-amber-600">{formatBRL(remaining)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Editable fields */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Data *</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Forma de Pagamento</Label>
              <Select value={tipoPagamento} onValueChange={setTipoPagamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Pix", "Boleto", "Transferência", "Dinheiro", "Outros"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Conta Bancária *</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.banco} — {a.conta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    [{c.prefixo}] {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "Salvando..." : "Confirmar Recebimento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Recebiveis() {
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<ContractPayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // AI smart filter: listen for filter_recebiveis commands from the chat panel
  const handleAiFilter = useCallback((params: Record<string, any>) => {
    if (params.project_id) {
      setFilterProject(params.project_id);
    }
    if (params.status) {
      setFilterStatus(params.status);
    }
  }, []);
  useAiCommandListener("filter_recebiveis", handleAiFilter);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["all-receivables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_payments")
        .select(
          "*, contract:contracts(titulo, contract_number, project_id, status, client:clients(name), project:projects(name))"
        )
        .order("expected_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContractPayment[];
    },
  });

  // Distinct projects from the data (for filter)
  const projects = Array.from(
    new Map(
      payments
        .filter((p) => p.contract?.project_id && p.contract?.project?.name)
        .map((p) => [p.contract!.project_id!, p.contract!.project!.name])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  // KPI computations
  const now = new Date().toISOString().split("T")[0];
  const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const minus30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  let totalAReceber = 0;
  let totalVencido = 0;
  let totalAVencer30 = 0;
  let totalRecebido30 = 0;

  for (const p of payments) {
    const saldo = Number(p.expected_value) - Number(p.received_value || 0);
    const isRecebido = p.status === "recebido";

    if (!isRecebido) {
      totalAReceber += saldo;
      if (p.expected_date && p.expected_date < now) {
        totalVencido += saldo;
      } else if (p.expected_date && p.expected_date >= now && p.expected_date <= plus30) {
        totalAVencer30 += saldo;
      }
    }

    if (p.received_value && p.received_date && p.received_date >= minus30) {
      totalRecebido30 += Number(p.received_value);
    }
  }

  // Filtered rows
  const filtered = payments.filter((p) => {
    const ds = getDisplayStatus(p);
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "vencido" ? ds === "vencido" : p.status === filterStatus);
    const matchProject =
      filterProject === "all" || p.contract?.project_id === filterProject;
    return matchStatus && matchProject;
  });

  const handleRegistrar = (payment: ContractPayment) => {
    setSelectedPayment(payment);
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financeiro</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Visão consolidada de todos os recebíveis por contrato.
          </p>
        </div>

        <FinanceiroTabs />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-blue-50">
                  <HandCoins className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Total a Receber</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatBRL(totalAReceber)}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-rose-50">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Vencido</span>
              </div>
              <p className="text-xl font-bold text-rose-600">{formatBRL(totalVencido)}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-amber-50">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">A Vencer (30d)</span>
              </div>
              <p className="text-xl font-bold text-foreground">{formatBRL(totalAVencer30)}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-emerald-50">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Recebido (30d)</span>
              </div>
              <p className="text-xl font-bold text-emerald-600">{formatBRL(totalRecebido30)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {projects.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filterStatus !== "all" || filterProject !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterStatus("all"); setFilterProject("all"); }}
            >
              Limpar filtros
            </Button>
          )}

          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor Previsto</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      Nenhum recebível encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const saldo = Number(p.expected_value) - Number(p.received_value || 0);
                    const isOverdue =
                      p.expected_date && p.expected_date < now && p.status !== "recebido";
                    const received = Number(p.received_value || 0);
                    const isRecebido = p.status === "recebido";

                    return (
                      <TableRow key={p.id} className="group">
                        <TableCell className={isOverdue ? "text-rose-600 font-medium" : ""}>
                          {formatDate(p.expected_date)}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm">
                          {p.contract?.project?.name || "—"}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm">
                          {p.contract?.titulo || p.contract?.contract_number || "—"}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate text-sm text-muted-foreground">
                          {p.contract?.client?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <KindBadge kind={p.kind} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBRL(Number(p.expected_value))}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${received > 0 ? "text-emerald-600" : "text-muted-foreground"}`}
                        >
                          {formatBRL(received)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold">
                          {formatBRL(saldo)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge payment={p} />
                        </TableCell>
                        <TableCell>
                          {!isRecebido && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                              onClick={() => handleRegistrar(p)}
                            >
                              Registrar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <RegistrarRecebimentoDialog
        payment={selectedPayment}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedPayment(null);
        }}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["all-receivables"] });
        }}
      />
    </Layout>
  );
}
