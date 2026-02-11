import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalStagesList } from "@/components/portal/PortalStagesList";
import { PortalEventForm } from "@/components/portal/PortalEventForm";
import { PortalEventsList } from "@/components/portal/PortalEventsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Building2, User, Activity, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function PortalProject() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["portal-project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          client:clients(name, email, phone),
          stages(
            *,
            stage_photos(*)
          )
        `)
        .eq("id", projectId)
        .order("created_at", { ascending: true, foreignTable: "stages" })
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Carregando obra...</div>
        </div>
      </PortalLayout>
    );
  }

  if (!project) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Obra não encontrada ou sem acesso.</p>
        </div>
      </PortalLayout>
    );
  }

  // Calculate progress
  const stages = project.stages || [];
  const totalWeight = stages.reduce((sum: number, s: any) => sum + (s.stage_weight || 0), 0);
  const completedWeight = stages
    .filter((s: any) => s.status === "concluido")
    .reduce((sum: number, s: any) => sum + (s.stage_weight || 0), 0);
  const progress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  const statusLabel: Record<string, string> = {
    pending: "Pendente",
    "em andamento": "Em andamento",
    "concluído": "Concluído",
    atrasado: "Atrasado",
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "concluído": return "bg-emerald-50 text-emerald-700";
      case "em andamento": return "bg-blue-50 text-blue-700";
      case "atrasado": return "bg-red-50 text-red-700";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Project header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getStatusColor(project.status)}>
              {statusLabel[project.status?.toLowerCase()] || project.status}
            </Badge>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Progresso Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-slate-800">{progress}%</span>
                  <span className="text-xs text-muted-foreground">
                    {stages.filter((s: any) => s.status === "concluido").length}/{stages.length} etapas
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Início:</span>
                  <span className="font-medium">
                    {project.start_date
                      ? new Date(project.start_date).toLocaleDateString("pt-BR")
                      : "Não definido"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previsão:</span>
                  <span className="font-medium">
                    {project.end_date
                      ? new Date(project.end_date).toLocaleDateString("pt-BR")
                      : "Não definido"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {project.project_manager && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Responsável
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="font-medium text-slate-800">{project.project_manager}</span>
              </CardContent>
            </Card>
          )}

          {project.client && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="font-medium text-slate-800">{project.client.name}</span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stages */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <div className="w-1 h-5 bg-primary rounded-full" />
            Etapas da Obra
          </h2>
          <PortalStagesList stages={stages} />
        </div>

        {/* Comunicações */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <MessageSquare className="h-5 w-5" />
              Comunicações
            </h2>
            <PortalEventForm
              projectId={projectId!}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["portal-events", projectId] })}
            />
          </div>
          <PortalEventsList projectId={projectId!} />
        </div>
      </div>
    </PortalLayout>
  );
}
