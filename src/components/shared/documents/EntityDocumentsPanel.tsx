import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Download,
  Eye,
  Trash2,
  Plus,
  Loader2,
  FolderOpen,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { getFileIcon } from "./document-helpers";
import {
  useEntityDocuments,
  EntityDocument,
} from "./useEntityDocuments";

interface EntityDocumentsPanelProps {
  entityType: "client" | "project" | "proposal";
  entityId: string;
  /** Optional copy override for the upload CTA description */
  uploadDescription?: string;
  /** Whether the panel is currently visible — used to skip the query when hidden */
  enabled?: boolean;
}

/**
 * Inline panel that lists, uploads and deletes documents for a given entity.
 * Used both standalone (inside tabs, e.g. ProjectDetails) and embedded in
 * `EntityDocumentsDialog` as a quick-access dialog from list screens.
 */
export function EntityDocumentsPanel({
  entityType,
  entityId,
  uploadDescription,
  enabled = true,
}: EntityDocumentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    documents,
    isLoading,
    upload,
    isUploading,
    remove,
    resolveUrl,
  } = useEntityDocuments({ entityType, entityId, enabled });

  const handleUpload = async () => {
    if (!docName.trim() || !selectedFile) {
      toast.error("Preencha o nome e selecione um arquivo.");
      return;
    }
    try {
      await upload({
        file: selectedFile,
        name: docName,
        description: docDescription,
      });
      setUploadOpen(false);
      setDocName("");
      setDocDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      /* error toast already surfaced by the hook */
    }
  };

  const handleView = async (doc: EntityDocument) => {
    try {
      const url = await resolveUrl(doc);
      if (!url) {
        toast.error("Erro ao gerar link");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Erro ao abrir documento");
    }
  };

  const handleDownload = async (doc: EntityDocument) => {
    try {
      const url = await resolveUrl(doc);
      if (!url) {
        toast.error("Erro ao gerar link de download");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch {
      toast.error("Erro ao baixar documento");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Documento</DialogTitle>
              {uploadDescription && (
                <DialogDescription>{uploadDescription}</DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Nome do Documento *
                </label>
                <Input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Ex: Planta Baixa - Térreo"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Observações
                </label>
                <Textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Notas ou descrição do documento..."
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Arquivo *
                </label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) =>
                    setSelectedFile(e.target.files?.[0] || null)
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setUploadOpen(false)}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading || !docName.trim() || !selectedFile}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1.5" />
                )}
                Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground animate-pulse">
          Carregando documentos...
        </div>
      ) : !documents.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum documento enviado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="border-slate-200">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800 truncate">
                    {doc.file_name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>
                      {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    {doc.file_type && (
                      <span className="uppercase font-medium">
                        {doc.file_type}
                      </span>
                    )}
                  </div>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {doc.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-blue-600"
                    onClick={() => handleView(doc)}
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-green-600"
                    onClick={() => handleDownload(doc)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-red-600"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O documento "{doc.file_name}" será removido
                          permanentemente. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => remove(doc)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
