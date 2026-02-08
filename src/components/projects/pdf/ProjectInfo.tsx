
import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { styles } from './styles';
import type { Project } from './types';

const formatDate = (date: string | null) => {
  if (!date) return 'Não definida';
  return format(new Date(date), 'dd/MM/yyyy');
};

export function ProjectInfo({ project }: { project: Project }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Informações do Projeto</Text>
      <Text style={styles.text}>
        <Text style={styles.label}>Status: </Text>
        {project.status}
      </Text>
      <Text style={styles.text}>
        <Text style={styles.label}>Data de Início: </Text>
        {formatDate(project.start_date)}
      </Text>
      <Text style={styles.text}>
        <Text style={styles.label}>Data de Conclusão: </Text>
        {formatDate(project.end_date)}
      </Text>
      {project.description && (
        <Text style={styles.text}>
          <Text style={styles.label}>Descrição: </Text>
          {project.description}
        </Text>
      )}
      {project.project_manager && (
        <Text style={styles.text}>
          <Text style={styles.label}>Gestor da Obra: </Text>
          {project.project_manager}
        </Text>
      )}
    </View>
  );
}
