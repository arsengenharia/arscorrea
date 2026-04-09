import { EntityDocumentsPanel } from "@/components/shared/documents/EntityDocumentsPanel";

interface ProjectDocumentsAdminProps {
  projectId: string;
}

/**
 * Thin wrapper around the unified EntityDocumentsPanel.
 * Rendered inline inside ProjectDetails tabs.
 */
export function ProjectDocumentsAdmin({ projectId }: ProjectDocumentsAdminProps) {
  return (
    <EntityDocumentsPanel
      entityType="project"
      entityId={projectId}
      uploadDescription="O documento será compartilhado com o cliente no portal."
    />
  );
}
