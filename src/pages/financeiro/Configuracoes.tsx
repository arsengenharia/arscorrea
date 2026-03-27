import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { CategoryForm } from "@/components/financeiro/CategoryForm";
import { BankAccountForm } from "@/components/financeiro/BankAccountForm";
import { formatBRL, formatDate } from "@/lib/formatters";
import { FinanceiroTabs } from "./Financeiro";

interface FinancialCategory {
  id: string;
  nome: string;
  prefixo: "CV" | "ROP" | "ADM";
  e_receita: boolean;
  cor_hex: string;
  ativo: boolean;
}

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

export default function Configuracoes() {
  const queryClient = useQueryClient();

  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);

  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["financial-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories" as any)
        .select("*")
        .order("prefixo")
        .order("nome");
      if (error) throw error;
      return data as unknown as FinancialCategory[];
    },
  });

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
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

  const prefixoBadgeVariant = (prefixo: string) => {
    if (prefixo === "CV") return "default";
    if (prefixo === "ROP") return "secondary";
    return "outline";
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />

        {/* Categorias Financeiras */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Categorias Financeiras</h3>
            <Button onClick={() => { setEditingCategory(null); setCategoryFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nova Categoria
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]">Cor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[64px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCategories ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma categoria encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div
                          className="h-6 w-6 rounded-full border border-input"
                          style={{ backgroundColor: c.cor_hex }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>
                        <Badge variant={prefixoBadgeVariant(c.prefixo)}>{c.prefixo}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.e_receita ? "default" : "secondary"}>
                          {c.e_receita ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.ativo ? "default" : "outline"}>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingCategory(c); setCategoryFormOpen(true); }}
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
        </div>

        {/* Contas Bancárias */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Contas Bancárias</h3>
            <Button onClick={() => { setEditingAccount(null); setAccountFormOpen(true); }}>
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
                {loadingAccounts ? (
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
                          onClick={() => { setEditingAccount(a); setAccountFormOpen(true); }}
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
        </div>

        <CategoryForm
          open={categoryFormOpen}
          onOpenChange={setCategoryFormOpen}
          category={editingCategory}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["financial-categories"] })}
        />

        <BankAccountForm
          open={accountFormOpen}
          onOpenChange={setAccountFormOpen}
          account={editingAccount}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["bank-accounts"] })}
        />
      </div>
    </Layout>
  );
}
