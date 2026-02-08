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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, FileText } from "lucide-react";

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
        .select(`
          *,
          clients (*)
        `)
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

      // Load items
      const { data: contractItems } = await supabase
        .from("contract_items")
        .select("*")
        .eq("contract_id", contractId)
        .order("order_index");

      if (contractItems) {
        setItems(contractItems.map(item => ({
          id: item.id,
          category: normalizeCategory(item.category),
          description: item.description || "",
          unit: normalizeUnit(item.unit),
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          total: item.total || 0,
          order_index: item.order_index || 0,
          notes: item.notes || "",
        })));
      }

      // Load payment lines from contract_payments
      const { data: payments } = await supabase
        .from("contract_payments")
        .select("*")
        .eq("contract_id", contractId)
        .order("order_index");

      if (payments && payments.length > 0) {
        setPaymentLines(payments.map(p => ({
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
        })));
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
      setItems(proposalItems.map(item => ({
        category: normalizeCategory(item.category),
        description: item.description || "",
        unit: normalizeUnit(item.unit),
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total: item.total || 0,
        order_index: item.order_index || 0,
        notes: item.notes || "",
      })));
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!proposalId || !client) {
        throw new Error("Selecione uma proposta");
      }

      // Calculate commission totals from payment lines
      const commissionLines = paymentLines.filter(l => l.kind === "comissao");
      const commissionExpectedValue = commissionLines.reduce((sum, l) => sum + (l.expected_value || 0), 0);
      const commissionReceivedValue = commissionLines.reduce((sum, l) => sum + (l.received_value || 0), 0);

      // Calculate payment totals for legacy fields
      const entryLine = paymentLines.find(l => l.kind === "entrada");
      const installmentLines = paymentLines.filter(l => l.kind === "parcela");

      const contractData = {
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
        const { error } = await supabase
          .from("contracts")
          .update(contractData)
          .eq("id", contractId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("contracts")
          .insert(contractData)
          .select()
          .single();
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
        />
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

  if (isEditing && isLoadingContract) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/contratos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Editar Contrato" : "Novo Contrato"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGeneratePDF}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Proposal Selection */}
        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selecionar Proposta</CardTitle>
            </CardHeader>
            <CardContent>
              <ContractProposalSelect
                value={proposalId}
                onChange={handleProposalSelect}
                disabled={isEditing}
              />
            </CardContent>
          </Card>
        )}

        {/* Client Section */}
        <ContractClientSection
          client={client}
          onClientUpdated={() => queryClient.invalidateQueries({ queryKey: ["contract", contractId] })}
        />

        {/* Contract Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conteúdo do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do contrato"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>Escopo</Label>
              <Textarea
                value={scopeText}
                onChange={(e) => setScopeText(e.target.value)}
                placeholder="Descreva o escopo do contrato..."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <ContractItemsSection items={items} onChange={setItems} />

        {/* Totals */}
        <ContractTotalsSection
          subtotal={subtotal}
          discountType={discountType}
          discountValue={discountValue}
          total={total}
          onDiscountTypeChange={setDiscountType}
          onDiscountValueChange={setDiscountValue}
        />

        {/* Payment Lines */}
        <ContractPaymentLinesSection
          contractTotal={total}
          paymentLines={paymentLines}
          onPaymentLinesChange={setPaymentLines}
          paymentNotes={paymentNotes}
          onPaymentNotesChange={setPaymentNotes}
        />
      </div>
    </Layout>
  );
}
