import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Importando Input do UI kit para melhor estilo
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, FileText, Send, Loader2, Building2, FileSpreadsheet, Scale } from "lucide-react";
import { ProposalStatusBadge } from "./ProposalStatusBadge";
import { ProposalClientSection } from "./ProposalClientSection";
import { ProposalWorkSection } from "./ProposalWorkSection";
import { ProposalScopeSection } from "./ProposalScopeSection";
import { ProposalItemsSection, ProposalItem } from "./ProposalItemsSection";
import { ProposalTotalsSection } from "./ProposalTotalsSection";
import { ProposalTermsSection } from "./ProposalTermsSection";
import { pdf } from "@react-pdf/renderer";
import { ProposalPDF } from "./pdf/ProposalPDF";
import { ImportProposalSection, ParsedProposalData } from "./import";
import { normalizeCategory, normalizeUnit } from "@/lib/itemOptions";

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

export const ProposalFormContent = ({ proposalId, isEditing }: ProposalFormContentProps) => {
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
    refetch: refetchClient,
  } = useQuery({
    queryKey: ["client", formData.clientId],
    queryFn: async () => {
      if (!formData.clientId) return null;
      const { data, error } = await supabase.from("clients").select("*").eq("id", formData.clientId).single();

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
          (a, b) => (a.order_index || 0) - (b.order_index || 0),
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
          })),
        );
      }
    }
  }, [existingProposal]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discount =
    formData.discountType === "percent" ? subtotal * (formData.discountValue / 100) : formData.discountValue;
  const total = Math.max(0, subtotal - discount);

  const updateFormData = useCallback((field: keyof ProposalFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle import data from PDF
  const handleApplyImport = useCallback((data: ParsedProposalData) => {
    setFormData((prev) => ({
      ...prev,
      scopeText: data.scope_text || prev.scopeText,
      paymentTerms: data.payment_terms || prev.paymentTerms,
      warrantyTerms: data.warranty_terms || prev.warrantyTerms,
      exclusions: data.exclusions || prev.exclusions,
      notes: data.notes || prev.notes,
      discountType: data.totals?.discount_type || prev.discountType,
      discountValue: data.totals?.discount_value || prev.discountValue,
    }));

    if (data.items && data.items.length > 0) {
      const importedItems: ProposalItem[] = data.items.map((item) => ({
        id: crypto.randomUUID(),
        category: normalizeCategory(item.category),
        description: item.description || "",
        unit: normalizeUnit(item.unit),
        quantity: item.quantity || 0,
        unitPrice: item.unit_price || 0,
        total: item.total || (item.quantity || 0) * (item.unit_price || 0),
        notes: "",
      }));
      setItems(importedItems);
    }
  }, []);

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
        const { error } = await supabase.from("proposals").update(proposalData).eq("id", proposalId);

        if (error) throw error;

        await supabase.from("proposal_items").delete().eq("proposal_id", proposalId);
      } else {
        const { data, error } = await supabase.from("proposals").insert(proposalData).select("id").single();

        if (error) throw error;
        savedProposalId = data.id;
      }

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

        const { error: itemsError } = await supabase.from("proposal_items").insert(itemsToInsert);

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
      const { data: proposal, error } = await supabase
        .from("proposals")
        .select(`*, client:clients(*), proposal_items(*)`)
        .eq("id", savedId)
        .single();

      if (error || !proposal) throw error;

      const pdfBlob = await pdf(<ProposalPDF proposal={proposal} items={proposal.proposal_items || []} />).toBlob();

      const pdfPath = `${savedId}/proposta.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("proposals")
        .upload(pdfPath, pdfBlob, { upsert: true });

      if (uploadError) throw uploadError;

      await supabase.from("proposals").update({ pdf_path: pdfPath }).eq("id", savedId);

      const { data: signedUrlData } = await supabase.storage.from("proposals").createSignedUrl(pdfPath, 60);

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
      <div className="flex h-[80vh] justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* 1. Sticky Header with Glassmorphism */}
      <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/propostas")} className="rounded-full">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-slate-900">
                  {isEditing ? "Editar Proposta" : "Nova Proposta"}
                </h1>
                <ProposalStatusBadge status={formData.status} />
              </div>
              {isEditing && existingProposal?.number && (
                <span className="text-xs font-mono text-slate-500">{existingProposal.number}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveProposal()}
              disabled={isSaving}
              className="hidden sm:flex bg-white hover:bg-slate-50 border-slate-200"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2 text-slate-500" />
              )}
              Salvar
            </Button>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            <Button
              variant="default"
              size="sm"
              onClick={generatePDF}
              disabled={isGeneratingPDF || isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Gerar PDF
            </Button>

            {formData.status === "draft" && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAsSent}
                disabled={isSaving}
                className="hidden md:flex border-slate-200 text-slate-600"
              >
                <Send className="h-4 w-4 mr-2" />
                Marcar Enviada
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl mt-8 space-y-10">
        {/* 2. Main Title Input (Highlighted) */}
        <section className="space-y-2">
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => updateFormData("title", e.target.value)}
            placeholder="Título da Proposta (Ex: Reforma de Fachada - Condomínio X)"
            className="text-2xl font-bold border-none shadow-none bg-transparent px-0 h-auto placeholder:text-slate-300 focus-visible:ring-0"
          />
          <Separator className="bg-slate-200" />
        </section>

        {/* 3. Client & Work Info Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-100">
              <Building2 className="h-4 w-4 text-blue-500" />
              <h3>Dados do Cliente</h3>
            </div>
            <ProposalClientSection
              clientId={formData.clientId}
              onClientChange={(id) => updateFormData("clientId", id)}
            />
            {/* Import visible only here for context */}
            {!isEditing && formData.clientId && (
              <div className="pt-2">
                <ImportProposalSection clientId={formData.clientId} onApplyImport={handleApplyImport} />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-100">
              <Building2 className="h-4 w-4 text-orange-500" />
              <h3>Local e Obra</h3>
            </div>
            <ProposalWorkSection
              condoName={formData.condoName}
              workAddress={formData.workAddress}
              city={formData.city}
              state={formData.state}
              selectedClient={selectedClient}
              isLoadingClient={isLoadingClient && !!formData.clientId}
              onCondoNameChange={(v) => updateFormData("condoName", v)}
              onWorkAddressChange={(v) => updateFormData("workAddress", v)}
              onCityChange={(v) => updateFormData("city", v)}
              onStateChange={(v) => updateFormData("state", v)}
              onClientUpdated={handleClientUpdated}
            />
          </div>
        </section>

        {/* 4. Scope & Items Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-100">
            <FileSpreadsheet className="h-4 w-4 text-purple-500" />
            <h3>Escopo e Valores</h3>
          </div>

          <div className="grid gap-8">
            <ProposalScopeSection
              scopeText={formData.scopeText}
              onScopeChange={(v) => updateFormData("scopeText", v)}
            />

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <ProposalItemsSection items={items} onItemsChange={setItems} />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <ProposalTotalsSection
                subtotal={subtotal}
                discountType={formData.discountType}
                discountValue={formData.discountValue}
                total={total}
                onDiscountTypeChange={(v) => updateFormData("discountType", v)}
                onDiscountValueChange={(v) => updateFormData("discountValue", v)}
              />
            </div>
          </div>
        </section>

        {/* 5. Terms & Conditions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-100">
            <Scale className="h-4 w-4 text-green-500" />
            <h3>Termos e Condições</h3>
          </div>

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
        </section>
      </main>
    </div>
  );
};
