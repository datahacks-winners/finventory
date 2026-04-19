import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SpeciesRecommendation, SustainabilityLevel } from '../types/inaturalist';

interface SustainabilityRecommendationsProps {
  recommendations: SpeciesRecommendation[];
  loading: boolean;
  onSpeciesPress?: (species: string) => void;
}

const LEVEL_LABELS: Record<SustainabilityLevel, string> = {
  safe: 'Safe Choice',
  caution: 'Use Caution',
  avoid: 'Avoid',
  unknown: 'Unknown',
};

export function SustainabilityRecommendations({
  recommendations,
  loading,
  onSpeciesPress,
}: SustainabilityRecommendationsProps) {
  if (!loading && recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Sustainability Guide</Text>
        <Text style={styles.subtitle}>Least harmful first</Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#6B7280" />
          <Text style={styles.loadingText}>Loading species data…</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {recommendations.map(({ species, info, listingCount }) => (
            <TouchableOpacity
              key={species}
              style={styles.card}
              onPress={() => onSpeciesPress?.(species)}
              activeOpacity={0.8}
            >
              {/* Coloured top bar */}
              <View style={[styles.topBar, { backgroundColor: info.statusColor }]} />

              <View style={styles.cardBody}>
                {/* IUCN badge */}
                <View style={[styles.badge, { borderColor: info.statusColor }]}>
                  <Text style={[styles.badgeText, { color: info.statusColor }]}>
                    {info.iucnCode}
                  </Text>
                </View>

                {/* Species name */}
                <Text style={styles.speciesName} numberOfLines={2}>
                  {species.charAt(0).toUpperCase() + species.slice(1)}
                </Text>

                {/* Scientific name */}
                {info.taxon?.name ? (
                  <Text style={styles.sciName} numberOfLines={1}>
                    {info.taxon.name}
                  </Text>
                ) : null}

                {/* Status label */}
                <Text style={[styles.levelLabel, { color: info.statusColor }]}>
                  {LEVEL_LABELS[info.level]}
                </Text>

                {/* Listing count */}
                <Text style={styles.listingCount}>
                  {listingCount} {listingCount === 1 ? 'listing' : 'listings'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={styles.disclaimer}>
        Conservation status from IUCN Red List via iNaturalist
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingRight: 24,
    gap: 10,
  },
  card: {
    width: 130,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  topBar: {
    height: 5,
  },
  cardBody: {
    padding: 10,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  speciesName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
  },
  sciName: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#9CA3AF',
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  listingCount: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 10,
    color: '#D1D5DB',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
