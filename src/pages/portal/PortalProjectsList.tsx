import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Building2, CalendarDays, Bell, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function calculateProgress(stages: { status: string; stage_weight: number }[]) {
  if (!stages?.length) return 0;
  const totalWeight = stages.reduce((acc, s) => acc + (s.stage_weight || 0), 0);
  if (totalWeight === 0) return 0;
  const completedWeight = stages
    .filter((s) => s.status === "Concluído")
    .reduce((acc, s) => acc + (s.stage_weight || 0), 0);
  return Math.round((completedWeight / totalWeight) * 100);
}

export default function PortalProjectsList() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["portal-projects", user?.id, role],
    queryFn: async () => {
      if (role === "admin") {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, status, start_date, end_date, clients:client_id(name), stages(status, stage_weight)")
          .order("name");
        if (error) throw error;
        return data.map((p: any) => ({
          project_id: p.id,
          projects: { id: p.id, name: p.name, status: p.status, start_date: p.start_date, end_date: p.end_date },
          clients: p.clients,
          stages: p.stages || [],
        }));
      }

      const { data, error } = await supabase
        .from("client_portal_access")
        .select(`
          project_id,
          projects:project_id(id, name, status, start_date, end_date, stages(status, stage_weight)),
          clients:client_id(name)
        `)
        .eq("user_id", user!.id);

      if (error) throw error;
      return data.map((a: any) => ({
        ...a,
        stages: a.projects?.stages || [],
      }));
    },
    enabled: !!user,
  });

  // Recent activity from portal_events
  const projectIds = projects?.map((p: any) => p.project_id) || [];
  const { data: recentActivity } = useQuery({
    queryKey: ["portal-activity", projectIds],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("portal_events")
        .select("id, title, status, admin_response, responded_at, project_id, projects:project_id(name)")
        .in("project_id", projectIds)
        .gte("updated_at", sevenDaysAgo.toISOString())
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: projectIds.length > 0,
  });

  const pendingCount = recentActivity?.filter(
    (e: any) => e.status === "Aberto" || e.status === "Em Análise"
  ).length || 0;

  const recentResponses = recentActivity?.filter(
    (e: any) => e.admin_response
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "concluído": return "bg-emerald-50 text-emerald-700";
      case "em andamento": return "bg-blue-50 text-blue-700";
      case "paralisado": return "bg-amber-50 text-amber-700";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const userName = user?.email?.split("@")[0] || "";
  const greeting = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <PortalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Olá, {greeting}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe suas obras abaixo.
          </p>
        </div>

        {/* Activity Panel */}
        {(pendingCount > 0 || recentResponses.length > 0) && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 space-y-2">
              <h2 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Atividades Recentes
              </h2>
              {pendingCount > 0 && (
                <p className="text-sm text-blue-700 flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {pendingCount} comunicação(ões) pendente(s)
                </p>
              )}
              {recentResponses.slice(0, 3).map((ev: any) => (
                <p key={ev.id} className="text-sm text-blue-700">
                  ✓ Resposta em "<span className="font-medium">{ev.title}</span>"
                  {ev.projects?.name && (
                    <span className="text-blue-500"> — {ev.projects.name}</span>
                  )}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        {isLoading ? (
          <div className="text-muted-foreground animate-pulse">Carregando...</div>
        ) : !projects?.length ? (
          <p className="text-muted-foreground">Nenhuma obra vinculada ao seu acesso.</p>
        ) : (
          <div className="space-y-3">
            {projects.map((access: any) => {
              const progress = calculateProgress(access.stages);
              return (
                <Card
                  key={access.project_id}
                  className="border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/portal/obra/${access.project_id}`)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {access.projects?.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {access.clients?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(access.projects?.status)}>
                          {access.projects?.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Dates */}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Início: {formatDate(access.projects?.start_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Previsão: {formatDate(access.projects?.end_date)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
