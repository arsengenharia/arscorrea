import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, FileText, Send, Loader2 } from "lucide-react";
import { ProposalStatusBadge } from "./ProposalStatusBadge";
import { ProposalClientSection } from "./ProposalClientSection";
import { ProposalWorkSection } from "./ProposalWorkSection";
import { ProposalScopeSection } from "./ProposalScopeSection";
import { ProposalItemsSection, ProposalItem } from "./ProposalItemsSection";
import { ProposalTotalsSection } from "./ProposalTotalsSection";
import { ProposalTermsSection } from "./ProposalTermsSection";
import { pdf } from "@react-pdf/renderer";
import { ProposalPDF } from "./pdf/ProposalPDF";

const DEFAULT_SCOPE = `SERVIÇOS DE REFORMA DE FACHADA

1. SERVIÇOS PRELIMINARES
- Mobilização e instalação de canteiro de obras
- Isolamento e sinalização da área de trabalho

2. ACESSO E SEGURANÇA
- Instalação de sistema de acesso (balancim/andaime)
- Equipamentos de proteção coletiva

3. TRATAMENTO DE PATOLOGIAS
- Mapeamento e identificação de anomalias
- Tratamento de fissuras e trincas
- Recuperação de áreas deterioradas

4. RECUPERAÇÃO DE CONCRETO
- Remoção de concreto desagregado
- Tratamento de armaduras expostas
- Aplicação de argamassa estrutural

5. SELANTES E JUNTAS
- Tratamento de juntas de dilatação
- Aplicação de selantes

6. PINTURA E REVITALIZAÇÃO
- Preparação de superfície
- Aplicação de textura/pintura

7. LIMPEZA E PROTEÇÃO
- Limpeza final
- Aplicação de hidrofugante (se aplicável)`;

interface ProposalFormContentProps {
  proposalId?: string;
  isEditing: boolean;
}

export type ProposalFormData = {
  clientId: string;
  title: string;
  condoName: string;
  workAddress: string;
  city: string;
  state: string;
  scopeText: string;
  validityDays: number;
  executionDays: number;
  paymentTerms: string;
  warrantyTerms: string;
  exclusions: string;
  notes: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  status: string;
};

export const ProposalFormContent = ({
  proposalId,
  isEditing,
}: ProposalFormContentProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ProposalFormData>({
    clientId: "",
    title: "",
    condoName: "",
    workAddress: "",
    city: "",
    state: "",
    scopeText: DEFAULT_SCOPE,
    validityDays: 10,
    executionDays: 60,
    paymentTerms: "",
    warrantyTerms: "",
    exclusions: "",
    notes: "",
    discountType: "fixed",
    discountValue: 0,
    status: "draft",
  });

  const [items, setItems] = useState<ProposalItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch existing proposal for editing
  const { data: existingProposal, isLoading: isLoadingProposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: async () => {
      if (!proposalId) return null;
      const { data, error } = await supabase
        .from("proposals")
        .select(`*, client:clients(*), proposal_items(*)`)
        .eq("id", proposalId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!proposalId,
  });

  // Fetch selected client data
  const { 
    data: selectedClient, 
    isLoading: isLoadingClient,
    refetch: refetchClient 
  } = useQuery({
    queryKey: ["client", formData.clientId],
    queryFn: async () => {
      if (!formData.clientId) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", formData.clientId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!formData.clientId,
  });

  const handleClientUpdated = useCallback(() => {
    refetchClient();
    queryClient.invalidateQueries({ queryKey: ["clients-list"] });
  }, [refetchClient, queryClient]);

  // Populate form when editing
  useEffect(() => {
    if (existingProposal) {
      setFormData({
        clientId: existingProposal.client_id || "",
        title: existingProposal.title || "",
        condoName: existingProposal.condo_name || "",
        workAddress: existingProposal.work_address || "",
        city: existingProposal.city || "",
        state: existingProposal.state || "",
        scopeText: existingProposal.scope_text || DEFAULT_SCOPE,
        validityDays: existingProposal.validity_days || 10,
        executionDays: existingProposal.execution_days || 60,
        paymentTerms: existingProposal.payment_terms || "",
        warrantyTerms: existingProposal.warranty_terms || "",
        exclusions: existingProposal.exclusions || "",
        notes: existingProposal.notes || "",
        discountType: (existingProposal.discount_type as "percent" | "fixed") || "fixed",
        discountValue: existingProposal.discount_value || 0,
        status: existingProposal.status || "draft",
      });

      if (existingProposal.proposal_items) {
        const sortedItems = [...existingProposal.proposal_items].sort(
          (a, b) => (a.order_index || 0) - (b.order_index || 0)
        );
        setItems(
          sortedItems.map((item) => ({
            id: item.id,
            category: item.category || "",
            description: item.description || "",
            unit: item.unit || "un",
            quantity: item.quantity || 0,
            unitPrice: item.unit_price || 0,
            total: item.total || 0,
            notes: item.notes || "",
          }))
        );
      }
    }
  }, [existingProposal]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discount =
    formData.discountType === "percent"
      ? subtotal * (formData.discountValue / 100)
      : formData.discountValue;
  const total = Math.max(0, subtotal - discount);

  const updateFormData = useCallback(
    (field: keyof ProposalFormData, value: string | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const saveProposal = async (newStatus?: string) => {
    if (!formData.clientId) {
      toast.error("Selecione um cliente para criar a proposta");
      return null;
    }

    setIsSaving(true);

    try {
      const proposalData = {
        client_id: formData.clientId,
        title: formData.title,
        condo_name: formData.condoName,
        work_address: formData.workAddress,
        city: formData.city,
        state: formData.state,
        scope_text: formData.scopeText,
        validity_days: formData.validityDays,
        execution_days: formData.executionDays,
        payment_terms: formData.paymentTerms,
        warranty_terms: formData.warrantyTerms,
        exclusions: formData.exclusions,
        notes: formData.notes,
        discount_type: formData.discountType,
        discount_value: formData.discountValue,
        subtotal,
        total,
        status: newStatus || formData.status,
      };

      let savedProposalId = proposalId;

      if (isEditing && proposalId) {
        const { error } = await supabase
          .from("proposals")
          .update(proposalData)
          .eq("id", proposalId);

        if (error) throw error;

        // Delete existing items and re-insert
        await supabase.from("proposal_items").delete().eq("proposal_id", proposalId);
      } else {
        const { data, error } = await supabase
          .from("proposals")
          .insert(proposalData)
          .select("id")
          .single();

        if (error) throw error;
        savedProposalId = data.id;
      }

      // Insert items
      if (items.length > 0 && savedProposalId) {
        const itemsToInsert = items.map((item, index) => ({
          proposal_id: savedProposalId,
          category: item.category,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
          order_index: index,
          notes: item.notes,
        }));

        const { error: itemsError } = await supabase
          .from("proposal_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposal", savedProposalId] });

      toast.success(isEditing ? "Proposta atualizada!" : "Proposta criada!");

      if (!isEditing && savedProposalId) {
        navigate(`/propostas/${savedProposalId}`);
      }

      return savedProposalId;
    } catch (error) {
      console.error("Error saving proposal:", error);
      toast.error("Erro ao salvar proposta");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = async () => {
    const savedId = await saveProposal();
    if (!savedId) return;

    setIsGeneratingPDF(true);

    try {
      // Fetch fresh proposal data
      const { data: proposal, error } = await supabase
        .from("proposals")
        .select(`*, client:clients(*), proposal_items(*)`)
        .eq("id", savedId)
        .single();

      if (error || !proposal) throw error;

      // Generate PDF blob
      const pdfBlob = await pdf(
        <ProposalPDF proposal={proposal} items={proposal.proposal_items || []} />
      ).toBlob();

      // Upload to storage
      const pdfPath = `${savedId}/proposta.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("proposals")
        .upload(pdfPath, pdfBlob, { upsert: true });

      if (uploadError) throw uploadError;

      // Update proposal with pdf_path
      await supabase
        .from("proposals")
        .update({ pdf_path: pdfPath })
        .eq("id", savedId);

      // Get signed URL and open
      const { data: signedUrlData } = await supabase.storage
        .from("proposals")
        .createSignedUrl(pdfPath, 60);

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, "_blank");
      }

      queryClient.invalidateQueries({ queryKey: ["proposal", savedId] });
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const markAsSent = async () => {
    await saveProposal("sent");
  };

  if (isLoadingProposal) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/propostas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {isEditing ? "Editar Proposta" : "Nova Proposta"}
              </h1>
              <ProposalStatusBadge status={formData.status} />
            </div>
            {isEditing && existingProposal?.number && (
              <p className="text-muted-foreground">{existingProposal.number}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => saveProposal()}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Rascunho
          </Button>
          <Button
            variant="outline"
            onClick={generatePDF}
            disabled={isGeneratingPDF || isSaving}
            className="gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Gerar PDF
          </Button>
          {formData.status === "draft" && (
            <Button onClick={markAsSent} disabled={isSaving} className="gap-2">
              <Send className="h-4 w-4" />
              Marcar como Enviada
            </Button>
          )}
        </div>
      </div>

      {/* Client Section */}
      <ProposalClientSection
        clientId={formData.clientId}
        onClientChange={(id) => updateFormData("clientId", id)}
      />

      {/* Work Section */}
      <ProposalWorkSection
        condoName={formData.condoName}
        workAddress={formData.workAddress}
        city={formData.city}
        state={formData.state}
        selectedClient={formData.clientId ? selectedClient : undefined}
        isLoadingClient={isLoadingClient && !!formData.clientId}
        onCondoNameChange={(v) => updateFormData("condoName", v)}
        onWorkAddressChange={(v) => updateFormData("workAddress", v)}
        onCityChange={(v) => updateFormData("city", v)}
        onStateChange={(v) => updateFormData("state", v)}
        onClientUpdated={handleClientUpdated}
      />

      {/* Title */}
      <Card>
        <CardHeader>
          <CardTitle>Título da Proposta</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => updateFormData("title", e.target.value)}
            placeholder="Ex: Proposta Reforma de Fachada – Condomínio X"
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </CardContent>
      </Card>

      {/* Scope Section */}
      <ProposalScopeSection
        scopeText={formData.scopeText}
        onScopeChange={(v) => updateFormData("scopeText", v)}
      />

      {/* Items Section */}
      <ProposalItemsSection items={items} onItemsChange={setItems} />

      {/* Totals Section */}
      <ProposalTotalsSection
        subtotal={subtotal}
        discountType={formData.discountType}
        discountValue={formData.discountValue}
        total={total}
        onDiscountTypeChange={(v) => updateFormData("discountType", v)}
        onDiscountValueChange={(v) => updateFormData("discountValue", v)}
      />

      {/* Terms Section */}
      <ProposalTermsSection
        validityDays={formData.validityDays}
        executionDays={formData.executionDays}
        paymentTerms={formData.paymentTerms}
        warrantyTerms={formData.warrantyTerms}
        exclusions={formData.exclusions}
        notes={formData.notes}
        onValidityDaysChange={(v) => updateFormData("validityDays", v)}
        onExecutionDaysChange={(v) => updateFormData("executionDays", v)}
        onPaymentTermsChange={(v) => updateFormData("paymentTerms", v)}
        onWarrantyTermsChange={(v) => updateFormData("warrantyTerms", v)}
        onExclusionsChange={(v) => updateFormData("exclusions", v)}
        onNotesChange={(v) => updateFormData("notes", v)}
      />
    </div>
  );
};
