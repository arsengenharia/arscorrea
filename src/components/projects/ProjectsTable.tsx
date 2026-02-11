
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ProjectStatusSelect } from "./ProjectStatusSelect";
import { ProjectActions } from "./ProjectActions";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClientFilesDialog } from "@/components/clients/ClientFilesDialog";
import { Upload } from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  updated_at: string;
  client?: {
    name: string | null;
    id?: string;
  };
  client_id?: string; // for direct access in case relational ID is not filled in the object
}

interface ProjectsTableProps {
  projects: Project[];
  onStatusChange: (projectId: string, status: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectsTable({ projects, onStatusChange, onDeleteProject }: ProjectsTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Mobile card view
    return (
      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-xl border p-4 shadow-sm">
            <h3 className="font-medium text-lg mb-2 text-blue-600">
              {project.name}
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <ProjectStatusSelect 
                  status={project.status}
                  onStatusChange={(status) => onStatusChange(project.id, status)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-500">Data de Início</p>
                  <p>{project.start_date ? format(new Date(project.start_date), 'dd/MM/yyyy') : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Última Atualização</p>
                  <p>{format(new Date(project.updated_at), 'dd/MM/yyyy')}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <ProjectActions
                projectId={project.id} 
                onDelete={onDeleteProject} 
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="rounded-xl border overflow-x-auto bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 border-b">
            <TableHead className="w-[400px] py-4 text-gray-700 font-medium">
              Nome do Condomínio
            </TableHead>
            <TableHead className="w-[150px] py-4 text-gray-700 font-medium">
              Status
            </TableHead>
            <TableHead className="w-[150px] py-4 text-gray-700 font-medium">
              Data de Início
            </TableHead>
            <TableHead className="w-[150px] py-4 text-gray-700 font-medium">
              Última Atualização
            </TableHead>
            <TableHead className="w-[200px] text-center py-4 text-gray-700 font-medium">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} className="border-b hover:bg-gray-50">
              <TableCell className="font-medium py-4">
                {project.name}
              </TableCell>
              <TableCell>
                <ProjectStatusSelect 
                  status={project.status}
                  onStatusChange={(status) => onStatusChange(project.id, status)}
                />
              </TableCell>
              <TableCell>
                {project.start_date ? format(new Date(project.start_date), 'dd/MM/yyyy') : '-'}
              </TableCell>
              <TableCell>
                {format(new Date(project.updated_at), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell>
                <ProjectActions 
                  projectId={project.id} 
                  onDelete={onDeleteProject} 
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
