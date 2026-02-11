import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { StagePhoto } from "@/components/projects/StagePhoto";

interface Stage {
  id: string;
  name: string;
  status: string;
  stage_weight: number;
  report?: string | null;
  report_start_date?: string | null;
  report_end_date?: string | null;
  stage_photos?: { id: string; photo_url: string }[];
}

interface PortalStagesListProps {
  stages: Stage[];
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  concluido: {
    label: "Concluído",
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  em_andamento: {
    label: "Em andamento",
    icon: <Clock className="h-4 w-4" />,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  pending: {
    label: "Pendente",
    icon: <AlertCircle className="h-4 w-4" />,
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

export function PortalStagesList({ stages }: PortalStagesListProps) {
  if (!stages.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma etapa registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stages.map((stage) => {
        const config = statusConfig[stage.status] || statusConfig.pending;
        return (
          <Card key={stage.id} className="overflow-hidden border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="font-semibold text-slate-800">{stage.name}</h4>
                <Badge variant="outline" className={`${config.className} gap-1 shrink-0`}>
                  {config.icon}
                  {config.label}
                </Badge>
              </div>

              {stage.report && (
                <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">
                  {stage.report}
                </p>
              )}

              {stage.report_start_date && (
                <p className="text-xs text-muted-foreground mb-3">
                  Período: {new Date(stage.report_start_date).toLocaleDateString("pt-BR")}
                  {stage.report_end_date &&
                    ` a ${new Date(stage.report_end_date).toLocaleDateString("pt-BR")}`}
                </p>
              )}

              {/* Photo gallery */}
              {stage.stage_photos && stage.stage_photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3">
                  {stage.stage_photos.map((photo) => (
                    <div key={photo.id} className="rounded-lg overflow-hidden">
                      <StagePhoto photoPath={photo.photo_url} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
