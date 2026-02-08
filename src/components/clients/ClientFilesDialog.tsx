
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientFilesDialogProps {
  clientId: string;
  clientName?: string;
  trigger?: React.ReactNode;
}

interface ClientFile {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

export function ClientFilesDialog({ clientId, clientName, trigger }: ClientFilesDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<ClientFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch files when dialog is opened
  const fetchFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_files")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao buscar arquivos");
      setLoading(false);
      return;
    }
    setFiles(data || []);
    setLoading(false);
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (val) fetchFiles();
  };

  // Upload file to bucket + save record
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);

    // Upload to supabase storage
    const filePath = `${clientId}/${Date.now()}-${file.name}`;
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from("client_files")
      .upload(filePath, file, { upsert: false });

    if (storageError) {
      toast.error("Erro ao fazer upload");
      setUploading(false);
      return;
    }

    // Save to client_files table - store the file path instead of public URL
    // The path can be used to generate signed URLs when downloading
    const { error: insertError } = await supabase
      .from("client_files")
      .insert({
        client_id: clientId,
        file_name: file.name,
        file_url: filePath, // Store the path, not the URL
      });
    if (insertError) {
      toast.error("Erro ao salvar referência do arquivo");
      setUploading(false);
      return;
    }
    toast.success("Arquivo enviado com sucesso!");
    event.target.value = "";
    fetchFiles();
    setUploading(false);
  };

  const handleDownload = async (file: ClientFile) => {
    // Generate a signed URL for secure file access (1 hour expiry)
    const { data, error } = await supabase.storage
      .from("client_files")
      .createSignedUrl(file.file_url, 3600);
    
    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link para download");
      return;
    }
    
    window.open(data.signedUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button variant="ghost" size="icon" className="text-blue-600">
            <Upload className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Arquivos Anexados</DialogTitle>
          <DialogDescription>
            {clientName ? `Anexos do cliente: ${clientName}` : "Arquivos anexados ao cliente"}
          </DialogDescription>
        </DialogHeader>
        <div>
          <label className="mb-2 font-medium block">Fazer upload:</label>
          <input
            type="file"
            className="block w-full"
            disabled={uploading}
            onChange={handleUpload}
          />
        </div>
        <div className="mt-4">
          <h4 className="mb-2 font-semibold">Arquivos enviados:</h4>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : files.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum arquivo anexado.</div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((file) => (
                <li key={file.id} className="flex items-center gap-3 justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[180px]">{file.file_name}</span>
                    <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">{new Date(file.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Baixar"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
