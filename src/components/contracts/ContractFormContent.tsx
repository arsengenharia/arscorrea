import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, FileText, Building2, FileSignature, ListTodo, Wallet, Loader2 } from "lucide-react";
import { ProjectSelect } from "@/components/shared/ProjectSelect";

import { ContractProposalSelect } from "@/components/contracts/ContractProposalSelect";
import { ContractClientSection } from "@/components/contracts/ContractClientSection";
import { ContractItemsSection, ContractItem } from "@/components/contracts/ContractItemsSection";
import { ContractTotalsSection } from "@/components/contracts/ContractTotalsSection";
import { ContractPaymentLinesSection } from "@/components/contracts/ContractPaymentLinesSection";
import { ContractPDF } from "@/components/contracts/pdf/ContractPDF";
import { PaymentLine } from "@/lib/paymentTypes";
import { normalizeCategory, normalizeUnit } from "@/lib/itemOptions";

interface ContractFormContentProps {
  contractId?: string;
}

interface Client {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  responsible?: string | null;
}

export function ContractFormContent({ contractId }: ContractFormContentProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!contractId;

  // Form state
  const [proposalId, setProposalId] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [title, setTitle] = useState("");
  const [scopeText, setScopeText] = useState("");
  const [items, setItems] = useState<ContractItem[]>([]);
  const [discountType, setDiscountType] = useState("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [status, setStatus] = useState("ativo");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [additiveValue, setAdditiveValue] = useState(0);

  // Calculated values
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === "percent" ? (subtotal * discountValue) / 100 : discountValue;
  const total = subtotal - discountAmount;

  // Load existing contract
  const { isLoading: isLoadingContract } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: async () => {
      if (!contractId) return null;

      const { data: contract, error } = await supabase
        .from("contracts")
        .select(
          `
          *,
          clients (*)
        `,
        )
        .eq("id", contractId)
        .maybeSingle();

      if (error) throw error;
      if (!contract) return null;

      // Set form state from contract
      setProposalId(contract.proposal_id);
      setClient(contract.clients as Client);
      setTitle(contract.title || "");
      setScopeText(contract.scope_text || "");
      setDiscountType(contract.discount_type || "fixed");
      setDiscountValue(contract.discount_value || 0);
      setStatus(contract.status || "ativo");
      setPaymentNotes(contract.payment_notes || "");
      setProjectId((contract as any).project_id || "");
      setDueDate((contract as any).due_date || "");
      setAdditiveValue((contract as any).additive_value || 0);

      // Load items
      const { data: contractItems } = await supabase
        .from("contract_items")
        .select("*")
        .eq("contract_id", contractId)
        .order("order_index");

      if (contractItems) {
        setItems(
          contractItems.map((item) => ({
            id: item.id,
            category: normalizeCategory(item.category),
            description: item.description || "",
            unit: normalizeUnit(item.unit),
            quantity: item.quantity || 0,
            unit_price: item.unit_price || 0,
            total: item.total || 0,
            order_index: item.order_index || 0,
            notes: item.notes || "",
          })),
        );
      }

      // Load payment lines from contract_payments
      const { data: payments } = await supabase
        .from("contract_payments")
        .select("*")
        .eq("contract_id", contractId)
        .order("order_index");

      if (payments && payments.length > 0) {
        setPaymentLines(
          payments.map((p) => ({
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
          })),
        );
      }

      return contract;
    },
    enabled: isEditing,
  });

  // Handle proposal selection
  const handleProposalSelect = async (selectedProposalId: string, proposal: any) => {
    setProposalId(selectedProposalId);
    setClient(proposal.clients);
    setTitle(proposal.title || "");
    setScopeText(proposal.scope_text || "");
    setDiscountType(proposal.discount_type || "fixed");
    setDiscountValue(proposal.discount_value || 0);
    setPaymentNotes(proposal.payment_terms || "");

    // Load proposal items with normalization
    const { data: proposalItems } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", selectedProposalId)
      .order("order_index");

    if (proposalItems) {
      setItems(
        proposalItems.map((item) => ({
          category: normalizeCategory(item.category),
          description: item.description || "",
          unit: normalizeUnit(item.unit),
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          total: item.total || 0,
          order_index: item.order_index || 0,
          notes: item.notes || "",
        })),
      );
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!proposalId || !client) {
        throw new Error("Selecione uma proposta");
      }

      // Calculate commission totals from payment lines
      const commissionLines = paymentLines.filter((l) => l.kind === "comissao");
      const commissionExpectedValue = commissionLines.reduce((sum, l) => sum + (l.expected_value || 0), 0);
      const commissionReceivedValue = commissionLines.reduce((sum, l) => sum + (l.received_value || 0), 0);

      // Calculate payment totals for legacy fields
      const entryLine = paymentLines.find((l) => l.kind === "entrada");
      const installmentLines = paymentLines.filter((l) => l.kind === "parcela");

      const contractData: any = {
        proposal_id: proposalId,
        client_id: client.id,
        title,
        scope_text: scopeText,
        subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        total,
        status,
        payment_notes: paymentNotes,
        project_id: projectId || null,
        due_date: dueDate || null,
        additive_value: additiveValue || 0,
        // Legacy fields - synced for compatibility
        payment_entry_value: entryLine?.expected_value || 0,
        payment_installments_count: installmentLines.length,
        payment_installment_value: installmentLines[0]?.expected_value || 0,
        commission_expected_value: commissionExpectedValue,
        commission_received_value: commissionReceivedValue,
        commission_expected_date: commissionLines[0]?.expected_date || null,
        commission_notes: commissionLines[0]?.notes || "",
      };

      let savedContractId = contractId;

      if (isEditing) {
        const { error } = await supabase.from("contracts").update(contractData).eq("id", contractId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("contracts").insert(contractData).select().single();
        if (error) throw error;
        savedContractId = data.id;
      }

      // Save items
      if (savedContractId) {
        await supabase.from("contract_items").delete().eq("contract_id", savedContractId);

        if (items.length > 0) {
          const itemsToInsert = items.map((item, index) => ({
            contract_id: savedContractId,
            category: item.category,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
            order_index: index,
            notes: item.notes,
          }));
          const { error: itemsError } = await supabase.from("contract_items").insert(itemsToInsert);
          if (itemsError) throw itemsError;
        }

        // Save payment lines
        await supabase.from("contract_payments").delete().eq("contract_id", savedContractId);

        if (paymentLines.length > 0) {
          const paymentsToInsert = paymentLines.map((line, index) => ({
            contract_id: savedContractId,
            kind: line.kind,
            description: line.description,
            expected_value: line.expected_value,
            expected_date: line.expected_date || null,
            received_value: line.received_value,
            received_date: line.received_date || null,
            status: line.status,
            order_index: index,
            notes: line.notes || null,
          }));
          const { error: paymentsError } = await supabase.from("contract_payments").insert(paymentsToInsert);
          if (paymentsError) throw paymentsError;
        }
      }

      return savedContractId;
    },
    onSuccess: (savedContractId) => {
      toast.success(isEditing ? "Contrato atualizado!" : "Contrato criado!");
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      if (!isEditing && savedContractId) {
        navigate(`/contratos/${savedContractId}`);
      }
    },
    onError: (error) => {
      console.error("Error saving contract:", error);
      toast.error("Erro ao salvar contrato");
    },
  });

  // Generate PDF
  const handleGeneratePDF = async () => {
    if (!client) {
      toast.error("Dados do cliente não encontrados");
      return;
    }

    try {
      const blob = await pdf(
        <ContractPDF
          contractNumber={contractId ? `CONT-${new Date().getFullYear()}-XXXX` : "NOVO"}
          title={title}
          client={client}
          scopeText={scopeText}
          items={items}
          subtotal={subtotal}
          discountType={discountType}
          discountValue={discountValue}
          total={total}
          paymentNotes={paymentNotes}
          createdAt={new Date().toISOString()}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contrato-${title || "novo"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ativo":
        return "text-green-600 bg-green-50 border-green-200";
      case "em_assinatura":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "encerrado":
        return "text-slate-600 bg-slate-50 border-slate-200";
      case "cancelado":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  if (isEditing && isLoadingContract) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Carregando contrato...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pb-20">
        {/* 1. Sticky Header with Glassmorphism */}
        <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 -mx-6 px-6 py-4 mb-8">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/contratos")}
                className="rounded-full hover:bg-slate-100"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {isEditing ? "Editar Contrato" : "Novo Contrato"}
                </h1>
                {isEditing && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">ID: {contractId?.slice(0, 8)}...</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleGeneratePDF} className="hidden sm:flex">
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto space-y-8">
          {/* 2. Proposal Selection (Visible only when needed) */}
          {!isEditing && (
            <Card className="border-blue-100 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FileSignature className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 w-full">
                    <Label className="text-blue-900 font-semibold mb-1.5 block">Vincular Proposta Aprovada</Label>
                    <ContractProposalSelect value={proposalId} onChange={handleProposalSelect} disabled={isEditing} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* 3. Left Column: Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title Input */}
              <div className="space-y-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do Contrato (Ex: Reforma Fachada Norte)"
                  className="text-3xl font-bold border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-slate-300 bg-transparent h-auto"
                />
                <Separator />
              </div>

              {/* Scope Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-100">
                  <ListTodo className="h-4 w-4 text-purple-500" />
                  <h3>Escopo do Serviço</h3>
                </div>
                <Textarea
                  value={scopeText}
                  onChange={(e) => setScopeText(e.target.value)}
                  placeholder="Descreva detalhadamente o escopo do contrato..."
                  className="min-h-[200px] resize-y bg-white border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                />
              </div>

              {/* Items Section */}
              <ContractItemsSection items={items} onChange={setItems} />

              {/* Payment Lines */}
              <ContractPaymentLinesSection
                contractTotal={total}
                paymentLines={paymentLines}
                onPaymentLinesChange={setPaymentLines}
                paymentNotes={paymentNotes}
                onPaymentNotesChange={setPaymentNotes}
              />
            </div>

            {/* 4. Right Column: Sidebar (Sticky) */}
            <div className="space-y-6 lg:sticky lg:top-24">
              {/* Status Card */}
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    Configuração
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Status do Contrato</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className={`border font-medium ${getStatusColor(status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="em_assinatura">Em Assinatura</SelectItem>
                        <SelectItem value="encerrado">Encerrado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="my-2" />

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Obra Vinculada</Label>
                    <ProjectSelect value={projectId} onChange={setProjectId} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Data de Vencimento</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Valor de Aditivos (R$)</Label>
                    <Input 
                      type="number" 
                      value={additiveValue || ""} 
                      onChange={(e) => setAdditiveValue(Number(e.target.value))} 
                      placeholder="0,00"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Client Info Card */}
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-sm font-semibold text-slate-700">Cliente</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ContractClientSection
                    client={client}
                    onClientUpdated={() => queryClient.invalidateQueries({ queryKey: ["contract", contractId] })}
                  />
                </CardContent>
              </Card>

              {/* Totals Card */}
              <Card className="shadow-md border-slate-200 bg-slate-900 text-white">
                <CardHeader className="pb-2 border-slate-800">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-green-400" />
                    <CardTitle className="text-sm font-medium text-slate-300">Valores</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Inverted theme for Totals Section to pop out */}
                  <div className="[&_label]:text-slate-400 [&_input]:bg-slate-800 [&_input]:border-slate-700 [&_input]:text-white">
                    <ContractTotalsSection
                      subtotal={subtotal}
                      discountType={discountType}
                      discountValue={discountValue}
                      total={total}
                      onDiscountTypeChange={setDiscountType}
                      onDiscountValueChange={setDiscountValue}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
