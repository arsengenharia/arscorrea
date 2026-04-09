import { EntityDocumentsDialog } from "@/components/shared/documents/EntityDocumentsDialog";

interface ProposalDocumentsDialogProps {
  proposalId: string;
  proposalTitle: string;
  trigger: React.ReactNode;
}

/**
 * Thin wrapper around the unified EntityDocumentsDialog.
 * Kept as a named export for backwards compatibility with existing imports.
 */
export function ProposalDocumentsDialog({
  proposalId,
  proposalTitle,
  trigger,
}: ProposalDocumentsDialogProps) {
  return (
    <EntityDocumentsDialog
      entityType="proposal"
      entityId={proposalId}
      entityLabel={proposalTitle}
      trigger={trigger}
    />
  );
}
