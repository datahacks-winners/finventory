import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createOrder } from '../services/orders'
import { getFallbackUrl } from '../services/pexels'
import type { ListingWithDistance } from '../services/listings'

interface CartItem {
  listing: ListingWithDistance
  weight: number
  deliveryOption: 'pickup' | 'delivery'
}

const CART_STORAGE_KEY = 'finventory-cart'

function formatDistance(miles: number | undefined): string {
  if (miles === undefined) return ''
  if (miles < 0.1) return '< 0.1 mi'
  return `${miles.toFixed(1)} mi`
}

export default function Checkout() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [placedOrders, setPlacedOrders] = useState<string[]>([])

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY)
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart) as CartItem[]
        // Filter out items without valid IDs
        const valid = parsed.filter(item => item?.listing?.id)
        setCart(valid)
        if (valid.length !== parsed.length) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(valid))
        }
      } catch {
        setCart([])
      }
    }
  }, [])

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { state: { from: '/checkout' } })
    }
  }, [user, authLoading, navigate])

  const updateDeliveryOption = (listingId: string, option: 'pickup' | 'delivery') => {
    setCart(prev => {
      const updated = prev.map(item =>
        item.listing.id === listingId ? { ...item, deliveryOption: option } : item
      )
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const removeItem = (listingId: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.listing.id !== listingId)
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const clearCart = () => {
    localStorage.removeItem(CART_STORAGE_KEY)
    setCart([])
  }

  const placeOrder = async () => {
    if (cart.length === 0) return

    setLoading(true)
    setError(null)
    const orderIds: string[] = []
    const invalidItems: CartItem[] = []

    try {
      for (const item of cart) {
        try {
          console.log('Creating order for listing:', item.listing.id, 'weight:', item.weight)
          const result = await createOrder(
            item.listing.id,
            item.weight,
            item.deliveryOption
          )
          console.log('Order result:', result)
          if (result.success) {
            orderIds.push(result.orderId)
          }
        } catch (err: any) {
          console.error('Order error:', err)
          const msg = err?.message || ''
          const code = err?.code || ''
          // Check for not-found error (Firebase callable returns this as 'not-found' code)
          if (msg.toLowerCase().includes('not found') || 
              msg.toLowerCase().includes('not-found') ||
              code === 'not-found' ||
              code === 'not_found' ||
              err?.details?.includes('Listing not found')) {
            invalidItems.push(item)
          } else {
            throw err // Re-throw other errors
          }
        }
      }

      // Remove invalid items from cart
      if (invalidItems.length > 0) {
        const invalidIds = new Set(invalidItems.map(i => i.listing.id))
        setCart(prev => {
          const updated = prev.filter(item => !invalidIds.has(item.listing.id))
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated))
          return updated
        })
        setError(`${invalidItems.length} item(s) no longer available and removed from cart`)
        setLoading(false)
        return
      }

      if (orderIds.length > 0) {
        setPlacedOrders(orderIds)
        setSuccess(true)
        clearCart()
      }
    } catch (err) {
      console.error('Place order failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.listing.pricePerUnit * item.weight), 0)
  const cartWeight = cart.reduce((sum, item) => sum + item.weight, 0)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-4">Orders Placed!</h1>
            <p className="text-slate-600 mb-2">
              Successfully placed {placedOrders.length} order{placedOrders.length !== 1 ? 's' : ''}.
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Check your email for pickup instructions and QR codes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/orders"
                className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                View My Orders
              </Link>
              <Link
                to="/marketplace"
                className="bg-slate-100 text-slate-700 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Back to Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300">shopping_cart_off</span>
            <h1 className="text-2xl font-bold text-slate-700 mt-4">Your cart is empty</h1>
            <p className="text-slate-500 mt-2 mb-6">Add some fresh fish from the marketplace!</p>
            <Link
              to="/marketplace"
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-black text-slate-900 mb-8">Checkout</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {cart.map((item) => (
            <div key={item.listing.id} className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex gap-4">
                <img
                  src={item.listing.photos?.[0] || getFallbackUrl(item.listing.species.toLowerCase())}
                  alt={item.listing.species}
                  className="w-24 h-24 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 capitalize">{item.listing.species}</h3>
                      <p className="text-slate-500 text-sm">
                        {item.listing.sellerName || 'Local Fisher'} • {item.listing.location.address?.split(',')[0] || 'Local Harbor'}
                      </p>
                      {item.listing.distance !== undefined && (
                        <p className="text-slate-400 text-sm">
                          {formatDistance(item.listing.distance)} away
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.listing.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                      {item.weight} lbs × ${item.listing.pricePerUnit.toFixed(2)}/lb
                    </div>
                    <div className="text-xl font-black text-primary">
                      ${(item.listing.pricePerUnit * item.weight).toFixed(2)}
                    </div>
                  </div>

                  {/* Delivery Options */}
                  <div className="mt-4 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`delivery-${item.listing.id}`}
                        checked={item.deliveryOption === 'pickup'}
                        onChange={() => updateDeliveryOption(item.listing.id, 'pickup')}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm font-medium text-slate-700">Pickup at harbor</span>
                    </label>
                    {item.listing.deliveryAvailable && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`delivery-${item.listing.id}`}
                          checked={item.deliveryOption === 'delivery'}
                          onChange={() => updateDeliveryOption(item.listing.id, 'delivery')}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm font-medium text-slate-700">Delivery available</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Weight:</span>
              <span className="font-medium">{cartWeight} lbs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Items:</span>
              <span className="font-medium">{cart.length}</span>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-4 pt-4">
            <div className="flex justify-between items-end">
              <span className="text-slate-500 font-medium">Total:</span>
              <span className="text-3xl font-black text-slate-900">${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={placeOrder}
            disabled={loading || cart.length === 0}
            className="w-full mt-6 bg-primary text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Placing Order...
              </>
            ) : (
              <>
                Place Order
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>

          <p className="text-xs text-slate-400 text-center mt-4">
            By placing this order, you agree to pick up your fish within 24 hours or arrange delivery.
          </p>
        </div>
      </div>
    </div>
  )
}
