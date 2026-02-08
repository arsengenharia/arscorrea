
import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { styles } from './styles';
import { Stage } from './types';

const formatDate = (date: string | null) => {
  if (!date) return 'Não definida';
  return format(new Date(date), 'dd/MM/yyyy');
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pendente':
      return '#FFC107';
    case 'iniciado':
      return '#3B82F6';
    case 'concluido':
      return '#10B981';
    default:
      return '#6B7280';
  }
};

const StagePhotos = ({ photos }: { photos?: Array<{ id: string; photo_url: string }> }) => {
  if (!photos || photos.length === 0) return null;
  
  return (
    <View style={styles.photosContainer}>
      <Text style={styles.sectionSubtitle}>Fotos:</Text>
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoWrapper}>
            <Image src={photo.photo_url} style={styles.photo} />
          </View>
        ))}
      </View>
    </View>
  );
};

export function ProjectStages({ stage }: { stage: Stage }) {
  if (!stage) return null;

  return (
    <View style={styles.stageContainer} wrap>
      <View style={{
        ...styles.statusBadge,
        backgroundColor: getStatusColor(stage.status),
      }}>
        <Text>{stage.status}</Text>
      </View>
      
      {stage.report_start_date && (
        <Text style={styles.text}>
          <Text style={styles.label}>Data de Início do Relatório: </Text>
          {formatDate(stage.report_start_date)}
        </Text>
      )}
      
      {stage.report_end_date && (
        <Text style={styles.text}>
          <Text style={styles.label}>Data de Conclusão do Relatório: </Text>
          {formatDate(stage.report_end_date)}
        </Text>
      )}
      
      {stage.report && (
        <Text style={styles.text} wrap>
          <Text style={styles.label}>Relatório: </Text>
          {stage.report}
        </Text>
      )}
      
      <StagePhotos photos={stage.stage_photos} />
    </View>
  );
}

// Also export a component for backward compatibility with other components that might use the array version
export function ProjectStagesList({ stages }: { stages?: Stage[] }) {
  if (!stages || stages.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Etapas da Obra</Text>
      {stages.map((stage) => (
        <View key={stage.id} style={styles.stageItem}>
          <Text style={styles.stageName}>{stage.name}</Text>
          <Text style={styles.stageStatus}>Status: {stage.status}</Text>
        </View>
      ))}
    </View>
  );
}
