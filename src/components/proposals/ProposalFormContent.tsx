import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, FileText, Send, Loader2, Building2, FileSpreadsheet, Scale, Upload, Download, Trash2, Eye, File, Image, FolderOpen } from "lucide-react";
import { ProjectSelect } from "@/components/shared/ProjectSelect";
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
import { useAuth } from "@/components/auth/AuthProvider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getSignedUrl } from "@/hooks/use-signed-url";

const DEFAULT_SCOPE = "";

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
  projectId: string;
  lossReason: string;
  expectedCloseDate: string;
};

function getFileIcon(fileType: string | null) {
  const type = fileType?.toLowerCase() || "";
  if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  if (type.includes("jpg") || type.includes("jpeg") || type.includes("png") || type.includes("webp") || type.includes("image"))
    return <Image className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export const ProposalFormContent = ({ proposalId, isEditing }: ProposalFormContentProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
    projectId: "",
    lossReason: "",
    expectedCloseDate: "",
  });

  const [items, setItems] = useState<ProposalItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [attachFile, setAttachFile] = useState<globalThis.File | null>(null);
  const [attachName, setAttachName] = useState("");

  // Fetch attached documents
  const { data: attachedDocs } = useQuery({
    queryKey: ["proposal-documents", proposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_documents")
        .select("*")
        .eq("proposal_id", proposalId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!proposalId,
  });

  const uploadAttachment = useMutation({
    mutationFn: async (file: globalThis.File) => {
      if (!proposalId) throw new Error("Salve a proposta antes de anexar arquivos.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const filePath = `${proposalId}/${crypto.randomUUID()}.${ext}`;
      const { error: storageError } = await supabase.storage.from("proposal_documents").upload(filePath, file);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from("proposal_documents").insert({
        proposal_id: proposalId,
        file_name: attachName.trim() || file.name,
        file_path: filePath,
        file_type: ext,
        uploaded_by: user?.id || null,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("Arquivo anexado!");
      setAttachFile(null);
      setAttachName("");
      queryClient.invalidateQueries({ queryKey: ["proposal-documents", proposalId] });
    },
    onError: (err: any) => toast.error("Erro ao anexar: " + err.message),
  });

  const deleteAttachment = useMutation({
    mutationFn: async ({ docId, filePath }: { docId: string; filePath: string }) => {
      await supabase.storage.from("proposal_documents").remove([filePath]);
      const { error } = await supabase.from("proposal_documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arquivo removido!");
      queryClient.invalidateQueries({ queryKey: ["proposal-documents", proposalId] });
    },
    onError: (err: any) => toast.error("Erro ao remover: " + err.message),
  });

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    const url = await getSignedUrl("proposal_documents", filePath);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      a.click();
    } else {
      toast.error("Erro ao gerar link de download");
    }
  };

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
        projectId: (existingProposal as any).project_id || "",
        lossReason: (existingProposal as any).loss_reason || "",
        expectedCloseDate: (existingProposal as any).expected_close_date || "",
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
      const proposalData: any = {
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
        project_id: formData.projectId || null,
        loss_reason: formData.lossReason || null,
        expected_close_date: formData.expectedCloseDate || null,
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const el = document.getElementById("proposal-attachments");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="hidden sm:flex border-slate-200 text-slate-600"
            >
              <FileText className="h-4 w-4 mr-2" />
              Anexos
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

        {/* Extra CRM fields */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Obra Vinculada</label>
            <ProjectSelect value={formData.projectId} onChange={(v) => updateFormData("projectId", v)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Data Prevista de Fechamento</label>
            <Input
              type="date"
              value={formData.expectedCloseDate}
              onChange={(e) => updateFormData("expectedCloseDate", e.target.value)}
            />
          </div>
          {formData.status === "perdida" && (
            <div className="space-y-2 lg:col-span-1">
              <label className="text-sm font-medium text-slate-700">Motivo de Perda</label>
              <Textarea
                value={formData.lossReason}
                onChange={(e) => updateFormData("lossReason", e.target.value)}
                placeholder="Descreva o motivo da perda..."
                className="min-h-[80px]"
              />
            </div>
          )}
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

        {/* 6. Documentos Anexados */}
        <section id="proposal-attachments" className="space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-medium pb-2 border-b border-slate-100">
            <FileText className="h-4 w-4 text-indigo-500" />
            <h3>Documentos Anexados</h3>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            {/* Upload area */}
            {proposalId ? (
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium text-slate-700">Nome do arquivo</label>
                  <Input
                    value={attachName}
                    onChange={(e) => setAttachName(e.target.value)}
                    placeholder="Nome do documento (opcional)"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium text-slate-700">Arquivo</label>
                  <Input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setAttachFile(f);
                      if (f && !attachName) setAttachName(f.name.replace(/\.[^.]+$/, ""));
                    }}
                  />
                </div>
                <Button
                  onClick={() => attachFile && uploadAttachment.mutate(attachFile)}
                  disabled={!attachFile || uploadAttachment.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                >
                  {uploadAttachment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Anexar
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Salve a proposta primeiro para anexar arquivos.</p>
            )}

            {/* File list */}
            {attachedDocs && attachedDocs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {attachedDocs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 py-3 group">
                    <div className="shrink-0">{getFileIcon(doc.file_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                        {doc.file_type && <span className="ml-2 uppercase">{doc.file_type}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-blue-600"
                        onClick={() => handleDownloadAttachment(doc.file_path, doc.file_name)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O documento "{doc.file_name}" será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteAttachment.mutate({ docId: doc.id, filePath: doc.file_path })}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : proposalId ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum documento anexado ainda.</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
};
