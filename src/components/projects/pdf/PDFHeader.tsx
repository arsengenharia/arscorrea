
import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { styles } from './styles';

export function PDFHeader() {
  return (
    <View style={styles.header}>
      <Image
        src="/lovable-uploads/8458c9e0-f836-458a-a48d-c0191e1cc57d.png"
        style={styles.logo}
      />
      <Text style={styles.headerDate}>
        {format(new Date(), 'dd/MM/yyyy')}
      </Text>
    </View>
  );
}
