import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { ListingWithDistance } from '../types/listing';
import { FirestoreService } from '../services/firebase/firestore';

const { width } = Dimensions.get('window');

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
  onSecondary: '#ffffff',
  error: '#ba1a1a',
  success: '#2e7d32',
};

const gradeColors = {
  sushi: { bg: '#005f93', text: '#ffffff' },
  A: { bg: '#1e78b4', text: '#f7f9ff' },
  B: { bg: '#fdac6a', text: '#773e01' },
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAnonymous } = useAuth();

  const [listing, setListing] = useState<ListingWithDistance | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    loadListing();
  }, [id]);

  const loadListing = async () => {
    try {
      const data = await FirestoreService.getListing(id);
      setListing(data as ListingWithDistance);
    } catch {
      Alert.alert('Error', 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (isAnonymous) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to purchase',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth') }
        ]
      );
      return;
    }

    if (!listing || purchaseQty > listing.quantity) {
      Alert.alert('Error', 'Quantity exceeds available amount');
      return;
    }

    setPurchasing(true);
    try {
      await FirestoreService.createOrder({
        listingId: listing.id,
        buyerId: user!.uid,
        sellerId: listing.sellerId,
        quantity: purchaseQty,
        totalPrice: purchaseQty * listing.pricePerUnit,
        status: 'pending',
        createdAt: new Date(),
      });
      Alert.alert(
        'Order Placed!',
        `Your order for ${purchaseQty} ${listing.unit} of ${listing.species} has been submitted.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const formatFreshness = () => {
    if (!listing) return '';
    const now = new Date();
    const freshness = listing.freshnessDate.toDate();
    const hoursDiff = Math.floor((now.getTime() - freshness.getTime()) / (1000 * 60 * 60));

    if (hoursDiff < 1) return 'Caught within the hour';
    if (hoursDiff < 24) return `Caught ${hoursDiff} hours ago`;
    const daysDiff = Math.floor(hoursDiff / 24);
    if (daysDiff === 1) return 'Caught yesterday';
    return `Caught ${daysDiff} days ago`;
  };

  const getGradeColors = () => {
    if (!listing) return gradeColors.B;
    return gradeColors[listing.grade as keyof typeof gradeColors] || gradeColors.B;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Listing not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gradeStyle = getGradeColors();
  const totalPrice = (purchaseQty * listing.pricePerUnit).toFixed(2);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{listing.species}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {listing.photos.length > 0 ? (
              listing.photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))
            ) : (
              <View style={[styles.image, styles.noImage]}>
                <Text style={styles.noImageText}>🐟</Text>
              </View>
            )}
          </ScrollView>

          {/* Grade Badge */}
          <View style={[styles.gradeBadge, { backgroundColor: gradeStyle.bg }]}>
            <Text style={[styles.gradeText, { color: gradeStyle.text }]}>
              {listing.grade === 'sushi' ? 'SUSHI GRADE' : `GRADE ${listing.grade}`}
            </Text>
          </View>

          {/* Image Indicators */}
          {listing.photos.length > 1 && (
            <View style={styles.imageIndicators}>
              {listing.photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === activeImageIndex && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.species}>{listing.species}</Text>
            <Text style={styles.distance}>{listing.distance.toFixed(1)} mi away</Text>
          </View>

          {/* Freshness */}
          <View style={styles.freshnessBadge}>
            <Text style={styles.freshnessText}>⚡ {formatFreshness()}</Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>${listing.pricePerUnit.toFixed(2)}</Text>
            <Text style={styles.priceUnit}>/{listing.unit}</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{listing.quantity}</Text>
              <Text style={styles.statLabel}>{listing.unit} available</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {listing.deliveryAvailable ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.statLabel}>Delivery</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {listing.sellerRating?.toFixed(1) || 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Seller Rating</Text>
            </View>
          </View>

          {/* Sushi Cert */}
          {listing.grade === 'sushi' && listing.sushiCertNumber && (
            <View style={styles.certCard}>
              <Text style={styles.certTitle}>🎖️ Sushi Certification</Text>
              <Text style={styles.certText}>Cert: {listing.sushiCertNumber}</Text>
              {listing.sushiCertExpiry && (
                <Text style={styles.certText}>
                  Expires: {listing.sushiCertExpiry.toDate().toLocaleDateString()}
                </Text>
              )}
            </View>
          )}

          {/* Purchase Section */}
          <View style={styles.purchaseCard}>
            <Text style={styles.purchaseTitle}>Purchase</Text>

            {/* Quantity Selector */}
            <View style={styles.qtySection}>
              <Text style={styles.qtyLabel}>Quantity ({listing.unit})</Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setPurchaseQty(Math.max(1, purchaseQty - 1))}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.qtyInput}
                  value={String(purchaseQty)}
                  onChangeText={(text) => {
                    const val = parseInt(text) || 0;
                    setPurchaseQty(Math.min(listing.quantity, Math.max(1, val)));
                  }}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setPurchaseQty(Math.min(listing.quantity, purchaseQty + 1))}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.maxQty}>Max: {listing.quantity} {listing.unit}</Text>
            </View>

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>${totalPrice}</Text>
            </View>

            {/* Purchase Button */}
            <TouchableOpacity
              style={[styles.purchaseBtn, purchasing && styles.purchaseBtnDisabled]}
              onPress={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.purchaseBtnText}>
                  {isAnonymous ? 'Sign In to Purchase' : 'Place Order'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 320,
  },
  image: {
    width: width,
    height: 320,
  },
  noImage: {
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    fontSize: 64,
  },
  gradeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  indicatorActive: {
    backgroundColor: '#ffffff',
    width: 24,
  },
  content: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  species: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.onSurface,
    textTransform: 'capitalize',
    flex: 1,
  },
  distance: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  freshnessBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  freshnessText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'Caveat',
  },
  priceUnit: {
    fontSize: 18,
    color: colors.onSurfaceVariant,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'Caveat',
  },
  statLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: '500',
  },
  certCard: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  certTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
  },
  certText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  purchaseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  purchaseTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: 16,
  },
  qtySection: {
    marginBottom: 20,
  },
  qtyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 12,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  qtyBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  qtyInput: {
    width: 80,
    height: 48,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  maxQty: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  totalPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'Caveat',
  },
  purchaseBtn: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  purchaseBtnDisabled: {
    opacity: 0.7,
  },
  purchaseBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  bottomPadding: {
    height: 40,
  },
});
