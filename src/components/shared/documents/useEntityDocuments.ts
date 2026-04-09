import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSignedUrl } from "@/hooks/use-signed-url";
import { toast } from "sonner";
import { getFileExtension } from "./document-helpers";

/**
 * Entity documents configuration — each supported entity type maps to a table,
 * a storage bucket, and the foreign-key column linking back to the parent row.
 */
export type EntityDocumentConfig = {
  table: "client_files" | "project_documents" | "proposal_documents";
  bucket: string;
  foreignKey: "client_id" | "project_id" | "proposal_id";
};

export const ENTITY_DOCUMENT_CONFIGS: Record<
  "client" | "project" | "proposal",
  EntityDocumentConfig
> = {
  client: {
    table: "client_files",
    bucket: "client_files",
    foreignKey: "client_id",
  },
  project: {
    table: "project_documents",
    bucket: "project_documents",
    foreignKey: "project_id",
  },
  proposal: {
    table: "proposal_documents",
    bucket: "proposal_documents",
    foreignKey: "proposal_id",
  },
};

export interface EntityDocument {
  id: string;
  file_name: string;
  file_path: string | null;
  file_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  /** Legacy field — only populated on older `client_files` rows */
  file_url?: string | null;
}

interface UseEntityDocumentsArgs {
  entityType: "client" | "project" | "proposal";
  entityId: string;
  enabled?: boolean;
}

export function useEntityDocuments({
  entityType,
  entityId,
  enabled = true,
}: UseEntityDocumentsArgs) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const config = ENTITY_DOCUMENT_CONFIGS[entityType];

  const queryKey = [`${entityType}-documents`, entityId];

  const documentsQuery = useQuery({
    queryKey,
    enabled: enabled && !!entityId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(config.table)
        .select("*")
        .eq(config.foreignKey, entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EntityDocument[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (args: {
      file: File;
      name: string;
      description?: string;
    }) => {
      const { file, name, description } = args;
      const ext = getFileExtension(file.name);
      const filePath = `${entityId}/${crypto.randomUUID()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from(config.bucket)
        .upload(filePath, file);
      if (storageError) throw storageError;

      const insertPayload: Record<string, unknown> = {
        [config.foreignKey]: entityId,
        file_name: name.trim(),
        file_path: filePath,
        file_type: ext,
        uploaded_by: user?.id || null,
        description: description?.trim() || null,
      };

      const { error: dbError } = await (supabase as any)
        .from(config.table)
        .insert(insertPayload);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("Documento enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar: " + (error?.message || "desconhecido"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: EntityDocument) => {
      if (doc.file_path) {
        const { error: storageError } = await supabase.storage
          .from(config.bucket)
          .remove([doc.file_path]);
        if (storageError) console.error("Storage delete error:", storageError);
      }
      const { error: dbError } = await (supabase as any)
        .from(config.table)
        .delete()
        .eq("id", doc.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success("Documento removido!");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      toast.error("Erro ao remover: " + (error?.message || "desconhecido"));
    },
  });

  /**
   * Resolve a document to a viewable signed URL.
   *
   * New rows carry the storage path in `file_path`. Legacy `client_files`
   * rows (pre-unification) stored the storage path in the `file_url` column
   * instead — so we fall back to that value as a path, not as a public URL.
   */
  async function resolveUrl(doc: EntityDocument): Promise<string | null> {
    const storagePath = doc.file_path || doc.file_url || null;
    if (!storagePath) return null;
    return await getSignedUrl(config.bucket, storagePath);
  }

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    refetch: documentsQuery.refetch,
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    remove: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    resolveUrl,
  };
}
