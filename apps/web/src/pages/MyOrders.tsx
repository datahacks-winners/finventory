import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { subscribeToMyOrders, type Order, cancelOrder } from '../services/orders'
import { getFallbackUrl } from '../services/pexels'

function formatDate(ts: { toDate: () => Date }): string {
  return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'picked_up':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function OrderCard({
  order,
  onCancel,
}: {
  order: Order
  onCancel: (orderId: string) => void
}) {
  const photo = order.listing?.photos?.[0] || getFallbackUrl(order.listing?.species || 'fish')

  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden ocean-shadow border border-outline-variant/10">
      <div className="flex">
        <div className="w-32 h-32 flex-shrink-0">
          <img src={photo} alt={order.listing?.species} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-xl font-bold capitalize">{order.listing?.species || 'Unknown'}</h3>
              <p className="text-sm text-outline">{order.listing?.grade.toUpperCase()} Grade</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(order.status)}`}
            >
              {order.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <span className="text-outline">
              <span className="font-bold text-on-surface">{order.quantity}</span> lbs
            </span>
            <span className="text-outline">
              <span className="font-bold text-on-surface">${order.totalPrice.toFixed(2)}</span> total
            </span>
            <span className="text-outline capitalize">
              {order.deliveryOption === 'delivery' ? '🚚 Delivery' : '📍 Pickup'}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-outline">
              Ordered {formatDate(order.createdAt)}
            </div>

            {order.status === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => onCancel(order.id)}
                  className="text-sm text-error font-bold hover:underline"
                >
                  Cancel
                </button>
                <span className="text-outline-variant">|</span>
                <span className="text-sm font-mono bg-surface-container px-2 py-1 rounded">{order.pickupQRCode.slice(-8)}</span>
              </div>
            )}

            {order.status === 'picked_up' && (
              <span className="text-sm text-emerald-600 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Picked up {order.pickedUpAt ? formatDate(order.pickedUpAt) : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyOrders() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [_cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const unsubscribe = subscribeToMyOrders(user.uid, (fetchedOrders) => {
      setOrders(fetchedOrders)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleCancel = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return

    setCancellingId(orderId)
    try {
      await cancelOrder(orderId)
    } catch {
      alert('Failed to cancel order. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  if (!user) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">My Orders</h1>
          <p className="text-outline mb-6">Please sign in to view your orders</p>
          <button
            onClick={() => navigate('/auth', { state: { from: '/orders' } })}
            className="bg-primary text-white px-8 py-3 rounded-full font-bold"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const completedOrders = orders.filter((o) => o.status === 'picked_up')
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled')

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="italic-accent-caveat text-2xl text-secondary block">Your Activity</span>
            <h1 className="text-4xl font-black text-primary">My Orders</h1>
          </div>
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:scale-[1.02] transition-transform flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            New Order
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-outline">Loading orders...</p>
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16 bg-surface-container-low rounded-xl">
            <span className="material-symbols-outlined text-6xl text-outline/30 mb-4">receipt_long</span>
            <h2 className="text-2xl font-bold text-on-surface mb-2">No orders yet</h2>
            <p className="text-outline mb-6">Start browsing to find fresh catch near you</p>
            <button
              onClick={() => navigate('/marketplace')}
              className="text-primary font-bold hover:underline"
            >
              Browse Marketplace →
            </button>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="space-y-8">
            {pendingOrders.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-outline uppercase tracking-widest mb-4">
                  Pending ({pendingOrders.length})
                </h2>
                <div className="space-y-4">
                  {pendingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              </section>
            )}

            {completedOrders.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-outline uppercase tracking-widest mb-4">
                  Completed ({completedOrders.length})
                </h2>
                <div className="space-y-4">
                  {completedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onCancel={() => {}} />
                  ))}
                </div>
              </section>
            )}

            {cancelledOrders.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-outline uppercase tracking-widest mb-4 opacity-50">
                  Cancelled ({cancelledOrders.length})
                </h2>
                <div className="space-y-4 opacity-60">
                  {cancelledOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onCancel={() => {}} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
