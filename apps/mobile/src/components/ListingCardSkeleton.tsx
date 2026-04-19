import React from 'react';
import { View, StyleSheet } from 'react-native';

export function ListingCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.imagePlaceholder} />
      <View style={styles.content}>
        <View style={styles.titlePlaceholder} />
        <View style={styles.row}>
          <View style={[styles.textPlaceholder, { width: 80 }]} />
          <View style={[styles.textPlaceholder, { width: 60 }]} />
        </View>
        <View style={styles.row}>
          <View style={[styles.textPlaceholder, { width: 100 }]} />
          <View style={[styles.textPlaceholder, { width: 80 }]} />
        </View>
        <View style={styles.footer}>
          <View style={[styles.textPlaceholder, { width: 120 }]} />
          <View style={styles.badgePlaceholder} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#E5E7EB',
  },
  content: {
    padding: 12,
  },
  titlePlaceholder: {
    width: '60%',
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  textPlaceholder: {
    height: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  badgePlaceholder: {
    width: 70,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
});
