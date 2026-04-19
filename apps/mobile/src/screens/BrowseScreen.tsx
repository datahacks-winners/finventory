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
import { SustainabilityRecommendations } from '../components/SustainabilityRecommendations';
import { useAuth } from '../hooks/useAuth';
import { useSustainabilityRecommendations } from '../hooks/useINaturalist';

const COMMON_FAVORITES = new Set<string>();

// Stitch Theme
const colors = {
  surface: '#fff8f5',
  surfaceContainer: '#ffeadc',
  surfaceContainerLow: '#fff1e9',
  surfaceContainerHigh: '#f9e4d7',
  onSurface: '#241911',
  onSurfaceVariant: '#404750',
  outline: '#707881',
  outlineVariant: '#c0c7d1',
  primary: '#005f93',
  primaryContainer: '#1e78b4',
  onPrimary: '#ffffff',
  primaryFixed: '#cde5ff',
  secondary: '#8c4f14',
  secondaryContainer: '#fdac6a',
};

export default function BrowseScreen() {
  const { viewMode, setViewMode } = useBrowseStore();
  const { listings, loading, error, refetch } = useListings();
  const { permissionStatus } = useUserLocation();
  const { isAnonymous } = useAuth();

  const [filterVisible, setFilterVisible] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(COMMON_FAVORITES);

  const { recommendations, loading: recLoading } = useSustainabilityRecommendations(listings);

  const handleSpeciesFilter = (species: string) => {
    // Tapping a recommendation card filters browse by that species
    useBrowseStore.getState().setFilters({ species: [species] });
  };

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
      {/* Header - White with Logo */}
      <View style={styles.header}>
        <Text style={styles.logo}>Finventory</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setFilterVisible(true)}
          >
            <Text style={styles.icon}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')}
          >
            <Text style={styles.viewToggleText}>
              {viewMode === 'grid' ? '🗺️ Map' : '🔲 List'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Marketplace</Text>
        <Text style={styles.heroTitle}>Rescue the catch. Feed the coast.</Text>
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

      {/* Location Banner */}
      {permissionStatus === 'denied' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Enable location to see listings near you
          </Text>
        </View>
      )}

      {/* Sustainability Recommendations */}
      {viewMode === 'grid' && (
        <SustainabilityRecommendations
          recommendations={recommendations}
          loading={recLoading}
          onSpeciesPress={handleSpeciesFilter}
        />
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
          {/* Section Label */}
          <Text style={styles.sectionLabel}>Fresh from the nets</Text>
          <Text style={styles.sectionTitle}>Available listings</Text>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  logo: {
    fontFamily: 'Caveat',
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  viewToggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  heroLabel: {
    fontFamily: 'Caveat',
    fontSize: 22,
    color: colors.primaryFixed,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.onPrimary,
    letterSpacing: -0.02,
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.primaryFixed,
    marginTop: 8,
    opacity: 0.9,
    lineHeight: 20,
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
    fontWeight: '800',
    color: colors.onPrimary,
    fontFamily: 'Caveat',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryFixed,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
    opacity: 0.8,
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
  sectionLabel: {
    fontFamily: 'Caveat',
    fontSize: 20,
    color: colors.primary,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.02,
    marginBottom: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.surface,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
