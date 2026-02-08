
import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import type { Client } from './types';

export function ClientInfo({ client }: { client?: Client }) {
  if (!client) return null;
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Informações do Cliente</Text>
      <Text style={styles.text}>
        <Text style={styles.label}>Nome: </Text>
        {client.name}
      </Text>
      {client.document && (
        <Text style={styles.text}>
          <Text style={styles.label}>Documento: </Text>
          {client.document}
        </Text>
      )}
      {client.email && (
        <Text style={styles.text}>
          <Text style={styles.label}>Email: </Text>
          {client.email}
        </Text>
      )}
      {client.phone && (
        <Text style={styles.text}>
          <Text style={styles.label}>Telefone: </Text>
          {client.phone}
        </Text>
      )}
      {client.responsible && (
        <Text style={styles.text}>
          <Text style={styles.label}>Responsável: </Text>
          {client.responsible}
        </Text>
      )}
    </View>
  );
}
