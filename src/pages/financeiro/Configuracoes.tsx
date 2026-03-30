import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Pencil, ChevronDown, Tags, Landmark, Shield, Bell } from "lucide-react";
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

const prefixoLabels: Record<string, string> = {
  CV: "Custo da Venda (Direto)",
  ROP: "Receita Operacional",
  ADM: "Administrativo (Indireto)",
};

export default function Configuracoes() {
  const queryClient = useQueryClient();

  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

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

  // Group categories by prefixo
  const grouped = categories.reduce<Record<string, FinancialCategory[]>>((acc, c) => {
    (acc[c.prefixo] = acc[c.prefixo] || []).push(c);
    return acc;
  }, {});

  const activeCategories = categories.filter((c) => c.ativo).length;
  const activeAccounts = accounts.filter((a) => a.ativo).length;

  return (
    <Layout>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
        <FinanceiroTabs />

        <div className="space-y-3">
          {/* ── Categorias Financeiras ── */}
          <Collapsible open={openSections["categorias"]} onOpenChange={() => toggleSection("categorias")}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Tags className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium">Categorias Financeiras</CardTitle>
                        <CardDescription className="text-xs">
                          {activeCategories} ativas de {categories.length} categorias
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 mr-2">
                        {(["CV", "ROP", "ADM"] as const).map((p) => (
                          <Badge key={p} variant={p === "CV" ? "default" : p === "ROP" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                            {p} {grouped[p]?.length || 0}
                          </Badge>
                        ))}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections["categorias"] ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-4">
                    {(["CV", "ROP", "ADM"] as const).map((prefixo) => {
                      const items = grouped[prefixo] || [];
                      if (items.length === 0) return null;
                      return (
                        <div key={prefixo}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{prefixo}</span>
                            <span className="text-xs text-muted-foreground">— {prefixoLabels[prefixo]}</span>
                          </div>
                          <div className="grid gap-1.5">
                            {items.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-muted/50 transition-colors group"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="h-3 w-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: c.cor_hex }}
                                  />
                                  <span className={`text-sm ${!c.ativo ? "text-muted-foreground line-through" : ""}`}>
                                    {c.nome}
                                  </span>
                                  {c.e_receita && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Entrada</Badge>
                                  )}
                                  {!c.ativo && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Inativo</Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => { e.stopPropagation(); setEditingCategory(c); setCategoryFormOpen(true); }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => { setEditingCategory(null); setCategoryFormOpen(true); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova Categoria
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* ── Contas Bancárias ── */}
          <Collapsible open={openSections["contas"]} onOpenChange={() => toggleSection("contas")}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Landmark className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium">Contas Bancárias</CardTitle>
                        <CardDescription className="text-xs">
                          {activeAccounts} ativa{activeAccounts !== 1 ? "s" : ""} de {accounts.length} conta{accounts.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections["contas"] ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-4">
                  {loadingAccounts ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                  ) : accounts.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada</p>
                      <p className="text-xs text-muted-foreground mt-1">Cadastre a primeira conta para registrar lançamentos.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {accounts.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${a.ativo ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{a.banco}</span>
                                {a.descricao && (
                                  <span className="text-xs text-muted-foreground truncate">({a.descricao})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {a.agencia && <span>Ag. {a.agencia}</span>}
                                <span>Cc. {a.conta}</span>
                                <span>Saldo: {formatBRL(a.saldo_inicial)}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={() => { setEditingAccount(a); setAccountFormOpen(true); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => { setEditingAccount(null); setAccountFormOpen(true); }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova Conta
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* ── Notificações e Alertas ── */}
          <Collapsible open={openSections["notificacoes"]} onOpenChange={() => toggleSection("notificacoes")}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Bell className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium">Notificações e Alertas</CardTitle>
                        <CardDescription className="text-xs">
                          Anomalias automáticas, vencimentos e alertas
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections["notificacoes"] ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 px-3 rounded-md border">
                      <div>
                        <p className="text-sm font-medium">Detecção de Anomalias</p>
                        <p className="text-xs text-muted-foreground">Execução automática diária às 06h</p>
                      </div>
                      <Badge variant="default" className="text-xs">Ativo</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-md border">
                      <div>
                        <p className="text-sm font-medium">Alerta de Parcelas Vencidas</p>
                        <p className="text-xs text-muted-foreground">Recebíveis com vencimento ultrapassado</p>
                      </div>
                      <Badge variant="default" className="text-xs">Ativo</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-md border">
                      <div>
                        <p className="text-sm font-medium">Alerta de Orçamento Estourado</p>
                        <p className="text-xs text-muted-foreground">Quando IEC ultrapassa 1.0 (custo &gt; orçamento)</p>
                      </div>
                      <Badge variant="default" className="text-xs">Ativo</Badge>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* ── Permissões ── */}
          <Collapsible open={openSections["permissoes"]} onOpenChange={() => toggleSection("permissoes")}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium">Permissões e Acesso</CardTitle>
                        <CardDescription className="text-xs">
                          Controle de acesso por perfil de usuário
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections["permissoes"] ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 px-3 rounded-md border">
                      <div>
                        <p className="text-sm font-medium">Administrador</p>
                        <p className="text-xs text-muted-foreground">Acesso total: lançamentos, rateio, conciliação, configurações</p>
                      </div>
                      <Badge variant="default" className="text-xs">Full</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-md border">
                      <div>
                        <p className="text-sm font-medium">Gestor</p>
                        <p className="text-xs text-muted-foreground">Visualização de indicadores e relatórios das suas obras</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">Leitura</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-md border">
                      <div>
                        <p className="text-sm font-medium">Cliente (Portal)</p>
                        <p className="text-xs text-muted-foreground">Acesso restrito ao portal da obra vinculada</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Restrito</Badge>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
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
