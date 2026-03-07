
import { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { ProjectDetailsPDF } from './pdf/ProjectDetailsPDF';
import type { Project } from './pdf/types';
import { getSignedUrl } from '@/hooks/use-signed-url';

interface ProjectPDFViewerProps {
  project: Project;
}

async function resolvePhotoUrls(project: Project): Promise<Project> {
  if (!project.stages) return project;

  const resolvedStages = await Promise.all(
    project.stages.map(async (stage) => {
      if (!stage.stage_photos || stage.stage_photos.length === 0) return stage;

      const resolvedPhotos = await Promise.all(
        stage.stage_photos.map(async (photo) => {
          const url = await getSignedUrl('stages', photo.photo_url);
          return { ...photo, photo_url: url || '' };
        })
      );

      return { ...stage, stage_photos: resolvedPhotos.filter(p => p.photo_url) };
    })
  );

  return { ...project, stages: resolvedStages };
}

export function ProjectPDFViewer({ project }: ProjectPDFViewerProps) {
  const [resolvedProject, setResolvedProject] = useState<Project | null>(null);
  const [resolving, setResolving] = useState(false);

  const handlePrepare = async () => {
    setResolving(true);
    const resolved = await resolvePhotoUrls(project);
    setResolvedProject(resolved);
    setResolving(false);
  };

  if (resolving) {
    return (
      <Button variant="outline" size="icon" disabled className="rounded-full">
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (!resolvedProject) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrepare}
        title="Preparar PDF"
        aria-label="Preparar PDF da obra"
        className="rounded-full"
      >
        <FileDown className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <PDFDownloadLink
      document={<ProjectDetailsPDF project={resolvedProject} />}
      fileName={`obra-${project.name}.pdf`}
    >
      {({ loading }) => (
        <Button 
          variant="outline" 
          size="icon" 
          disabled={loading}
          title="Baixar PDF"
          aria-label="Exportar detalhes da obra como PDF"
          className="rounded-full"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
