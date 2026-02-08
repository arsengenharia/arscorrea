
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PenSquare, Plus, ChevronLeft } from "lucide-react";
import { ProjectInfoCard } from "@/components/projects/ProjectInfoCard";
import { ClientInfoCard } from "@/components/projects/ClientInfoCard";
import { ProjectStagesList } from "@/components/projects/ProjectStagesList";
import { ProjectPDFViewer } from '@/components/projects/ProjectPDFViewer';

export function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
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
        `)
        .eq('id', projectId)
        .order('created_at', { ascending: true, foreignTable: 'stages' })
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div>Carregando...</div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div>Obra não encontrada</div>
        </div>
      </Layout>
    );
  }
  
  const handleEditProject = () => {
    navigate(`/obras/?tab=new&projectId=${projectId}`);
  };

  const handleGoBack = () => {
    navigate('/obras?tab=list');
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleGoBack}
              title="Voltar"
              aria-label="Voltar para lista de obras"
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Detalhes da Obra</h2>
          </div>
          <div className="flex gap-2">
            <ProjectPDFViewer project={project} />
            <Link to={`/obras/${projectId}/etapas/adicionar`}>
              <Button 
                variant="default" 
                size="icon"
                title="Adicionar Etapa"
                aria-label="Adicionar nova etapa"
                className="rounded-full"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleEditProject}
              title="Editar Obra"
              aria-label="Editar detalhes da obra"
              className="rounded-full"
            >
              <PenSquare className="w-4 h-4" />
            </Button>
          </div>
        </div>

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

        <ProjectStagesList projectId={projectId!} stages={project.stages || []} />
      </div>
    </Layout>
  );
}

