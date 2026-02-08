
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Building, List } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ProjectsContent } from "@/components/projects/ProjectsContent";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";

export default function Projects() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const status = searchParams.get("status");
  const isMobile = useIsMobile();

  // Set the status filter if it exists in URL params
  useEffect(() => {
    if (tab === 'list' && status) {
      // Store the status filter to be used by ProjectsList component
      localStorage.setItem('projectStatusFilter', status);
    } else {
      localStorage.removeItem('projectStatusFilter');
    }
  }, [tab, status]);

  return (
    <Layout>
      {!tab ? (
        <div className="w-full mx-auto">
          <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold mb-4 md:mb-8`}>Obras</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
            <Button 
              className={`${isMobile ? 'h-24' : 'h-20'} rounded-xl bg-blue-500 hover:bg-blue-600 transition-all flex justify-center items-center w-full`}
              onClick={() => navigate('/obras?tab=new')}
            >
              <div className="flex flex-row items-center gap-4">
                <Building className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                <span className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Nova Obra</span>
              </div>
            </Button>
            <Button 
              className={`${isMobile ? 'h-24' : 'h-20'} rounded-xl bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200 transition-all flex justify-center items-center w-full`}
              variant="secondary"
              onClick={() => navigate('/obras?tab=list')}
            >
              <div className="flex flex-row items-center gap-4">
                <List className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                <span className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Lista de Obras</span>
              </div>
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <h2 className={`${isMobile ? 'text-xl' : 'text-4xl'} font-bold truncate`}>
              {tab === 'new' ? 'Nova Obra' : 'Lista de Obras'}
              {status && tab === 'list' && (
                status === 'concluido' ? ' - Concluídas' : 
                status === 'iniciado' ? ' - Em Andamento' : 
                status === 'pendente' ? ' - Pendentes' : ''
              )}
            </h2>
            <Button
              variant="outline"
              onClick={() => navigate('/obras')}
              className="rounded-lg px-2 py-1 md:px-4 md:py-2 whitespace-nowrap"
            >
              Voltar
            </Button>
          </div>
          <div className="max-w-6xl mx-auto">
            <ProjectsContent />
          </div>
        </div>
      )}
    </Layout>
  );
}
