import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function BrowseScreen() {

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Browse Listings</ThemedText>
      <ThemedText style={styles.subtitle}>
        Fresh seafood from local sellers near you
      </ThemedText>

      {/* TODO: Add map/list toggle */}
      {/* TODO: Add filter sheet */}
      {/* TODO: Add listing cards with grade badges */}
      {/* TODO: Integrate Mapbox for map view */}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    opacity: 0.7,
  },
});
