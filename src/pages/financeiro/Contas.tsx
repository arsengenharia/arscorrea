import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { BankAccountForm } from "@/components/financeiro/BankAccountForm";
import { formatBRL, formatDate } from "@/lib/formatters";
import { FinanceiroTabs } from "./Financeiro";

interface BankAccount {
  id: string;
  banco: string;
  agencia: string | null;
  conta: string;
  descricao: string | null;
  saldo_inicial: number;
  data_saldo_inicial: string;
  ativo: boolean;
}

export default function Contas() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("*")
        .order("banco");
      if (error) throw error;
      return data as unknown as BankAccount[];
    },
  });

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Contas Bancárias</h3>
          <Button onClick={() => { setEditingAccount(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Conta
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Apelido</TableHead>
                <TableHead>Saldo Inicial</TableHead>
                <TableHead>Data Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[64px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma conta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.banco}</TableCell>
                    <TableCell>{a.agencia || "—"}</TableCell>
                    <TableCell>{a.conta}</TableCell>
                    <TableCell>{a.descricao || "—"}</TableCell>
                    <TableCell>{formatBRL(a.saldo_inicial)}</TableCell>
                    <TableCell>{formatDate(a.data_saldo_inicial)}</TableCell>
                    <TableCell>
                      <Badge variant={a.ativo ? "default" : "outline"}>
                        {a.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingAccount(a); setFormOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <BankAccountForm
          open={formOpen}
          onOpenChange={setFormOpen}
          account={editingAccount}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["bank-accounts"] })}
        />
      </div>
    </Layout>
  );
}
