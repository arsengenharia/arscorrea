
import { Link } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, PenSquare, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatDate = (date: string | null) => {
  if (!date) return 'Não definida';
  try {
    const datePart = date.includes('T') ? date.split('T')[0] : date;
    return format(new Date(datePart), 'dd/MM/yyyy');
  } catch (error) {
    console.error("Erro ao formatar data:", date, error);
    return 'Data inválida';
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'pendente':
      return 'pending';
    case 'iniciado':
      return 'started';
    case 'concluido':
      return 'completed';
    default:
      return 'default';
  }
};

interface Stage {
  id: string;
  name: string;
  status: string;
  report: string | null;
  report_start_date: string | null;
  report_end_date: string | null;
  stage_photos?: {
    id: string;
    photo_url: string;
  }[];
}

interface ProjectStagesListProps {
  projectId: string;
  stages: Stage[];
  onStageDeleted?: (stageId: string) => void; // callback opcional para deletar da lista
}

export function ProjectStagesList({ projectId, stages, onStageDeleted }: ProjectStagesListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!stages || stages.length === 0) return null;

  const handleDeleteStage = async () => {
    if (!stageToDelete) return;
    
    setIsDeleting(true);
    const toastId = toast.loading("Excluindo etapa...");
    
    try {
      console.log("Tentando excluir etapa:", stageToDelete);
      
      // First delete any related photos to avoid foreign key constraints
      const { error: photosError } = await supabase
        .from("stage_photos")
        .delete()
        .eq("stage_id", stageToDelete);
        
      if (photosError) {
        console.error("Erro ao excluir fotos da etapa:", photosError);
        toast.error("Erro ao excluir fotos da etapa", { id: toastId });
        return;
      }
      
      // Then delete the stage itself
      const { error } = await supabase
        .from("stages")
        .delete()
        .eq("id", stageToDelete);
        
      if (error) {
        console.error("Erro ao excluir etapa:", error);
        toast.error("Erro ao excluir etapa: " + error.message, { id: toastId });
      } else {
        toast.success("Etapa excluída com sucesso!", { id: toastId });
        if (onStageDeleted) {
          onStageDeleted(stageToDelete);
        } else {
          window.location.reload(); // fallback para recarregar caso não tenha callback
        }
      }
    } catch (error) {
      console.error("Erro inesperado ao excluir etapa:", error);
      toast.error("Erro inesperado ao excluir etapa", { id: toastId });
    } finally {
      setIsDeleting(false);
      setStageToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Etapas da Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {stages.map((stage) => (
              <div key={stage.id} className="border-b pb-4 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{stage.name}</h3>
                    <Badge variant={getStatusBadgeVariant(stage.status)} className="mt-1">
                      {stage.status.charAt(0).toUpperCase() + stage.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to={`/obras/${projectId}/etapas/${stage.id}/editar`}>
                      <Button variant="ghost" size="sm">
                        <PenSquare className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStageToDelete(stage.id);
                        setDeleteDialogOpen(true);
                      }}
                      aria-label="Excluir etapa"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>


                {stage.report && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Relatório</p>
                    <p className="text-sm text-muted-foreground">{stage.report}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-3">
                  {stage.report_start_date && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Data Início</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(stage.report_start_date)}
                        </p>
                      </div>
                    </div>
                  )}

                  {stage.report_end_date && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Data Fim</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(stage.report_end_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {stage.stage_photos && stage.stage_photos.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Fotos</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {stage.stage_photos.map((photo) => (
                        <img
                          key={photo.id}
                          src={photo.photo_url}
                          alt="Foto da etapa"
                          className="w-full h-32 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Separate AlertDialog outside the mapping loop */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta etapa? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDeleteStage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
