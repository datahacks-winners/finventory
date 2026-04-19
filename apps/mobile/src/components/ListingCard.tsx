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

// Stitch Theme
const colors = {
  surface: '#ffffff',
  surfaceContainer: '#ffeadc',
  onSurface: '#241911',
  onSurfaceVariant: '#404750',
  outline: '#707881',
  outlineVariant: '#c0c7d1',
  primary: '#005f93',
  primaryContainer: '#1e78b4',
  onPrimary: '#ffffff',
  primaryFixed: '#cde5ff',
  secondary: '#8c4f14',
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
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.95}>
      <Image
        source={{ uri: listing.photos[0] || 'https://via.placeholder.com/300' }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Grade Badge - Top Left */}
      <View style={[styles.gradeBadge, { backgroundColor: gradeStyle.bg }]}>
        <Text style={[styles.gradeText, { color: gradeStyle.text }]}>
          {listing.grade === 'sushi' ? 'SUSHI GRADE' : `GRADE ${listing.grade}`}
        </Text>
      </View>

      {/* Favorite Button - Top Right */}
      <TouchableOpacity
        style={styles.favoriteButton}
        onPress={onFavoritePress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>
          {isFavorite ? '★' : '☆'}
        </Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        {/* Species Name */}
        <Text style={styles.species} numberOfLines={1}>
          {listing.species.charAt(0).toUpperCase() + listing.species.slice(1)}
        </Text>

        {/* Details Row */}
        <Text style={styles.details}>
          {listing.location || 'Local Harbor'} • {formatFreshness()}
        </Text>

        {/* Footer Row */}
        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice()}</Text>
          <View style={styles.metaRight}>
            {listing.sellerRating && (
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.rating}>{listing.sellerRating.toFixed(1)}</Text>
              </View>
            )}
            <Text style={styles.distance}>{listing.distance.toFixed(1)} mi</Text>
          </View>
        </View>

        {/* Quantity & Delivery */}
        <View style={styles.bottomRow}>
          <Text style={styles.quantity}>
            {displayQuantity} {listing.unit} available
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
    // Ocean shadow effect
    shadowColor: '#005f93',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
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
    borderRadius: 20,
  },
  gradeText: {
    fontSize: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteIcon: {
    fontSize: 18,
    color: colors.outline,
  },
  favoriteIconActive: {
    color: colors.primary,
  },
  content: {
    padding: 16,
  },
  species: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'Caveat',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  distance: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
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
