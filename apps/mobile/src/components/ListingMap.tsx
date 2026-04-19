import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

/**
 * Placeholder component for map-based listing display
 *
 * Future implementation:
 * - Mapbox GL integration
 * - Listing cluster markers
 * - Grade-based marker colors
 * - Marker tap → listing detail navigation
 * - Region change → update visible listings
 * - User location tracking
 * - Search area visualization
 *
 * Related components:
 * - ListingCard (for selected listing preview)
 * - BrowseScreen (parent, manages map/list toggle)
 */
export const ListingMap: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Map View</Text>
        <Text style={styles.placeholderSubtext}>
          Mapbox GL integration coming soon
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
    margin: 16,
    borderRadius: 8,
    padding: 32,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
