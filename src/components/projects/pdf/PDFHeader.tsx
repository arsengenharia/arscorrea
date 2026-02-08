
import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { styles } from './styles';

export function PDFHeader() {
  return (
    <View style={styles.header}>
      <Image
        src="/lovable-uploads/ars-correa-logo.png"
        style={styles.logo}
      />
      <Text style={styles.headerDate}>
        {format(new Date(), 'dd/MM/yyyy')}
      </Text>
    </View>
  );
}
