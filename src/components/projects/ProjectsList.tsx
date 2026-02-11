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
import { RefreshCw, Plus, FolderOpen, SearchX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("name");
  const isMobile = useIsMobile();

  // Check if there's a stored status filter from the dashboard navigation
  useEffect(() => {
    const savedStatusFilter = localStorage.getItem("projectStatusFilter");
    if (savedStatusFilter) {
      setStatusFilter(savedStatusFilter);
      // Clear after using it
      localStorage.removeItem("projectStatusFilter");
    }
  }, []);

  const {
    data: projects,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["projects", statusFilter, sortBy],
    queryFn: async () => {
      let query = supabase.from("projects").select(`
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
    mutationFn: async ({ projectId, status }: { projectId: string; status: string }) => {
      const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);

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
        .from("stages")
        .select("id")
        .eq("project_id", projectId);

      if (stagesError) {
        console.error("Error fetching stages:", stagesError);
      }

      if (stages) {
        for (const stage of stages) {
          // Delete photos for each stage
          await supabase.from("stage_photos").delete().eq("stage_id", stage.id);
        }

        // Delete all stages
        await supabase.from("stages").delete().eq("project_id", projectId);
      }

      // Finally delete the project
      const { error } = await supabase.from("projects").delete().eq("id", projectId);

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

  const filteredProjects = projects?.filter(
    (project) =>
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.client?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  // --- Loading State ---
  if (isLoading) {
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="px-0 space-y-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Empty State (No Projects created yet) ---
  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
          <FolderOpen className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Nenhuma obra cadastrada</h3>
        <p className="text-slate-500 max-w-sm mb-6">
          Comece criando sua primeira obra para gerenciar o progresso e as etapas.
        </p>
        <Button onClick={() => navigate("/obras/nova")} className="gap-2">
          <Plus className="h-4 w-4" />
          Cadastrar Primeira Obra
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gerenciamento de Obras</h2>
          <p className="text-muted-foreground">Acompanhe o status e detalhes de todos os projetos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-9 gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button
            onClick={() => navigate("/obras/nova")}
            size="sm"
            className="h-9 gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nova Obra
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <ProjectsSearch
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>

          {/* Table Content */}
          {filteredProjects?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-slate-50 p-3 rounded-full mb-3">
                <SearchX className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-base font-medium text-slate-900">Nenhum resultado encontrado</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                Não encontramos obras com os filtros atuais. Tente limpar a busca ou mudar os filtros.
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("todos");
                }}
                className="mt-2 text-blue-600"
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-b-xl overflow-hidden">
              <ProjectsTable
                projects={filteredProjects}
                onStatusChange={handleStatusChange}
                onDeleteProject={deleteProject}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-center text-slate-400 mt-8">
        Mostrando {filteredProjects?.length} de {projects.length} obras
      </div>
    </div>
  );
}
