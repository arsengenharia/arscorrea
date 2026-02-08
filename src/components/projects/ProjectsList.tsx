
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/query-client";
import { toast } from "sonner";
import { ProjectsSearch } from "./ProjectsSearch";
import { useState, useEffect } from "react";
import { ProjectsTable } from "./ProjectsTable";
import { useIsMobile } from "@/hooks/use-mobile";
import { RefreshCw } from "lucide-react";

export function ProjectsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("name");
  const isMobile = useIsMobile();

  // Check if there's a stored status filter from the dashboard navigation
  useEffect(() => {
    const savedStatusFilter = localStorage.getItem('projectStatusFilter');
    if (savedStatusFilter) {
      setStatusFilter(savedStatusFilter);
      // Clear after using it
      localStorage.removeItem('projectStatusFilter');
    }
  }, []);

  const { data: projects, isLoading, refetch, error } = useQuery({
    queryKey: ["projects", statusFilter, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("projects")
        .select(`
          *,
          client:clients!left(name, phone, street, number, neighborhood, city, state)
        `);

      if (statusFilter !== "todos") {
        query = query.eq("status", statusFilter);
      }

      // Apply sorting
      const [field, direction] = sortBy.split("-");
      query = query.order(field, { ascending: direction !== "desc" });

      const { data, error } = await query;
      
      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }
      return data;
    },
  });

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      const err = error as any;
      toast.error(`Erro ao carregar obras: ${err?.message || "Erro desconhecido"}`);
    }
  }, [error]);

  const { mutate: updateProjectStatus } = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: string, status: string }) => {
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Erro desconhecido";
      toast.error(`Erro ao atualizar status: ${errorMessage}`);
      console.error("Update status error:", error);
    },
  });

  const { mutate: deleteProject } = useMutation({
    mutationFn: async (projectId: string) => {
      // First delete all stages and their photos
      const { data: stages, error: stagesError } = await supabase
        .from('stages')
        .select('id')
        .eq('project_id', projectId);
      
      if (stagesError) {
        console.error("Error fetching stages:", stagesError);
      }
      
      if (stages) {
        for (const stage of stages) {
          // Delete photos for each stage
          await supabase
            .from('stage_photos')
            .delete()
            .eq('stage_id', stage.id);
        }
        
        // Delete all stages
        await supabase
          .from('stages')
          .delete()
          .eq('project_id', projectId);
      }

      // Finally delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Obra excluída com sucesso!");
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Erro desconhecido";
      toast.error(`Erro ao excluir obra: ${errorMessage}`);
      console.error("Delete project error:", error);
    },
  });

  const handleStatusChange = (projectId: string, newStatus: string) => {
    updateProjectStatus({ projectId, status: newStatus });
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Lista atualizada");
  };

  const filteredProjects = projects?.filter(project => 
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="w-full h-12 bg-muted animate-pulse rounded-md" />
        <div className="w-full h-64 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Nenhuma obra cadastrada</h3>
        <p className="text-muted-foreground mt-2">Comece cadastrando uma nova obra.</p>
        <Button onClick={() => navigate("/obras?tab=new")} className="mt-4">
          Cadastrar Obra
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Lista de Obras</h3>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            title="Atualizar lista"
            aria-label="Atualizar lista"
            className="rounded-full"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <ProjectsSearch 
          search={search} 
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>
      
      {filteredProjects?.length === 0 ? (
        <div className="text-center py-10">
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Nenhuma obra encontrada</h3>
          <p className="text-muted-foreground mt-2">Tente buscar com outros termos.</p>
        </div>
      ) : (
        <ProjectsTable
          projects={filteredProjects}
          onStatusChange={handleStatusChange}
          onDeleteProject={deleteProject}
        />
      )}
    </div>
  );
}
