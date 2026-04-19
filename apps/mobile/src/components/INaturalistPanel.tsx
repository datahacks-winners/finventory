import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { SustainabilityInfo } from '../types/inaturalist';

interface INaturalistPanelProps {
  speciesName: string;
  info: SustainabilityInfo;
  title?: string;
}

export function INaturalistPanel({ speciesName, info, title = 'More about this fish' }: INaturalistPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const taxon = info.taxon;
  const displayName = taxon?.preferred_common_name ?? speciesName;
  const scientificName = taxon?.name ?? '';

  const openINaturalist = () => {
    if (taxon?.id) {
      Linking.openURL(`https://www.inaturalist.org/taxa/${taxon.id}`);
    }
  };

  const openWikipedia = () => {
    if (taxon?.wikipedia_url) {
      Linking.openURL(taxon.wikipedia_url);
    }
  };

  return (
    <View style={styles.container}>
      {/* Collapsed header — always visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerLabel}>{title}</Text>
          {info.loading ? (
            <ActivityIndicator size="small" color="#4B5563" style={styles.spinner} />
          ) : (
            <View style={[styles.badge, { backgroundColor: info.statusColor }]}>
              <Text style={styles.badgeText}>{info.iucnCode}</Text>
            </View>
          )}
          {!info.loading && (
            <Text style={[styles.statusText, { color: info.statusColor }]}>
              {info.statusLabel}
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Expanded panel */}
      {expanded && (
        <View style={styles.body}>
          {info.loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="large" color="#6B7280" />
              <Text style={styles.loadingText}>Loading species data…</Text>
            </View>
          ) : info.error ? (
            <Text style={styles.errorText}>Could not load species data.</Text>
          ) : !taxon ? (
            <Text style={styles.errorText}>
              No iNaturalist data found for &quot;{speciesName}&quot;.
            </Text>
          ) : (
            <>
              {/* Hero photo */}
              {(taxon.default_photo?.medium_url || taxon.taxon_photos?.[0]?.photo.medium_url) && (
                <View style={styles.heroWrapper}>
                  <Image
                    source={{ uri: taxon.default_photo?.medium_url ?? taxon.taxon_photos![0].photo.medium_url }}
                    style={styles.heroPhoto}
                    resizeMode="cover"
                  />
                  {(taxon.default_photo?.attribution ?? taxon.taxon_photos?.[0]?.photo.attribution) ? (
                    <Text style={styles.heroAttribution} numberOfLines={1}>
                      {taxon.default_photo?.attribution ?? taxon.taxon_photos![0].photo.attribution}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Additional photos */}
              {taxon.taxon_photos && taxon.taxon_photos.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photoScroll}
                >
                  {taxon.taxon_photos.slice(1, 6).map((tp, i) => (
                    <View key={i} style={styles.photoWrapper}>
                      <Image
                        source={{ uri: tp.photo.medium_url }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Names */}
              <Text style={styles.commonName}>{displayName}</Text>
              {scientificName ? (
                <Text style={styles.sciName}>{scientificName}</Text>
              ) : null}

              {/* Conservation row */}
              <View style={[styles.conservationRow, { borderLeftColor: info.statusColor }]}>
                <Text style={styles.conservationLabel}>Conservation Status</Text>
                <View style={[styles.badge, { backgroundColor: info.statusColor }]}>
                  <Text style={styles.badgeText}>{info.iucnCode}</Text>
                </View>
                <Text style={[styles.conservationStatus, { color: info.statusColor }]}>
                  {info.statusLabel}
                </Text>
              </View>

              {/* Source description */}
              {taxon.conservation_status?.source_description ? (
                <Text style={styles.sourceDesc}>
                  {taxon.conservation_status.source_description}
                </Text>
              ) : null}

              {/* Wikipedia summary */}
              {taxon.wikipedia_summary ? (
                <View style={styles.wikiSection}>
                  <Text style={styles.sectionLabel}>About</Text>
                  <Text style={styles.wikiText} numberOfLines={5}>
                    {taxon.wikipedia_summary
                      .replace(/<[^>]+>/g, '') // strip any HTML
                      .trim()}
                  </Text>
                </View>
              ) : null}

              {/* Observation count */}
              {taxon.observations_count !== undefined && (
                <Text style={styles.observationCount}>
                  {taxon.observations_count.toLocaleString()} observations recorded on iNaturalist
                </Text>
              )}

              {/* Links */}
              <View style={styles.links}>
                <TouchableOpacity style={styles.linkButton} onPress={openINaturalist}>
                  <Text style={styles.linkButtonText}>View on iNaturalist</Text>
                </TouchableOpacity>
                {taxon.wikipedia_url ? (
                  <TouchableOpacity style={[styles.linkButton, styles.linkButtonSecondary]} onPress={openWikipedia}>
                    <Text style={[styles.linkButtonText, styles.linkButtonSecondaryText]}>Wikipedia</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  spinner: {
    marginLeft: 4,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  chevron: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingVertical: 12,
    textAlign: 'center',
  },
  heroWrapper: {
    marginHorizontal: -16,
    marginTop: 12,
    marginBottom: 4,
  },
  heroPhoto: {
    width: '100%',
    height: 220,
  },
  heroAttribution: {
    fontSize: 10,
    color: '#9CA3AF',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  photoScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  photoWrapper: {
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    width: 100,
  },
  photo: {
    width: 100,
    height: 72,
    borderRadius: 8,
  },
  photoAttribution: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2,
    maxWidth: 100,
  },
  commonName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
    marginBottom: 2,
  },
  sciName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6B7280',
    marginBottom: 12,
  },
  conservationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  conservationLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  conservationStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  sourceDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: 18,
  },
  wikiSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  wikiText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  observationCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  links: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  linkButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#14532D',
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  linkButtonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  linkButtonSecondaryText: {
    color: '#374151',
  },
});
