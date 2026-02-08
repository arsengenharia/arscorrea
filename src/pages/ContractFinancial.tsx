import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, DollarSign, Banknote, Receipt, PiggyBank } from "lucide-react";
import { PaymentSummary } from "@/components/contracts/PaymentSummary";
import { PaymentLine } from "@/lib/paymentTypes";
import { FinancialList } from "@/components/contracts/FinancialList";

export default function ContractFinancial() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          clients (name, document)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: paymentLines = [] } = useQuery({
    queryKey: ["contract-payments", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("contract_payments")
        .select("*")
        .eq("contract_id", id)
        .order("order_index");

      if (error) throw error;
      
      return (data || []).map(p => ({
        id: p.id,
        kind: p.kind,
        description: p.description || "",
        expected_value: p.expected_value || 0,
        expected_date: p.expected_date,
        received_value: p.received_value || 0,
        received_date: p.received_date,
        status: p.status || "pendente",
        order_index: p.order_index || 0,
        notes: p.notes || "",
      })) as PaymentLine[];
    },
    enabled: !!id,
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate totals from payment lines
  const paymentOnlyLines = paymentLines.filter((l) => l.kind !== "comissao");
  const totalExpected = paymentOnlyLines.reduce((sum, l) => sum + (l.expected_value || 0), 0);
  const totalReceived = paymentOnlyLines.reduce((sum, l) => sum + (l.received_value || 0), 0);

  const commissionLines = paymentLines.filter((l) => l.kind === "comissao");
  const commissionExpected = commissionLines.reduce((sum, l) => sum + (l.expected_value || 0), 0);
  const commissionReceived = commissionLines.reduce((sum, l) => sum + (l.received_value || 0), 0);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!contract) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground mb-4">Contrato não encontrado</p>
          <Button onClick={() => navigate("/contratos")}>Voltar</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contratos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Financeiro do Contrato</h1>
            <p className="text-muted-foreground">
              {contract.contract_number} - {contract.clients?.name}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total do Contrato
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(contract.total)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Previsto
              </CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(totalExpected)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Recebido
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalReceived)}
              </p>
              {totalExpected - totalReceived > 0 && (
                <p className="text-sm text-muted-foreground">
                  A receber: {formatCurrency(totalExpected - totalReceived)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comissão
              </CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(commissionReceived)}
              </p>
              <p className="text-sm text-muted-foreground">
                de {formatCurrency(commissionExpected)} previsto
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary with alerts */}
        {paymentLines.length > 0 && (
          <PaymentSummary 
            contractTotal={contract.total || 0} 
            paymentLines={paymentLines} 
          />
        )}

        {/* Financial List */}
        <Card>
          <CardHeader>
            <CardTitle>Lançamentos Financeiros</CardTitle>
          </CardHeader>
          <CardContent>
            <FinancialList
              contractId={id!}
              onCommissionUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["contract", id] });
                queryClient.invalidateQueries({ queryKey: ["contract-payments", id] });
              }}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
