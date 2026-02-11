import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Building2 } from "lucide-react";

export default function PortalProjectsList() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { role } = useAuth();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["portal-projects", user?.id, role],
    queryFn: async () => {
      if (role === "admin") {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, status, start_date, end_date, clients:client_id(name)")
          .order("name");
        if (error) throw error;
        return data.map((p: any) => ({
          project_id: p.id,
          projects: { id: p.id, name: p.name, status: p.status, start_date: p.start_date, end_date: p.end_date },
          clients: p.clients,
        }));
      }

      const { data, error } = await supabase
        .from("client_portal_access")
        .select(`
          project_id,
          projects:project_id(id, name, status, start_date, end_date),
          clients:client_id(name)
        `)
        .eq("user_id", user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "concluído": return "bg-emerald-50 text-emerald-700";
      case "em andamento": return "bg-blue-50 text-blue-700";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <PortalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Minhas Obras</h1>

        {isLoading ? (
          <div className="text-muted-foreground animate-pulse">Carregando...</div>
        ) : !projects?.length ? (
          <p className="text-muted-foreground">Nenhuma obra vinculada ao seu acesso.</p>
        ) : (
          <div className="space-y-3">
            {projects.map((access: any) => (
              <Card
                key={access.project_id}
                className="border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/portal/obra/${access.project_id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
