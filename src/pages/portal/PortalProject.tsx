import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { PortalStagesList } from "@/components/portal/PortalStagesList";
import { PortalEventForm } from "@/components/portal/PortalEventForm";
import { PortalEventsList } from "@/components/portal/PortalEventsList";
import { PortalDocumentsList } from "@/components/portal/PortalDocumentsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Building2, User, Activity, MessageSquare, MapPin, LayoutList, Eye, FolderOpen } from "lucide-react";
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
          ),
          contracts(
            proposal:proposals(work_address)
          )
        `)
        .eq("id", projectId)
        .order("created_at", { ascending: true, foreignTable: "stages" })
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Count pending communications for badge
  const { data: pendingCount } = useQuery({
    queryKey: ["portal-events-pending", projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("portal_events")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId!)
        .in("status", ["aberto", "em_analise"]);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!projectId,
  });

  // Count documents for badge
  const { data: docsCount } = useQuery({
    queryKey: ["portal-documents-count", projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("project_documents")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!projectId,
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

  const stages = project.stages || [];
  const totalWeight = stages.reduce((sum: number, s: any) => sum + (s.stage_weight || 0), 0);
  const completedWeight = stages
    .filter((s: any) => s.status === "concluido")
    .reduce((sum: number, s: any) => sum + (s.stage_weight || 0), 0);
  const progress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  // Extract work address from contract → proposal
  const workAddress = (project as any).contracts
    ?.map((c: any) => c.proposal?.work_address)
    .find((addr: string | null) => !!addr) || null;

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
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Project header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getStatusColor(project.status)}>
              {statusLabel[project.status?.toLowerCase()] || project.status}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <Eye className="h-4 w-4 hidden sm:inline" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="stages" className="gap-1.5 text-xs sm:text-sm">
              <LayoutList className="h-4 w-4 hidden sm:inline" />
              Etapas
            </TabsTrigger>
            <TabsTrigger value="communications" className="gap-1.5 text-xs sm:text-sm relative">
              <MessageSquare className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Comunicações</span>
              <span className="sm:hidden">Msgs</span>
              {!!pendingCount && pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs sm:text-sm">
              <FolderOpen className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Documentos</span>
              <span className="sm:hidden">Docs</span>
              {!!docsCount && docsCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-slate-500 text-white">
                  {docsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <Card className="border-slate-200 animate-fade-in">
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

              <Card className="border-slate-200 animate-fade-in">
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

              {workAddress && (
                <Card className="border-slate-200 animate-fade-in">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Endereço
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="font-medium text-slate-800">{workAddress}</span>
                  </CardContent>
                </Card>
              )}

              {project.project_manager && (
                <Card className="border-slate-200 animate-fade-in">
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
                <Card className="border-slate-200 animate-fade-in">
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
          </TabsContent>

          {/* Stages Tab */}
          <TabsContent value="stages">
            <div className="mt-4 animate-fade-in">
              <PortalStagesList stages={stages} />
            </div>
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications">
            <div className="space-y-4 mt-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Comunicações</h2>
                <PortalEventForm
                  projectId={projectId!}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["portal-events", projectId] });
                    queryClient.invalidateQueries({ queryKey: ["portal-events-pending", projectId] });
                  }}
                />
              </div>
              <PortalEventsList projectId={projectId!} />
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="mt-4 animate-fade-in">
              <PortalDocumentsList projectId={projectId!} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
