import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  PenSquare,
  Plus,
  ChevronLeft,
  BarChart3,
  DollarSign,
  TrendingUp,
  MoreHorizontal,
  Home,
  FileText,
  MessageSquare,
} from "lucide-react";
import { ManagePortalAccessDialog } from "@/components/projects/ManagePortalAccessDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProjectInfoCard } from "@/components/projects/ProjectInfoCard";
import { ClientInfoCard } from "@/components/projects/ClientInfoCard";
import { ProjectStagesList } from "@/components/projects/ProjectStagesList";
import { ProjectPDFViewer } from "@/components/projects/ProjectPDFViewer";
import { PortalEventsAdmin } from "@/components/projects/PortalEventsAdmin";

export function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          client:clients(
            id,
            name,
            code,
            document,
            email,
            phone,
            responsible,
            street,
            number,
            city,
            state,
            zip_code
          ),
          stages(
            *,
            stage_photos(*)
          )
        `,
        )
        .eq("id", projectId)
        .order("created_at", { ascending: true, foreignTable: "stages" })
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6 flex items-center justify-center h-[50vh]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <span>Carregando detalhes da obra...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto p-6 flex flex-col items-center justify-center h-[50vh] gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Obra não encontrada</h2>
          <Button onClick={() => navigate("/obras?tab=list")}>Voltar para lista</Button>
        </div>
      </Layout>
    );
  }

  const handleEditProject = () => {
    navigate(`/obras/?tab=new&projectId=${projectId}`);
  };

  const handleGoBack = () => {
    navigate("/obras?tab=list");
  };

  // Helper para cor do badge de status (exemplo)
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "concluído":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "em andamento":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "atrasado":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-slate-100 text-slate-800 hover:bg-slate-100";
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 pb-20">
        {/* Header Area with Breadcrumb style navigation */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            {/* Breadcrumb / Top Nav */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-primary transition-colors">
                <Home className="w-3.5 h-3.5" />
              </Link>
              <span className="text-slate-300">/</span>
              <Link to="/obras?tab=list" className="hover:text-primary transition-colors">
                Obras
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-medium truncate max-w-[200px]">{project.name}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGoBack}
                  className="rounded-full -ml-2 hover:bg-slate-100 text-slate-500"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
                    <Badge variant="secondary" className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                      ID: {projectId?.slice(0, 8)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{project.client?.name}</span>
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100 shadow-sm">
                {/* Visualização / Relatórios Group */}
                <div className="flex gap-1 pr-2 border-r border-slate-200 mr-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 h-8 px-2 lg:px-3"
                    onClick={() => navigate(`/obras/${projectId}/relatorio`)}
                    title="Relatório Gerencial"
                  >
                    <BarChart3 className="w-4 h-4 lg:mr-2" />
                    <span className="hidden lg:inline">Relatório</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-green-600 hover:bg-green-50 h-8 px-2 lg:px-3"
                    onClick={() => navigate(`/obras/${projectId}/receitas`)}
                    title="Receitas"
                  >
                    <TrendingUp className="w-4 h-4 lg:mr-2" />
                    <span className="hidden lg:inline">Receitas</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-amber-600 hover:bg-amber-50 h-8 px-2 lg:px-3"
                    onClick={() => navigate(`/obras/${projectId}/custos`)}
                    title="Custos"
                  >
                    <DollarSign className="w-4 h-4 lg:mr-2" />
                    <span className="hidden lg:inline">Custos</span>
                  </Button>
                  <ManagePortalAccessDialog
                    projectId={projectId!}
                    clientId={project.client_id}
                  />
                </div>

                {/* Ações Principais Group */}
                <div className="flex gap-1">
                  <ProjectPDFViewer project={project} />

                  <Link to={`/obras/${projectId}/etapas/adicionar`}>
                    <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Nova Etapa
                    </Button>
                  </Link>

                  {/* Dropdown for Edit/More actions to clean up UI */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Opções da Obra</DropdownMenuLabel>
                      <DropdownMenuItem onClick={handleEditProject}>
                        <PenSquare className="w-4 h-4 mr-2" />
                        Editar Dados
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate(`/obras/${projectId}/relatorio`)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Ver Relatório Completo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-8">
          {/* Info Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <ProjectInfoCard
              name={project.name}
              status={project.status}
              startDate={project.start_date}
              endDate={project.end_date}
              projectManager={project.project_manager}
            />
            <ClientInfoCard client={project.client} />
          </div>

          <Separator className="my-6" />

          {/* Project Stages Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                Diário de Obra & Etapas
              </h3>
              <span className="text-sm text-slate-500">{project.stages?.length || 0} registros encontrados</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1">
              <ProjectStagesList projectId={projectId!} stages={project.stages || []} />
            </div>
          </div>

          {/* Portal Events Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full" />
                <MessageSquare className="h-5 w-5" />
                Ocorrências do Portal
              </h3>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <PortalEventsAdmin projectId={projectId!} />
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
