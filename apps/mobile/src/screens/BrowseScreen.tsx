import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useBrowseStore } from '../stores/browseStore';
import { useListings } from '../hooks/useListings';
import { useUserLocation } from '../hooks/useUserLocation';
import { ListingCard } from '../components/ListingCard';
import { ListingCardSkeleton } from '../components/ListingCardSkeleton';
import { FilterSheet } from '../components/FilterSheet';
import { ListingMap } from '../components/ListingMap';
import { useAuth } from '../hooks/useAuth';

const COMMON_FAVORITES = new Set<string>();

export default function BrowseScreen() {
  const { viewMode, setViewMode } = useBrowseStore();
  const { listings, loading, error, refetch } = useListings();
  const { permissionStatus } = useUserLocation();
  const { isAnonymous } = useAuth();

  const [filterVisible, setFilterVisible] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(COMMON_FAVORITES);

  const handleFavoritePress = (listingId: string) => {
    if (isAnonymous) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save favorites',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth') }
        ]
      );
      return;
    }

    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(listingId)) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });
  };

  const handleListingPress = (listingId: string) => {
    router.push(`/listing/${listingId}`);
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero Header - Stitch Style */}
      <View style={styles.heroHeader}>
        <Text style={styles.heroTitle}>
          Rescue the <Text style={styles.accentText}>catch</Text>.
        </Text>
        <Text style={styles.heroTitle}>Feed the coast.</Text>
        <Text style={styles.heroSubtitle}>
          Connect directly with local fleets to source surplus seafood that would otherwise be lost.
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>12,400 lb</Text>
            <Text style={styles.statLabel}>rescued</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>180+</Text>
            <Text style={styles.statLabel}>harbors</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>32%</Text>
            <Text style={styles.statLabel}>savings</Text>
          </View>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterVisible(true)}
        >
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')}
        >
          <Text style={styles.viewToggleText}>
            {viewMode === 'grid' ? 'Map View' : 'List View'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Banner */}
      {permissionStatus === 'denied' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Enable location to see listings near you
          </Text>
        </View>
      )}

      {/* Content */}
      {viewMode === 'grid' ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} />
          }
        >
          {loading ? (
            <>
              <ListingCardSkeleton />
              <ListingCardSkeleton />
              <ListingCardSkeleton />
            </>
          ) : listings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🐟</Text>
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.emptyMessage}>
                Try adjusting your filters or expanding your search distance
              </Text>
            </View>
          ) : (
            listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onFavoritePress={() => handleFavoritePress(listing.id)}
                isFavorite={favorites.has(listing.id)}
              />
            ))
          )}
        </ScrollView>
      ) : (
        <ListingMap
          listings={listings}
          userLocation={useBrowseStore.getState().userLocation}
          onListingPress={handleListingPress}
        />
      )}

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
      />
    </View>
  );
}

// Stitch Theme Colors
const colors = {
  background: '#fff8f5',
  surface: '#fff8f5',
  surfaceContainer: '#ffeadc',
  surfaceContainerLow: '#fff1e9',
  surfaceContainerHigh: '#f9e4d7',
  surfaceVariant: '#f3dfd1',
  primary: '#005f93',
  primaryContainer: '#1e78b4',
  onPrimary: '#ffffff',
  onSurface: '#241911',
  onSurfaceVariant: '#404750',
  outline: '#707881',
  outlineVariant: '#c0c7d1',
  secondary: '#8c4f14',
  secondaryContainer: '#fdac6a',
  error: '#ba1a1a',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.02,
    lineHeight: 40,
  },
  accentText: {
    fontFamily: 'Caveat',
    fontWeight: '700',
    color: colors.primary,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    marginTop: 12,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 24,
  },
  stat: {
    flexDirection: 'column',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  viewToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  banner: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerText: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
