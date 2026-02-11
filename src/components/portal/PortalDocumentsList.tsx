import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Image, File, Download, FolderOpen } from "lucide-react";
import { getSignedUrl } from "@/hooks/use-signed-url";
import { toast } from "sonner";

interface PortalDocumentsListProps {
  projectId: string;
}

function getFileIcon(fileType: string | null) {
  const type = fileType?.toLowerCase() || "";
  if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  if (type.includes("jpg") || type.includes("jpeg") || type.includes("png") || type.includes("webp") || type.includes("image"))
    return <Image className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export function PortalDocumentsList({ projectId }: PortalDocumentsListProps) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ["portal-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const url = await getSignedUrl("project_documents", filePath);
      if (!url) {
        toast.error("Erro ao gerar link de download");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch {
      toast.error("Erro ao baixar documento");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground animate-pulse">
        Carregando documentos...
      </div>
    );
  }

  if (!documents?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>Nenhum documento compartilhado para esta obra ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.id} className="border-slate-200 animate-fade-in">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="shrink-0">
              {getFileIcon(doc.file_type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-slate-800 truncate">{doc.file_name}</h4>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span>{new Date(doc.created_at).toLocaleDateString("pt-BR")}</span>
              {doc.file_type && (
                <span className="uppercase font-medium">{doc.file_type}</span>
              )}
            </div>
            {(doc as any).description && (
              <p className="text-sm text-muted-foreground mt-1">{(doc as any).description}</p>
            )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(doc.file_path, doc.file_name)}
              aria-label={`Baixar ${doc.file_name}`}
            >
              <Download className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Baixar</span>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
