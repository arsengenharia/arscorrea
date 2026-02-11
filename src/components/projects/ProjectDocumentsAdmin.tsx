import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
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
  FileText,
  Image,
  File,
  Download,
  Eye,
  Trash2,
  Plus,
  Loader2,
  FolderOpen,
  Upload,
} from "lucide-react";
import { getSignedUrl } from "@/hooks/use-signed-url";
import { toast } from "sonner";

interface ProjectDocumentsAdminProps {
  projectId: string;
}

function getFileIcon(fileType: string | null) {
  const type = fileType?.toLowerCase() || "";
  if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  if (type.includes("jpg") || type.includes("jpeg") || type.includes("png") || type.includes("webp") || type.includes("image"))
    return <Image className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function ProjectDocumentsAdmin({ projectId }: ProjectDocumentsAdminProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["project-documents", projectId],
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

  const handleUpload = async () => {
    if (!docName.trim() || !selectedFile) {
      toast.error("Preencha o nome e selecione um arquivo.");
      return;
    }

    setUploading(true);
    try {
      const ext = getFileExtension(selectedFile.name);
      const filePath = `${projectId}/${crypto.randomUUID()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("project_documents")
        .upload(filePath, selectedFile);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("project_documents")
        .insert({
          project_id: projectId,
          file_name: docName.trim(),
          file_path: filePath,
          file_type: ext,
          uploaded_by: user?.id || null,
          description: docDescription.trim() || null,
        });

      if (dbError) throw dbError;

      toast.success("Documento enviado com sucesso!");
      setDialogOpen(false);
      setDocName("");
      setDocDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
    } catch (error: any) {
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (filePath: string) => {
    try {
      const url = await getSignedUrl("project_documents", filePath);
      if (!url) { toast.error("Erro ao gerar link"); return; }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Erro ao abrir documento");
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const url = await getSignedUrl("project_documents", filePath);
      if (!url) { toast.error("Erro ao gerar link de download"); return; }
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

  const handleDelete = async (docId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("project_documents")
        .remove([filePath]);
      if (storageError) console.error("Storage delete error:", storageError);

      const { error: dbError } = await supabase
        .from("project_documents")
        .delete()
        .eq("id", docId);
      if (dbError) throw dbError;

      toast.success("Documento removido!");
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Documento</DialogTitle>
              <DialogDescription>
                O documento será compartilhado com o cliente no portal.
              </DialogDescription>
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
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={uploading}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !docName.trim() || !selectedFile}>
                {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
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
      ) : !documents?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum documento compartilhado ainda.</p>
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
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-blue-600"
                    onClick={() => handleView(doc.file_path)}
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-green-600"
                    onClick={() => handleDownload(doc.file_path, doc.file_name)}
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
                          O documento "{doc.file_name}" será removido permanentemente. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(doc.id, doc.file_path)}
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
