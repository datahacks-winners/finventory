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

const COMMON_FAVORITES = new Set<string>(); // In real app, fetch from Firestore

export default function BrowseScreen() {
  const { viewMode, setViewMode } = useBrowseStore();
  const { listings, loading, error, refetch } = useListings();
  const { permissionStatus, loading: locationLoading } = useUserLocation();
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
        // TODO: Remove from Firestore
      } else {
        next.add(listingId);
        // TODO: Add to Firestore
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse Listings</Text>
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
              {viewMode === 'grid' ? '🗺️ Map' : '🔲 Grid'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Permission Banner */}
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
          {loading || locationLoading ? (
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

      {/* Filter Sheet */}
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  viewToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  banner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
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
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: '#111827',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
