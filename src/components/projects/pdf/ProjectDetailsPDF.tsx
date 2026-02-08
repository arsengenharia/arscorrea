
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './styles';
import { PDFHeader } from './PDFHeader';
import { ProjectInfo } from './ProjectInfo';
import { ClientInfo } from './ClientInfo';
import { ProjectStages } from './ProjectStages';
import type { Project } from './types';

export function ProjectDetailsPDF({ project }: { project: Project }) {
  return (
    <Document>
      {/* First page with project details and client info */}
      <Page size="A4" style={styles.page}>
        <PDFHeader />
        <Text style={styles.title}>{project.name}</Text>
        <ProjectInfo project={project} />
        <ClientInfo client={project.client} />
      </Page>

      {/* Create a separate page for each stage */}
      {project.stages && project.stages.length > 0 && 
        project.stages.map((stage) => (
          <Page key={stage.id} size="A4" style={styles.page}>
            <PDFHeader />
            <Text style={styles.title}>{project.name} - Etapa: {stage.name}</Text>
            <ProjectStages stage={stage} />
          </Page>
        ))
      }
    </Document>
  );
}
