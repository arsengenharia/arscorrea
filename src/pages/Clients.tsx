
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { UserPlus, List } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";

export default function Clients() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showList = searchParams.get("showList");
  const isMobile = useIsMobile();

  // If redirected from dashboard with showList parameter, navigate to list
  useEffect(() => {
    if (showList === "true") {
      navigate("/clientes/lista");
    }
  }, [showList, navigate]);

  return (
    <Layout>
      <div className="w-full mx-auto">
        <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold mb-4 md:mb-8`}>Clientes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
          <Button 
            className={`${isMobile ? 'h-24' : 'h-20'} rounded-xl bg-blue-500 hover:bg-blue-600 transition-all flex justify-center items-center w-full`}
            onClick={() => navigate('/clientes/cadastro')}
          >
            <div className="flex flex-row items-center gap-4">
              <UserPlus className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
              <span className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Cadastro de Clientes</span>
            </div>
          </Button>
          <Button 
            className={`${isMobile ? 'h-24' : 'h-20'} rounded-xl bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200 transition-all flex justify-center items-center w-full`}
            variant="secondary"
            onClick={() => navigate('/clientes/lista')}
          >
            <div className="flex flex-row items-center gap-4">
              <List className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
              <span className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Lista de Clientes</span>
            </div>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
