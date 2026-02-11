
import { Layout } from "@/components/layout/Layout";
import { ProjectsList } from "@/components/projects/ProjectsList";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export default function Projects() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");

  // Set the status filter if it exists in URL params (from dashboard)
  useEffect(() => {
    if (status) {
      localStorage.setItem('projectStatusFilter', status);
    } else {
      localStorage.removeItem('projectStatusFilter');
    }
  }, [status]);

  return (
    <Layout>
      <div className="w-full mx-auto">
        <ProjectsList />
      </div>
    </Layout>
  );
}
