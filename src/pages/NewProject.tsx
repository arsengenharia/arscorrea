
import { Layout } from "@/components/layout/Layout";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function NewProject() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="w-full mx-auto">
        <div className="flex items-center justify-between mb-4 md:mb-8">
          <h2 className="text-2xl md:text-4xl font-bold truncate">Nova Obra</h2>
          <Button
            variant="outline"
            onClick={() => navigate('/obras')}
            className="rounded-lg gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        <div className="max-w-6xl mx-auto">
          <ProjectForm />
        </div>
      </div>
    </Layout>
  );
}
