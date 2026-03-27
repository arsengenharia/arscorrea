import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Link2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDate } from "@/lib/formatters";
import { FinanceiroTabs } from "./Financeiro";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BankAccount {
  id: string;
  banco: string;
  agencia: string | null;
  conta: string;
  descricao: string | null;
  ativo: boolean;
}

interface BankTransaction {
  id: string;
  bank_account_id: string;
  data_transacao: string;
  descricao_banco: string;
  valor: number;
  status_conciliacao: "pendente" | "conciliado" | "nao_identificado";
  lancamento_id: string | null;
  reconciliation?: {
    lancamento_id: string;
    tipo_match: "auto" | "manual";
  } | null;
}

interface FinancialEntry {
  id: string;
  descricao_banco: string;
  valor: number;
  data: string;
  situacao: string;
  bank_account_id: string | null;
  project: { name: string } | null;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BankTransaction["status"] }) {
  if (status === "conciliado") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        Conciliado
      </span>
    );
  }
  if (status === "nao_identificado") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
        Não identificado
      </span>
    );
  }
  return (
    <Badge variant="outline">Pendente</Badge>
  );
}

// ─── Manual Match Dialog ──────────────────────────────────────────────────────

interface MatchDialogProps {
  transaction: BankTransaction | null;
  accountId: string;
  onClose: () => void;
  onMatched: () => void;
}

function MatchDialog({ transaction, accountId, onClose, onMatched }: MatchDialogProps) {
  const [loading, setLoading] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["pending-entries", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select("*, project:projects(name)")
        .eq("situacao", "pendente")
        .eq("bank_account_id", accountId)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as unknown as FinancialEntry[];
    },
    enabled: !!accountId && !!transaction,
  });

  if (!transaction) return null;

  const suggested = entries.filter(
    (e) => Math.abs(e.valor - Math.abs(transaction.valor)) < 100
  );
  const others = entries.filter(
    (e) => Math.abs(e.valor - Math.abs(transaction.valor)) >= 100
  );
  const orderedEntries = [...suggested, ...others];

  const handleVincular = async (entry: FinancialEntry) => {
    setLoading(true);
    try {
      // 1. Insert reconciliation record
      const { error: recError } = await supabase
        .from("bank_reconciliations" as any)
        .insert({
          transaction_id: transaction.id,
          lancamento_id: entry.id,
          tipo_match: "manual",
        });
      if (recError) throw recError;

      // 2. Update bank transaction
      const { error: txError } = await supabase
        .from("bank_transactions" as any)
        .update({ status_conciliacao: "conciliado", lancamento_id: entry.id })
        .eq("id", transaction.id);
      if (txError) throw txError;

      // 3. Update financial entry
      const { error: entryError } = await supabase
        .from("project_financial_entries" as any)
        .update({ situacao: "conciliado" })
        .eq("id", entry.id);
      if (entryError) throw entryError;

      toast.success("Transação vinculada com sucesso!");
      onMatched();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao vincular: " + (err.message ?? "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular Transação</DialogTitle>
        </DialogHeader>

        {/* Transaction details */}
        <Card className="bg-muted/40">
          <CardContent className="pt-4 pb-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data</span>
              <span className="font-medium">{formatDate(transaction.data_transacao)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descrição</span>
              <span className="font-medium">{transaction.descricao_banco}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor</span>
              <span
                className={
                  transaction.valor >= 0 ? "font-semibold text-green-600" : "font-semibold text-red-600"
                }
              >
                {formatBRL(transaction.valor)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Entries table */}
        <p className="text-sm font-medium text-muted-foreground">
          Lançamentos pendentes
          {suggested.length > 0 && (
            <span className="ml-2 text-green-700">
              ({suggested.length} sugerido{suggested.length > 1 ? "s" : ""} por valor similar)
            </span>
          )}
        </p>

        <div className="border rounded-lg max-h-72 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : orderedEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Nenhum lançamento pendente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                orderedEntries.map((entry, idx) => {
                  const isSuggested = idx < suggested.length;
                  return (
                    <TableRow
                      key={entry.id}
                      className={isSuggested ? "bg-green-50/60" : undefined}
                    >
                      <TableCell className="text-sm">
                        {entry.observacoes || "—"}
                        {isSuggested && (
                          <span className="ml-2 text-[10px] font-semibold text-green-700 uppercase">
                            Sugerido
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.project?.name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(entry.data)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatBRL(entry.valor)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => handleVincular(entry)}
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          Vincular
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Conciliacao() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [matchingTx, setMatchingTx] = useState<BankTransaction | null>(null);

  // Bank accounts dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("*")
        .eq("ativo", true)
        .order("banco");
      if (error) throw error;
      return data as unknown as BankAccount[];
    },
  });

  // Transactions for selected account
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["bank-transactions", selectedAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions" as any)
        .select("*, reconciliation:bank_reconciliations(lancamento_id, tipo_match)")
        .eq("bank_account_id", selectedAccountId)
        .order("data_transacao", { ascending: false });
      if (error) throw error;
      return data as unknown as BankTransaction[];
    },
    enabled: !!selectedAccountId,
  });

  // ── Import CSV ──
  const handleImport = async () => {
    if (!selectedAccountId) {
      toast.error("Selecione uma conta bancária");
      return;
    }
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    setImporting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data URL prefix (data:...;base64,)
          const b64 = result.split(",")[1];
          resolve(b64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("import-bank-statement", {
        body: {
          bank_account_id: selectedAccountId,
          csv_content: base64,
          separator: ";",
        },
      });

      if (error) throw error;

      const { importadas = 0, conciliadas = 0, pendentes = 0 } = data ?? {};
      toast.success(
        `${importadas} transações importadas, ${conciliadas} conciliadas automaticamente, ${pendentes} pendentes`
      );

      queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedAccountId] });
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error("Erro ao importar extrato: " + (err.message ?? "Erro desconhecido"));
    } finally {
      setImporting(false);
    }
  };

  // ── Mark as não identificado ──
  const handleNaoIdentificado = async (tx: BankTransaction) => {
    try {
      const { error } = await supabase
        .from("bank_transactions" as any)
        .update({ status_conciliacao: "nao_identificado" })
        .eq("id", tx.id);
      if (error) throw error;
      toast.success("Transação marcada como não identificada");
      queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedAccountId] });
    } catch (err: any) {
      toast.error("Erro: " + (err.message ?? "Erro desconhecido"));
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />

        <h3 className="text-xl font-semibold">Conciliação Bancária</h3>

        {/* Section 1: Import Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Importar Extrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              {/* Account select */}
              <div className="flex flex-col gap-1.5 w-full sm:w-72">
                <label className="text-sm font-medium">Conta Bancária</label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.banco} — {a.conta}
                        {a.descricao ? ` (${a.descricao})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File input */}
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-sm font-medium">Arquivo CSV (Banco Inter)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <Button onClick={handleImport} disabled={importing} className="shrink-0">
                <Upload className="h-4 w-4 mr-2" />
                {importing ? "Importando..." : "Importar Extrato"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Transactions Table */}
        {selectedAccountId && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando transações...
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma transação encontrada. Importe um extrato para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(tx.data_transacao)}
                      </TableCell>
                      <TableCell className="text-sm max-w-[280px] truncate">
                        {tx.descricao_banco}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-medium ${
                          tx.valor >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatBRL(tx.valor)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status_conciliacao} />
                      </TableCell>
                      <TableCell>
                        {tx.status_conciliacao === "conciliado" && tx.reconciliation ? (
                          <Badge
                            variant={
                              tx.reconciliation.tipo_match === "auto" ? "default" : "secondary"
                            }
                          >
                            {tx.reconciliation.tipo_match === "auto" ? "Auto" : "Manual"}
                          </Badge>
                        ) : tx.status_conciliacao === "pendente" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setMatchingTx(tx)}
                          >
                            <Link2 className="h-3 w-3 mr-1" />
                            Vincular
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {tx.status_conciliacao === "pendente" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-red-600"
                            title="Marcar como não identificado"
                            onClick={() => handleNaoIdentificado(tx)}
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!selectedAccountId && (
          <div className="border rounded-lg py-16 text-center text-muted-foreground text-sm">
            Selecione uma conta bancária para ver as transações
          </div>
        )}
      </div>

      {/* Section 3: Manual Match Dialog */}
      <MatchDialog
        transaction={matchingTx}
        accountId={selectedAccountId}
        onClose={() => setMatchingTx(null)}
        onMatched={() => {
          queryClient.invalidateQueries({ queryKey: ["bank-transactions", selectedAccountId] });
          queryClient.invalidateQueries({ queryKey: ["pending-entries", selectedAccountId] });
        }}
      />
    </Layout>
  );
}
