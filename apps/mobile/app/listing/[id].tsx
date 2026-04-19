import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Listing } from '../../src/types/listing';
import { fetchListingById } from '../../src/services/listings';
import { useSpeciesInfo } from '../../src/hooks/useINaturalist';
import { INaturalistPanel } from '../../src/components/INaturalistPanel';

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    sushi: '#3B82F6',
    A: '#10B981',
    B: '#F59E0B',
  };
  return (
    <View style={[styles.gradeBadge, { backgroundColor: colors[grade] ?? '#6B7280' }]}>
      <Text style={styles.gradeBadgeText}>{grade.toUpperCase()}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  const speciesInfo = useSpeciesInfo(listing?.species);

  useEffect(() => {
    if (!id) return;
    fetchListingById(id).then((l) => {
      setListing(l);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6B7280" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Listing not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatDate = (ts: { toDate: () => Date }) => {
    const d = ts.toDate();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const photos = listing.photos.length > 0 ? listing.photos : ['https://via.placeholder.com/600x400?text=No+Photo'];

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.floatingBack} onPress={() => router.back()}>
        <Text style={styles.floatingBackText}>←</Text>
      </TouchableOpacity>

      <ScrollView>
        {/* Photo gallery */}
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: photos[photoIndex] }}
            style={styles.photo}
            resizeMode="cover"
          />
          <GradeBadge grade={listing.grade} />
          {photos.length > 1 && (
            <View style={styles.photoDots}>
              {photos.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setPhotoIndex(i)}>
                  <View style={[styles.dot, i === photoIndex && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.species}>
            {listing.species.charAt(0).toUpperCase() + listing.species.slice(1)}
          </Text>
          <Text style={styles.price}>
            ${listing.pricePerUnit}/{listing.unit}
          </Text>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{listing.quantity}</Text>
              <Text style={styles.statLabel}>{listing.unit} available</Text>
            </View>
            {listing.deliveryAvailable && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>Yes</Text>
                <Text style={styles.statLabel}>Delivery</Text>
              </View>
            )}
            <View style={styles.stat}>
              <Text style={styles.statValue}>{listing.grade.toUpperCase()}</Text>
              <Text style={styles.statLabel}>Grade</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <InfoRow label="Freshness Date" value={formatDate(listing.freshnessDate)} />
            <InfoRow label="Expires" value={formatDate(listing.expiresAt)} />
            <InfoRow label="Unit" value={listing.unit} />
            {listing.sushiCertNumber && (
              <InfoRow label="Sushi Cert #" value={listing.sushiCertNumber} />
            )}
            {listing.sushiCertExpiry && (
              <InfoRow label="Cert Expiry" value={formatDate(listing.sushiCertExpiry)} />
            )}
          </View>

          {/* iNaturalist expandable panel */}
          <INaturalistPanel speciesName={listing.species} info={speciesInfo} />

          {/* Spacer for bottom */}
          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  floatingBack: {
    position: 'absolute',
    top: 48,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingBackText: {
    fontSize: 22,
    color: '#111827',
    fontWeight: '600',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 280,
  },
  gradeBadge: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  gradeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  photoDots: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  species: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
