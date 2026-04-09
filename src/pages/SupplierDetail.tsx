import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, DollarSign, FileText, Receipt, MessageCircle } from "lucide-react";
import { AnalyzeButton } from "@/components/ai/AnalyzeButton";
import { formatBRL, formatDate } from "@/lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Supplier {
  id: string;
  trade_name: string;
  legal_name: string | null;
  document: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tipo: string | null;
  ativo: boolean | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  pix_key: string | null;
}

interface Entry {
  id: string;
  data: string | null;
  valor: number | null;
  tipo_documento: string | null;
  project: { name: string } | null;
  category: { nome: string; prefixo: string; cor_hex: string } | null;
}

interface NfeItem {
  id: string;
  numero_nota: string | null;
  valor_total: number | null;
  data_emissao: string | null;
  status: string | null;
  created_at: string;
}

export default function SupplierDetail() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();

  const { data: supplier, isLoading: loadingSupplier } = useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", supplierId as string)
        .single();
      if (error) throw error;
      return data as unknown as Supplier;
    },
    enabled: !!supplierId,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["supplier-entries", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_financial_entries" as any)
        .select("*, project:projects(name), category:financial_categories(nome, prefixo, cor_hex)")
        .eq("supplier_id", supplierId as string)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as unknown as Entry[];
    },
    enabled: !!supplierId,
  });

  const { data: nfeList = [] } = useQuery({
    queryKey: ["supplier-nfe", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nfe_inbox" as any)
        .select("id, numero_nota, valor_total, data_emissao, status, created_at")
        .eq("supplier_id", supplierId as string)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as NfeItem[];
    },
    enabled: !!supplierId,
  });

  // KPIs
  const totalPago = entries.reduce((sum, e) => sum + Math.abs(e.valor ?? 0), 0);
  const totalEntries = entries.length;
  const totalNfe = nfeList.length;

  // Summary by project
  const projectMap = new Map<string, { name: string; total: number; count: number; lastDate: string }>();
  for (const e of entries) {
    const name = e.project?.name ?? "Sem obra";
    const existing = projectMap.get(name);
    const val = Math.abs(e.valor ?? 0);
    const date = e.data ?? "";
    if (existing) {
      existing.total += val;
      existing.count += 1;
      if (date > existing.lastDate) existing.lastDate = date;
    } else {
      projectMap.set(name, { name, total: val, count: 1, lastDate: date });
    }
  }
  const projectSummary = Array.from(projectMap.values()).sort((a, b) => b.total - a.total);

  // Monthly chart data
  const monthMap = new Map<string, number>();
  for (const e of entries) {
    if (!e.data) continue;
    const [y, m] = e.data.split("-");
    const key = `${y}-${m}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + Math.abs(e.valor ?? 0));
  }
  const monthlyData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      const [y, m] = key.split("-");
      return { mes: `${m}/${y}`, total };
    });

  if (loadingSupplier) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      </Layout>
    );
  }

  if (!supplier) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Fornecedor não encontrado.</div>
      </Layout>
    );
  }

  const address = [
    supplier.rua && supplier.numero ? `${supplier.rua}, ${supplier.numero}` : supplier.rua,
    supplier.complemento,
    supplier.bairro,
    supplier.cidade && supplier.uf ? `${supplier.cidade} - ${supplier.uf}` : supplier.cidade,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Layout>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/fornecedores")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{supplier.trade_name}</h1>
              <Badge variant="secondary">{supplier.tipo || "Não definido"}</Badge>
              <Badge variant={supplier.ativo ? "default" : "outline"}>
                {supplier.ativo ? "Ativo" : "Inativo"}
              </Badge>
              <AnalyzeButton
                prompt="Analise o histórico deste fornecedor: total pago, obras atendidas, evolução de preços, e recomendações."
                label="Analisar Fornecedor"
              />
            </div>
            {supplier.legal_name && (
              <p className="text-muted-foreground mt-1">{supplier.legal_name}</p>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados Cadastrais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Razão Social</span>
                <span className="font-medium">{supplier.legal_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CNPJ</span>
                <span className="font-medium">{supplier.document || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contato</span>
                <span className="font-medium">{supplier.contact_name || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Telefone</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{supplier.phone || "—"}</span>
                  {supplier.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Conversar no WhatsApp"
                      onClick={() => {
                        const numbers = supplier.phone!.replace(/\D/g, "");
                        const formatted = numbers.length <= 11 ? `55${numbers}` : numbers;
                        window.open(`https://wa.me/${formatted}`, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{supplier.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chave Pix</span>
                <span className="font-medium">{supplier.pix_key || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CEP</span>
                <span className="font-medium">{supplier.cep || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rua / Nº</span>
                <span className="font-medium text-right">
                  {supplier.rua
                    ? `${supplier.rua}${supplier.numero ? ", " + supplier.numero : ""}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Complemento</span>
                <span className="font-medium">{supplier.complemento || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bairro</span>
                <span className="font-medium">{supplier.bairro || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cidade / UF</span>
                <span className="font-medium">
                  {supplier.cidade
                    ? `${supplier.cidade}${supplier.uf ? " - " + supplier.uf : ""}`
                    : "—"}
                </span>
              </div>
              {!supplier.cep && !supplier.rua && supplier.address && (
                <div className="pt-1 text-muted-foreground">{supplier.address}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatBRL(totalPago)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Lançamentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalEntries}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">NF-e Recebidas</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalNfe}</p>
            </CardContent>
          </Card>
        </div>

        {/* Summary by Project */}
        {projectSummary.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Total por Obra</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obra</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead>Último Lançamento</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectSummary.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{formatBRL(p.total)}</TableCell>
                      <TableCell>{formatDate(p.lastDate)}</TableCell>
                      <TableCell className="text-right">{p.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Monthly Chart */}
        {monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pagamentos por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(v) => formatBRL(v).replace("R$\u00a0", "R$ ")}
                    tick={{ fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip formatter={(v: number) => [formatBRL(v), "Total"]} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Entries Table */}
        {entries.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Últimos Lançamentos</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Tipo Doc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{formatDate(e.data)}</TableCell>
                      <TableCell>{e.project?.name ?? "—"}</TableCell>
                      <TableCell>
                        {e.category ? (
                          <span className="flex items-center gap-1.5">
                            {e.category.cor_hex && (
                              <span
                                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: e.category.cor_hex }}
                              />
                            )}
                            {e.category.prefixo} {e.category.nome}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {e.valor != null ? formatBRL(Math.abs(e.valor)) : "—"}
                      </TableCell>
                      <TableCell>{e.tipo_documento || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
