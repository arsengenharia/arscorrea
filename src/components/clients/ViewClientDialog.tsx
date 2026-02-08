
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ViewClientDialogProps {
  client: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewClientDialog({ client, open, onOpenChange }: ViewClientDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <p className="text-sm text-muted-foreground">{client.name}</p>
            </div>

            <div className="space-y-2">
              <Label>CPF/CNPJ</Label>
              <p className="text-sm text-muted-foreground">{client.document || '-'}</p>
            </div>

            <div className="space-y-2">
              <Label>Código</Label>
              <p className="text-sm text-muted-foreground">{client.code || '-'}</p>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <p className="text-sm text-muted-foreground">{client.responsible || '-'}</p>
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <p className="text-sm text-muted-foreground">{client.phone || '-'}</p>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{client.email || '-'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rua</Label>
                <p className="text-sm text-muted-foreground">{client.street || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label>Número</Label>
                <p className="text-sm text-muted-foreground">{client.number || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label>Complemento</Label>
                <p className="text-sm text-muted-foreground">{client.complement || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label>Cidade</Label>
                <p className="text-sm text-muted-foreground">{client.city || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <p className="text-sm text-muted-foreground">{client.state || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label>CEP</Label>
                <p className="text-sm text-muted-foreground">{client.zip_code || '-'}</p>
              </div>
            </div>
          </div>

          {client.observations && (
            <div className="space-y-2">
              <Label>Observações</Label>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {client.observations}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
