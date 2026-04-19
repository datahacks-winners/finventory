import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ListingWithDistance } from '../types/listing';

interface ListingCardProps {
  listing: ListingWithDistance;
  onFavoritePress: () => void;
  isFavorite: boolean;
}

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

  const getGradeColor = () => {
    switch (listing.grade) {
      case 'sushi':
        return '#3B82F6'; // blue
      case 'A':
        return '#10B981'; // green
      case 'B':
        return '#F59E0B'; // yellow
    }
  };

  const handlePress = () => {
    router.push(`/listing/${listing.id}`);
  };

  const displayQuantity = listing.liveQuantity ?? listing.quantity;

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.9}>
      <Image
        source={{ uri: listing.photos[0] || 'https://via.placeholder.com/300' }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={[styles.gradeBadge, { backgroundColor: getGradeColor() }]}>
        <Text style={styles.gradeText}>{listing.grade.toUpperCase()}</Text>
      </View>

      <View style={styles.favoriteButton} onPress={onFavoritePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.favoriteIcon}>{isFavorite ? '♥' : '♡'}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.species} numberOfLines={1}>
          {listing.species.charAt(0).toUpperCase() + listing.species.slice(1)}
        </Text>

        <View style={styles.row}>
          <Text style={styles.price}>{formatPrice()}</Text>
          {listing.sellerRating && (
            <Text style={styles.rating}>⭐ {listing.sellerRating.toFixed(1)}</Text>
          )}
        </View>

        <View style={styles.row}>
          <Text style={styles.distance}>{listing.distance.toFixed(1)} mi away</Text>
          <Text style={styles.freshness}>{formatFreshness()}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.quantity}>{displayQuantity} {listing.unit} remaining</Text>
          {listing.deliveryAvailable && (
            <Text style={styles.deliveryBadge}>🚗 Delivery</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
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
    paddingVertical: 4,
    borderRadius: 6,
  },
  gradeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 20,
    color: '#EF4444',
  },
  content: {
    padding: 12,
  },
  species: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  rating: {
    fontSize: 14,
    color: '#6B7280',
  },
  distance: {
    fontSize: 14,
    color: '#6B7280',
  },
  freshness: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quantity: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  deliveryBadge: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
