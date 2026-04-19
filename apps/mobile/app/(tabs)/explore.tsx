import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function StandingOrdersScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Standing Orders</ThemedText>
      <ThemedText style={styles.subtitle}>
        Set up automatic orders for your regular needs
      </ThemedText>

      {/* TODO: Add standing order criteria creation */}
      {/* TODO: Add match queue display */}
      {/* TODO: Add order history */}
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
