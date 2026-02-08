
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { ProjectDetailsPDF } from './pdf/ProjectDetailsPDF';
import type { Project } from './pdf/types';

interface ProjectPDFViewerProps {
  project: Project;
}

export function ProjectPDFViewer({ project }: ProjectPDFViewerProps) {
  return (
    <PDFDownloadLink
      document={<ProjectDetailsPDF project={project} />}
      fileName={`obra-${project.name}.pdf`}
    >
      {({ loading }) => (
        <Button 
          variant="outline" 
          size="icon" 
          disabled={loading}
          title="Exportar PDF"
          aria-label="Exportar detalhes da obra como PDF"
          className="rounded-full"
        >
          <FileDown className="w-4 h-4" />
        </Button>
      )}
    </PDFDownloadLink>
  );
}
