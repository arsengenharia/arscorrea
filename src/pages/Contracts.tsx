import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ContractsList } from "@/components/contracts/ContractsList";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Contracts() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Contratos</h1>
          <Button onClick={() => navigate("/contratos/novo")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>

        <ContractsList />
      </div>
    </Layout>
  );
}
