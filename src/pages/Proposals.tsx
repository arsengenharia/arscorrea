import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Plus, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProposalsList } from "@/components/proposals/ProposalsList";

const Proposals = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Propostas</h1>
            <p className="text-muted-foreground">
              Gerencie suas propostas comerciais
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <List className="h-4 w-4" />
              Lista de Propostas
            </Button>
            <Button onClick={() => navigate("/propostas/nova")} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Proposta
            </Button>
          </div>
        </div>

        <ProposalsList />
      </div>
    </Layout>
  );
};

export default Proposals;
