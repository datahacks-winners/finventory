import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { FirestoreService } from '../services/firebase/firestore';

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
  success: '#2e7d32',
  error: '#ba1a1a',
  warning: '#f57c00',
};

type OrderStatus = 'pending' | 'confirmed' | 'picked_up' | 'completed' | 'cancelled';

interface Order {
  id: string;
  listingId: string;
  sellerId: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: { toDate: () => Date };
  listingSpecies?: string;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: colors.warning, bg: '#fff3e0', icon: '⏳' },
  confirmed: { label: 'Confirmed', color: colors.primary, bg: colors.primaryFixed, icon: '✓' },
  picked_up: { label: 'Picked Up', color: colors.success, bg: '#e8f5e9', icon: '📦' },
  completed: { label: 'Completed', color: colors.success, bg: '#e8f5e9', icon: '★' },
  cancelled: { label: 'Cancelled', color: colors.error, bg: '#ffebee', icon: '✕' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const { user, isAnonymous } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const loadOrders = useCallback(async () => {
    if (!user) return;
    try {
      const data = await FirestoreService.getUserOrders(user.uid, true);
      setOrders(data as Order[]);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAnonymous) {
      setLoading(false);
      return;
    }
    loadOrders();
  }, [loadOrders, isAnonymous]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleOrderPress = (order: Order) => {
    router.push(`/order/${order.id}`);
  };

  const handleBrowse = () => {
    router.push('/');
  };

  const handleSignIn = () => {
    router.push('/auth');
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'active') {
      return ['pending', 'confirmed', 'picked_up'].includes(order.status);
    }
    return ['completed', 'cancelled'].includes(order.status);
  });

  const formatDate = (date: { toDate: () => Date }) => {
    if (!date) return '';
    return date.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🐟</Text>
      <Text style={styles.emptyTitle}>No orders yet</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'active'
          ? "You don't have any active orders. Browse listings to get started!"
          : "Your completed orders will appear here."}
      </Text>
      {activeTab === 'active' && (
        <TouchableOpacity style={styles.browseButton} onPress={handleBrowse}>
          <Text style={styles.browseButtonText}>Browse Listings</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isAnonymous) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Finventory</Text>
        </View>

        <View style={styles.anonymousContainer}>
          <Text style={styles.anonymousIcon}>🔒</Text>
          <Text style={styles.anonymousTitle}>Sign In Required</Text>
          <Text style={styles.anonymousText}>
            Please sign in to view your orders and track your purchases.
          </Text>
          <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Finventory</Text>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Your Activity</Text>
        <Text style={styles.heroTitle}>Orders</Text>
        <Text style={styles.heroSubtitle}>
          Track your purchases and order history
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({orders.filter(o => ['pending', 'confirmed', 'picked_up'].includes(o.status)).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History ({orders.filter(o => ['completed', 'cancelled'].includes(o.status)).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredOrders.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredOrders.map(order => {
              const status = statusConfig[order.status];
              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => handleOrderPress(order)}
                >
                  {/* Order Header */}
                  <View style={styles.orderHeader}>
                    <View style={styles.orderIconContainer}>
                      <Text style={styles.orderIcon}>🐟</Text>
                    </View>
                    <View style={styles.orderMeta}>
                      <Text style={styles.orderTitle}>
                        {order.listingSpecies || 'Seafood Order'}
                      </Text>
                      <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {status.icon} {status.label}
                      </Text>
                    </View>
                  </View>

                  {/* Order Details */}
                  <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Quantity</Text>
                      <Text style={styles.detailValue}>{order.quantity}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total</Text>
                      <Text style={[styles.detailValue, styles.priceValue]}>
                        ${order.totalPrice.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Action Button */}
                  {order.status === 'pending' && (
                    <View style={styles.actionBar}>
                      <Text style={styles.actionText}>Waiting for seller confirmation</Text>
                    </View>
                  )}
                  {order.status === 'confirmed' && (
                    <View style={styles.actionBar}>
                      <Text style={styles.actionText}>Ready for pickup! Contact seller for details.</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
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
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.primaryFixed,
    marginTop: 6,
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIcon: {
    fontSize: 24,
  },
  orderMeta: {
    flex: 1,
    marginLeft: 12,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  orderDate: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderDetails: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  priceValue: {
    color: colors.primary,
    fontFamily: 'Caveat',
    fontSize: 16,
  },
  actionBar: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  actionText: {
    fontSize: 13,
    color: colors.secondary,
    fontStyle: 'italic',
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
  emptyText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 32,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  anonymousContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  anonymousIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  anonymousTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
  },
  anonymousText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  bottomPadding: {
    height: 40,
  },
});
