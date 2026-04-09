import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { EntityDocumentsPanel } from "./EntityDocumentsPanel";

interface EntityDocumentsDialogProps {
  entityType: "client" | "project" | "proposal";
  entityId: string;
  entityLabel: string;
  /**
   * Optional custom trigger. If omitted, a default ghost Paperclip button
   * is rendered — suitable for list-row quick-access actions.
   */
  trigger?: React.ReactNode;
  uploadDescription?: string;
}

const defaultTrigger = (
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8 text-slate-500 hover:text-purple-600 hover:bg-purple-50"
    title="Documentos"
  >
    <Paperclip className="h-4 w-4" />
  </Button>
);

/**
 * Dialog wrapper around `EntityDocumentsPanel` — used as a quick-access
 * entry point from list screens (Clientes, Propostas, Obras).
 */
export function EntityDocumentsDialog({
  entityType,
  entityId,
  entityLabel,
  trigger,
  uploadDescription,
}: EntityDocumentsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos — {entityLabel}</DialogTitle>
          <DialogDescription>
            Anexos e arquivos associados a este registro.
          </DialogDescription>
        </DialogHeader>
        <EntityDocumentsPanel
          entityType={entityType}
          entityId={entityId}
          uploadDescription={uploadDescription}
          enabled={open}
        />
      </DialogContent>
    </Dialog>
  );
}
