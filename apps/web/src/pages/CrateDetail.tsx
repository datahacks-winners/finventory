import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useListing } from '../hooks/useListing'
import { useAuth } from '../context/AuthContext'
import { createOrder } from '../services/orders'
import { getFallbackUrl } from '../services/pexels'

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    sushi: 'bg-blue-600',
    A: 'bg-emerald-500',
    B: 'bg-amber-500',
  }
  return (
    <span className={`${colors[grade] || 'bg-gray-500'} text-white px-3 py-1 rounded-full text-xs font-bold uppercase`}>
      {grade === 'sushi' ? 'Sushi Grade' : `Grade ${grade}`}
    </span>
  )
}

function formatDate(ts: { toDate: () => Date }): string {
  const d = ts.toDate()
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimeLeft(expiresAt: { toDate: () => Date }): string {
  const hours = Math.floor((expiresAt.toDate().getTime() - Date.now()) / (1000 * 60 * 60))
  if (hours < 1) return 'Expires soon'
  if (hours < 24) return `${hours} hours left`
  return `${Math.floor(hours / 24)} days left`
}

export default function CrateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { listing, loading, error } = useListing(id)

  const [delivery, setDelivery] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [ordering, setOrdering] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-error mb-4">Listing not found</p>
          <button onClick={() => navigate('/marketplace')} className="text-primary font-bold hover:underline">
            Back to Marketplace
          </button>
        </div>
      </div>
    )
  }

  const photo = listing.photos?.[0] || getFallbackUrl(listing.species.toLowerCase())
  const totalPrice = (listing.pricePerUnit * quantity).toFixed(2)
  const canDeliver = listing.deliveryAvailable && delivery

  const handleReserve = async () => {
    if (!user) {
      navigate('/auth', { state: { from: `/marketplace/${id}` } })
      return
    }

    if (quantity > listing.quantity) {
      setOrderError('Quantity exceeds available stock')
      return
    }

    setOrdering(true)
    setOrderError(null)

    try {
      const result = await createOrder(
        listing.id,
        quantity,
        canDeliver ? 'delivery' : 'pickup'
      )

      if (result.success) {
        setOrderSuccess(true)
      }
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setOrdering(false)
    }
  }

  if (orderSuccess) {
    return (
      <div className="bg-surface text-on-surface min-h-screen">
        <main className="max-w-screen-2xl mx-auto px-12 py-12">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
            </div>
            <h1 className="text-4xl font-extrabold text-primary mb-4">Crate Reserved!</h1>
            <p className="text-on-surface-variant mb-8">
              Your order has been placed. Check your email for pickup instructions and QR code.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/orders')}
                className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:scale-[1.02] transition-transform"
              >
                View My Orders
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                className="border border-primary text-primary px-8 py-3 rounded-full font-bold hover:bg-primary/5 transition-colors"
              >
                Browse More
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <main className="max-w-screen-2xl mx-auto px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7 relative group">
            <div className="rounded-xl overflow-hidden ocean-shadow bg-surface-container-low aspect-[4/5] lg:aspect-auto lg:h-[720px]">
              <img
                alt={`${listing.species} - ${listing.grade} grade`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src={photo}
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-secondary-container p-6 rounded-xl ocean-shadow max-w-[240px] transform rotate-2">
              <span className="font-accent text-2xl text-on-secondary-container block mb-1">From the Captain</span>
              <p className="text-sm leading-relaxed text-on-secondary-container opacity-90">
                Fresh catch from {listing.location.address || 'local waters'}
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-8 lg:pl-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <GradeBadge grade={listing.grade} />
                <span className="text-outline-variant opacity-30">/</span>
                <span className="text-outline text-sm font-medium capitalize">{listing.species}</span>
              </div>
              <h1 className="text-6xl font-extrabold text-primary leading-tight capitalize">{listing.species}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    anchor
                  </span>
                  <span className="font-bold text-on-surface">{listing.sellerName || 'Local Fisher'}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                <div className="text-outline font-medium">Caught {formatDate(listing.createdAt)}</div>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-xl p-8 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-primary">
                      ${listing.pricePerUnit.toFixed(2)}
                      <span className="text-xl font-medium">/lb</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-outline mb-1 uppercase tracking-widest font-bold">Total</div>
                  <div className="text-2xl font-bold text-on-surface">${totalPrice}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-outline-variant/10">
                <div className="flex flex-col">
                  <span className="text-xs text-outline font-bold uppercase tracking-widest mb-1">Available</span>
                  <span className="text-lg font-bold">{listing.quantity} {listing.unit}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-outline font-bold uppercase tracking-widest mb-1">Harbor</span>
                  <span className="text-lg font-bold">{listing.location.address?.split(',')[0] || 'Local'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-outline font-bold uppercase tracking-widest mb-1">Window</span>
                  <span className="text-lg font-bold">{formatTimeLeft(listing.expiresAt)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl ocean-shadow border border-outline-variant/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">scale</span>
                  </div>
                  <div>
                    <h4 className="font-bold">Quantity</h4>
                    <p className="text-sm text-outline">How much do you need?</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-bold hover:bg-surface-container"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(listing.quantity, q + 1))}
                    className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-bold hover:bg-surface-container"
                  >
                    +
                  </button>
                </div>
              </div>

              {listing.deliveryAvailable && (
                <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl ocean-shadow border border-outline-variant/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">local_shipping</span>
                    </div>
                    <div>
                      <h4 className="font-bold">Delivery Available</h4>
                      <p className="text-sm text-outline">{listing.deliveryFee ? `$${listing.deliveryFee} fee` : 'Free delivery'}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={delivery}
                      onChange={(e) => setDelivery(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white rounded-xl border border-outline-variant/10 flex items-start gap-4">
                  <div className="bg-tertiary/10 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-black text-on-surface">Fresh Catch</div>
                    <div className="text-xs text-outline uppercase font-bold tracking-tighter">Quality Guaranteed</div>
                  </div>
                </div>
                <div className="p-5 bg-white rounded-xl border border-outline-variant/10 flex items-start gap-4">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-primary">eco</span>
                  </div>
                  <div>
                    <div className="text-lg font-black text-on-surface">Rescue</div>
                    <div className="text-xs text-outline uppercase font-bold tracking-tighter">Reduce Waste</div>
                  </div>
                </div>
              </div>
            </div>

            {orderError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500">error</span>
                <p className="text-red-700 text-sm font-medium">{orderError}</p>
              </div>
            )}

            <button
              onClick={handleReserve}
              disabled={ordering || listing.quantity === 0}
              className="w-full py-6 bg-gradient-to-r from-primary to-primary-container text-white text-xl font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ordering ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Processing...
                </>
              ) : (
                <>
                  {user ? 'Reserve Crate' : 'Sign in to Reserve'}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <h3 className="text-4xl font-extrabold text-on-surface">Crate Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-8 bg-surface-container-low rounded-xl">
                <h5 className="font-bold text-primary mb-2">Freshness</h5>
                <p className="text-on-surface/70 leading-relaxed">
                  Caught on {formatDate(listing.freshnessDate)}. Best consumed within 48 hours for optimal flavor.
                </p>
              </div>
              <div className="p-8 bg-surface-container-low rounded-xl">
                <h5 className="font-bold text-primary mb-2">Location</h5>
                <p className="text-on-surface/70 leading-relaxed">
                  Available for pickup at {listing.location.address || 'local harbor'}. {listing.deliveryAvailable && 'Delivery available to your location.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-8 relative overflow-hidden flex flex-col justify-end min-h-[300px]">
            <img
              alt="Fishing Vessel"
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              src={getFallbackUrl('fishing boat')}
            />
            <div className="relative z-10">
              <span className="font-accent text-3xl text-secondary-container mb-2 block">Our Mission</span>
              <p className="text-lg font-medium leading-snug">
                Supporting local harbors by bridging the gap between excess catch and your kitchen.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
