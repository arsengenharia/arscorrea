import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileUp } from "lucide-react";
import { toast } from "sonner";

export function NfeUploadArea() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) => f.name.endsWith(".xml") || f.name.endsWith(".pdf")
    );

    if (fileArray.length === 0) {
      toast.error("Selecione arquivos XML ou PDF de NF-e");
      return;
    }

    setUploading(true);
    let uploaded = 0;

    for (const file of fileArray) {
      const path = `inbox/${Date.now()}-${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from("nfe-attachments")
        .upload(path, file, { contentType: file.type });

      if (uploadErr) {
        toast.error(`Erro ao enviar ${file.name}: ${uploadErr.message}`);
        continue;
      }

      const isXml = file.name.toLowerCase().endsWith(".xml");

      const { error: insertErr } = await (supabase.from("nfe_inbox" as any) as any).insert({
        status: "recebido",
        origem: "upload_manual",
        arquivo_path: path,
        arquivo_tipo: isXml ? "xml" : "pdf",
      });

      if (insertErr) {
        toast.error(`Erro ao registrar ${file.name}`);
      } else {
        uploaded++;
      }
    }

    if (uploaded > 0) {
      toast.success(`${uploaded} arquivo(s) enviado(s) para processamento`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Manual de NF-e</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Arraste arquivos XML ou PDF de NF-e aqui, ou clique para selecionar
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Enviando..." : "Selecionar Arquivos"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
