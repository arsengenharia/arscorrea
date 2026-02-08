
import { useSearchParams } from "react-router-dom";
import { ProjectForm } from "./ProjectForm";
import { ProjectsList } from "./ProjectsList";

export function ProjectsContent() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "new";

  if (tab === "list") {
    return <ProjectsList />;
  }

  return <ProjectForm />;
}
