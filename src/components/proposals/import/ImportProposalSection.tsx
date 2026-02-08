import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileUp, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImportPreviewDialog } from "./ImportPreviewDialog";
import { ParsedProposalData } from "./types";

interface ImportProposalSectionProps {
  clientId: string;
  onApplyImport: (data: ParsedProposalData) => void;
}

type ImportStatus = "idle" | "uploading" | "processing" | "done" | "error";

export const ImportProposalSection = ({
  clientId,
  onApplyImport,
}: ImportProposalSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedProposalData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Por favor, envie um arquivo PDF");
      return;
    }

    // Validate file size (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 15MB");
      return;
    }

    setStatus("uploading");
    setProgress(10);
    setErrorMessage(null);
    setParsedData(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Generate file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${user.id}/${timestamp}-${sanitizedName}`;

      setProgress(20);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("proposal_uploads")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error("Erro ao fazer upload do arquivo");
      }

      setProgress(40);

      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from("proposal_imports")
        .insert({
          client_id: clientId || null,
          file_path: filePath,
          status: "queued",
        })
        .select()
        .single();

      if (importError || !importRecord) {
        throw new Error("Erro ao criar registro de importação");
      }

      setProgress(50);
      setStatus("processing");

      // Call edge function to process
      const { data: result, error: processError } = await supabase.functions.invoke(
        "parse-proposal-pdf",
        {
          body: { importId: importRecord.id },
        }
      );

      if (processError) {
        throw new Error(processError.message || "Erro ao processar PDF");
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      setProgress(100);
      setStatus("done");
      setParsedData(result.data);
      setShowPreview(true);
      toast.success("PDF processado com sucesso!");

    } catch (error) {
      console.error("Import error:", error);
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido");
      toast.error(error instanceof Error ? error.message : "Erro ao importar PDF");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleApply = (data: ParsedProposalData) => {
    onApplyImport(data);
    setShowPreview(false);
    setStatus("idle");
    setParsedData(null);
    toast.success("Dados importados! Revise e salve a proposta.");
  };

  const handleReset = () => {
    setStatus("idle");
    setProgress(0);
    setErrorMessage(null);
    setParsedData(null);
  };

  const getStatusIcon = () => {
    switch (status) {
      case "uploading":
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "done":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <FileUp className="h-5 w-5" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "uploading":
        return "Enviando arquivo...";
      case "processing":
        return "Processando com IA...";
      case "done":
        return "Processamento concluído!";
      case "error":
        return errorMessage || "Erro no processamento";
      default:
        return "Importe uma proposta existente em PDF";
    }
  };

  return (
    <>
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Importar Proposta (PDF) com IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <p className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                {getStatusText()}
              </p>
            </div>

            {(status === "uploading" || status === "processing") && (
              <Progress value={progress} className="h-2" />
            )}

            <div className="flex gap-2">
              {status === "idle" && (
                <Button onClick={handleFileSelect} variant="outline" className="gap-2">
                  <FileUp className="h-4 w-4" />
                  Enviar PDF
                </Button>
              )}

              {status === "done" && parsedData && (
                <>
                  <Button onClick={() => setShowPreview(true)} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Ver Pré-visualização
                  </Button>
                  <Button onClick={handleReset} variant="outline">
                    Importar outro
                  </Button>
                </>
              )}

              {status === "error" && (
                <Button onClick={handleReset} variant="outline">
                  Tentar novamente
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {parsedData && (
        <ImportPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          data={parsedData}
          onApply={handleApply}
        />
      )}
    </>
  );
};
