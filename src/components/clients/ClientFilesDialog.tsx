import { EntityDocumentsDialog } from "@/components/shared/documents/EntityDocumentsDialog";

interface ClientFilesDialogProps {
  clientId: string;
  clientName?: string;
  trigger?: React.ReactNode;
}

/**
 * Thin wrapper around the unified EntityDocumentsDialog.
 * Kept as a named export for backwards compatibility with existing imports.
 */
export function ClientFilesDialog({
  clientId,
  clientName,
  trigger,
}: ClientFilesDialogProps) {
  return (
    <EntityDocumentsDialog
      entityType="client"
      entityId={clientId}
      entityLabel={clientName || "Cliente"}
      trigger={trigger}
    />
  );
}
