import { FileText, Image as ImageIcon, File } from "lucide-react";

export function getFileIcon(fileType: string | null) {
  const type = fileType?.toLowerCase() || "";
  if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
  if (
    type.includes("jpg") ||
    type.includes("jpeg") ||
    type.includes("png") ||
    type.includes("webp") ||
    type.includes("image")
  )
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}
