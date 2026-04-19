import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { FirestoreService } from '../../src/services/firebase/firestore';

const colors = {
  surface: '#fff8f5',
  surfaceContainer: '#ffeadc',
  onSurface: '#241911',
  onSurfaceVariant: '#404750',
  primary: '#005f93',
  onPrimary: '#ffffff',
  success: '#2e7d32',
  warning: '#f57c00',
  error: '#ba1a1a',
};

type OrderStatus = 'pending' | 'confirmed' | 'picked_up' | 'completed' | 'cancelled';

interface Order {
  id: string;
  status: OrderStatus;
  quantity: number;
  totalPrice: number;
  createdAt?: { toDate: () => Date };
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: string; desc: string }> = {
  pending: { label: 'Pending', color: colors.warning, icon: '⏳', desc: 'Waiting for seller confirmation' },
  confirmed: { label: 'Confirmed', color: colors.primary, icon: '✓', desc: 'Order confirmed by seller' },
  picked_up: { label: 'Picked Up', color: colors.success, icon: '📦', desc: 'Order has been picked up' },
  completed: { label: 'Completed', color: colors.success, icon: '★', desc: 'Order completed' },
  cancelled: { label: 'Cancelled', color: colors.error, icon: '✕', desc: 'Order was cancelled' },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const data = await FirestoreService.getUserOrders('');
      const found = data.find((o) => o.id === id) as Order | undefined;
      setOrder(found || null);
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, { borderColor: status.color }]}>
          <Text style={[styles.statusIcon, { color: status.color }]}>{status.icon}</Text>
          <View>
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            <Text style={styles.statusDesc}>{status.desc}</Text>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue}>{order.id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quantity</Text>
            <Text style={styles.infoValue}>{order.quantity}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total</Text>
            <Text style={[styles.infoValue, styles.priceValue]}>${order.totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Placed on</Text>
            <Text style={styles.infoValue}>
              {order.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Contact Seller */}
        {order.status !== 'cancelled' && (
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>📞 Contact Seller</Text>
          </TouchableOpacity>
        )}

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
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  statusIcon: {
    fontSize: 32,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '800',
  },
  statusDesc: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  priceValue: {
    color: colors.primary,
    fontFamily: 'Caveat',
    fontSize: 18,
  },
  contactButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  bottomPadding: {
    height: 40,
  },
});
