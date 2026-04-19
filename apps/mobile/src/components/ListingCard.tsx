import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ListingWithDistance } from '../types/listing';

interface ListingCardProps {
  listing: ListingWithDistance;
  onFavoritePress: () => void;
  isFavorite: boolean;
}

// Stitch MD3 Grade Colors
const gradeColors = {
  sushi: {
    bg: '#005f93',
    text: '#ffffff',
  },
  A: {
    bg: '#1e78b4',
    text: '#f7f9ff',
  },
  B: {
    bg: '#fdac6a',
    text: '#773e01',
  },
  C: {
    bg: '#c5a952',
    text: '#4e3e00',
  },
};

// Stitch Theme Colors
const colors = {
  surface: '#fff8f5',
  surfaceContainer: '#ffeadc',
  onSurface: '#241911',
  onSurfaceVariant: '#404750',
  outline: '#707881',
  outlineVariant: '#c0c7d1',
  primary: '#005f93',
  primaryFixed: '#cde5ff',
  onPrimary: '#ffffff',
};

export function ListingCard({ listing, onFavoritePress, isFavorite }: ListingCardProps) {
  const router = useRouter();

  const formatPrice = () => {
    return `$${listing.pricePerUnit}/${listing.unit}`;
  };

  const formatFreshness = () => {
    const now = new Date();
    const freshness = listing.freshnessDate.toDate();
    const daysDiff = Math.floor((now.getTime() - freshness.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 'Caught today';
    if (daysDiff === 1) return 'Caught yesterday';
    return `Caught ${daysDiff} days ago`;
  };

  const getGradeColors = () => {
    return gradeColors[listing.grade as keyof typeof gradeColors] || gradeColors.B;
  };

  const handlePress = () => {
    router.push(`/listing/${listing.id}`);
  };

  const displayQuantity = listing.liveQuantity ?? listing.quantity;
  const gradeStyle = getGradeColors();

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.9}>
      <Image
        source={{ uri: listing.photos[0] || 'https://via.placeholder.com/300' }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={[styles.gradeBadge, { backgroundColor: gradeStyle.bg }]}>
        <Text style={[styles.gradeText, { color: gradeStyle.text }]}>
          {listing.grade === 'sushi' ? 'SUSHI' : `GRADE ${listing.grade}`}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.favoriteButton} 
        onPress={onFavoritePress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>
          {isFavorite ? '★' : '☆'}
        </Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.species} numberOfLines={1}>
          {listing.species.charAt(0).toUpperCase() + listing.species.slice(1)}
        </Text>

        <View style={styles.row}>
          <Text style={styles.price}>{formatPrice()}</Text>
          {listing.sellerRating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.rating}>{listing.sellerRating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.distance}>{listing.distance.toFixed(1)} mi</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.freshness}>{formatFreshness()}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.quantity}>
            {displayQuantity} {listing.unit} avail
          </Text>
          {listing.deliveryAvailable && (
            <View style={styles.deliveryBadge}>
              <Text style={styles.deliveryText}>Delivery</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    // Glass effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 180,
  },
  gradeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 248, 245, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  favoriteIcon: {
    fontSize: 18,
    color: colors.outline,
  },
  favoriteIconActive: {
    color: colors.primary,
  },
  content: {
    padding: 14,
    backgroundColor: colors.surface,
  },
  species: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingStar: {
    fontSize: 14,
    color: '#c5a952',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  distance: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  dot: {
    fontSize: 13,
    color: colors.outline,
  },
  freshness: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  quantity: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  deliveryBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
