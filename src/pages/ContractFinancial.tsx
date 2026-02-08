import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancialList } from "@/components/contracts/FinancialList";
import { ArrowLeft, DollarSign, Banknote, Receipt, PiggyBank } from "lucide-react";

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

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
                Entrada
              </CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(contract.payment_entry_value)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Parcelas
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {contract.payment_installments_count || 0}x{" "}
                {formatCurrency(contract.payment_installment_value)}
              </p>
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
                {formatCurrency(contract.commission_received_value)}
              </p>
              <p className="text-sm text-muted-foreground">
                de {formatCurrency(contract.commission_expected_value)} previsto
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Financial List */}
        <Card>
          <CardHeader>
            <CardTitle>Lançamentos Financeiros</CardTitle>
          </CardHeader>
          <CardContent>
            <FinancialList
              contractId={id!}
              onCommissionUpdate={() =>
                queryClient.invalidateQueries({ queryKey: ["contract", id] })
              }
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
