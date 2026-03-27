import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Wallet, Clock, AlertTriangle } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { FinanceiroTabs } from "./Financeiro";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatPercent } from "@/lib/formatters";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// ─── Queries ────────────────────────────────────────────────────────────────

async function fetchProjectsSummary() {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, status, orcamento_previsto, custo_realizado, receita_realizada, saldo_atual, margem_atual, iec_atual"
    )
    .in("status", [
      "Pendente",
      "Em Andamento",
      "pendente",
      "em andamento",
      "em_andamento",
      "iniciado",
    ])
    .order("name");
  if (error) throw error;
  return data ?? [];
}

async function fetchPendingCounts() {
  const [entriesRes, txRes] = await Promise.all([
    supabase
      .from("project_financial_entries" as any)
      .select("id", { count: "exact", head: true })
      .eq("situacao", "pendente"),
    supabase
      .from("bank_transactions" as any)
      .select("id", { count: "exact", head: true })
      .eq("status_conciliacao", "pendente"),
  ]);
  return {
    entriesPendentes: entriesRes.count || 0,
    txPendentes: txRes.count || 0,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VisaoGeral() {
  const navigate = useNavigate();

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects-financial-summary"],
    queryFn: fetchProjectsSummary,
  });

  const { data: pending } = useQuery({
    queryKey: ["financial-pending-counts"],
    queryFn: fetchPendingCounts,
  });

  // ── KPI calculations ──────────────────────────────────────────────────────
  const totalReceita = projects.reduce(
    (s, p) => s + (Number(p.receita_realizada) || 0),
    0
  );
  const totalCusto = projects.reduce(
    (s, p) => s + (Number(p.custo_realizado) || 0),
    0
  );
  const totalSaldo = totalReceita - totalCusto;
  const margemMedia =
    totalReceita > 0
      ? ((totalReceita - totalCusto) / totalReceita) * 100
      : 0;
  const obrasNegativas = projects.filter(
    (p) => (Number(p.saldo_atual) || 0) < 0
  ).length;
  const obrasIecAlto = projects.filter(
    (p) => p.iec_atual != null && Number(p.iec_atual) > 1
  ).length;

  const entriesPendentes = pending?.entriesPendentes ?? 0;
  const txPendentes = pending?.txPendentes ?? 0;
  const totalPendencias = entriesPendentes + txPendentes;

  // ── Pending label ─────────────────────────────────────────────────────────
  let pendenciasLabel: string;
  if (entriesPendentes > 0 && txPendentes > 0) {
    pendenciasLabel = `${entriesPendentes} lançamento(s) não conciliado(s), ${txPendentes} transação(ões) pendente(s)`;
  } else if (entriesPendentes > 0) {
    pendenciasLabel = `${entriesPendentes} lançamento(s) não conciliado(s)`;
  } else if (txPendentes > 0) {
    pendenciasLabel = `${txPendentes} transação(ões) pendente(s)`;
  } else {
    pendenciasLabel = "Tudo em dia";
  }

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Receita Total */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loadingProjects ? "—" : formatBRL(totalReceita)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {projects.length} obra{projects.length !== 1 ? "s" : ""} ativa{projects.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          {/* Custo Total */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loadingProjects ? "—" : formatBRL(totalCusto)}
              </div>
            </CardContent>
          </Card>

          {/* Saldo Global */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Global</CardTitle>
              <Wallet className={`h-4 w-4 ${totalSaldo >= 0 ? "text-green-500" : "text-red-500"}`} />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totalSaldo >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {loadingProjects ? "—" : formatBRL(totalSaldo)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margem média: {loadingProjects ? "—" : formatPercent(margemMedia)}
              </p>
            </CardContent>
          </Card>

          {/* Pendências */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendências</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totalPendencias > 0 ? "text-amber-600" : "text-green-600"
                }`}
              >
                {totalPendencias}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {pendenciasLabel}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alert Badges */}
        {(obrasNegativas > 0 || obrasIecAlto > 0) && (
          <div className="flex flex-wrap gap-2">
            {obrasNegativas > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1 py-1 px-3">
                <AlertTriangle className="h-3.5 w-3.5" />
                {obrasNegativas} obra{obrasNegativas !== 1 ? "s" : ""} com saldo negativo
              </Badge>
            )}
            {obrasIecAlto > 0 && (
              <Badge className="flex items-center gap-1 py-1 px-3 bg-orange-500 hover:bg-orange-600 text-white">
                <AlertTriangle className="h-3.5 w-3.5" />
                {obrasIecAlto} obra{obrasIecAlto !== 1 ? "s" : ""} acima do orçamento (IEC &gt; 1)
              </Badge>
            )}
          </div>
        )}

        {/* Projects Summary Table */}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Resumo por Obra</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obra</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">IEC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingProjects ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhuma obra ativa encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((p) => {
                    const saldo = Number(p.saldo_atual) || 0;
                    const margem = Number(p.margem_atual) || 0;
                    const iec = p.iec_atual != null ? Number(p.iec_atual) : null;

                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/obras/${p.id}/financeiro`)}
                      >
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(Number(p.orcamento_previsto) || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(Number(p.receita_realizada) || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(Number(p.custo_realizado) || 0)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            saldo >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatBRL(saldo)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(margem)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            iec != null && iec > 1
                              ? "text-red-600 font-bold"
                              : ""
                          }`}
                        >
                          {iec != null ? iec.toFixed(3) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground">
            Clique em uma obra para ver o dashboard financeiro detalhado.
          </p>
        </div>
      </div>
    </Layout>
  );
}
