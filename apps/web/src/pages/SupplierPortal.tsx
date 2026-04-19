import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SparklineChart from '../components/SparklineChart'
import OceanCanvas from '../components/OceanCanvas'
import { useAuth } from '../context/AuthContext'
import { createListing } from '../services/createListing'
import { subscribeToSellerOrders, type Order } from '../services/orders'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import type { Timestamp } from 'firebase/firestore'

interface Listing {
  id: string
  species: string
  grade: string
  quantity: number
  unit: string
  pricePerUnit: number
  status: 'active' | 'sold' | 'expired'
  photos: string[]
  createdAt: Timestamp
}

const SPARKLINE_DATA = {
  crates: [2, 4, 3, 5, 7, 6, 8],
  lbs: [45, 82, 63, 110, 145, 120, 180],
  revenue: [580, 1200, 890, 1650, 2100, 1750, 2400],
  pickup: [12, 18, 15, 22, 28, 24, 32],
}

const KPI_CARDS = [
  { label: 'Crates listed', value: '8', icon: 'inventory_2', key: 'crates' as const },
  { label: 'lbs rescued', value: '180', icon: 'set_meal', key: 'lbs' as const },
  { label: 'revenue', value: '$2,400', icon: 'payments', key: 'revenue' as const },
  { label: 'pickup time', value: '32 min', icon: 'schedule', key: 'pickup' as const },
]

export default function SupplierPortal() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [listings, setListings] = useState<Listing[]>([])
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [formData, setFormData] = useState({
    species: '',
    weight: '',
    price: '',
    discount: '0',
    pickupWindows: '',
    type: 'Whole Round',
    grade: 'A' as 'sushi' | 'A' | 'B',
    deliveryAvailable: false,
    photos: [] as string[],
  })

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const listingsQuery = query(collection(db, 'listings'), where('sellerId', '==', user.uid))
    const unsubscribeListings = onSnapshot(listingsQuery, (snapshot) => {
      const fetchedListings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Listing[]
      setListings(fetchedListings.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds))
      setLoading(false)
    })

    const unsubscribeOrders = subscribeToSellerOrders(user.uid, (orders) => {
      setPendingOrders(orders)
    })

    return () => {
      unsubscribeListings()
      unsubscribeOrders()
    }
  }, [user])

  const handlePhotoUpload = () => {
    const input = fileInputRef.current
    if (!input) return

    input.click()
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFormData((prev) => ({
            ...prev,
            photos: [e.target?.result as string],
          }))
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      navigate('/auth', { state: { from: '/suppliers' } })
      return
    }

    if (!formData.species || !formData.weight || !formData.price) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)

      await createListing({
        species: formData.species,
        grade: formData.grade,
        quantity: parseInt(formData.weight),
        unit: formData.type,
        pricePerUnit: parseFloat(formData.price),
        freshnessDate: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
          address: 'Pier 42, San Francisco',
        },
        deliveryAvailable: formData.deliveryAvailable,
        photos: formData.photos.length > 0 ? formData.photos : ['https://via.placeholder.com/400x300?text=Fish'],
      })

      setSubmitSuccess(true)
      setFormData({
        species: '',
        weight: '',
        price: '',
        discount: '0',
        pickupWindows: '',
        type: 'Whole Round',
        grade: 'A',
        deliveryAvailable: false,
        photos: [],
      })

      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (err) {
      console.error('Error creating listing:', err)
      alert('Failed to create listing. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="text-on-surface min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fff8f5' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Supplier Portal</h1>
          <p className="text-outline mb-6">Please sign in to access your dashboard</p>
          <button onClick={() => navigate('/auth')} className="bg-primary text-white px-8 py-3 rounded-full font-bold">
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="text-on-surface" style={{ backgroundColor: '#fff8f5' }}>
      <section className="relative h-[614px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover grayscale-[20%] contrast-[110%]"
            alt="busy harbor at sunrise"
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-transparent" />
        </div>
        <OceanCanvas className="absolute inset-0 z-[1] pointer-events-none opacity-20" />
        <div className="relative z-10 px-12 max-w-7xl mx-auto w-full">
          <div className="max-w-2xl">
            <span className="italic-accent-caveat text-white text-3xl mb-4 block">From the Captain</span>
            <h1 className="text-7xl font-extrabold text-white leading-tight tracking-tighter">Your dock, digitized.</h1>
            <p className="text-white/90 text-xl mt-6 font-light leading-relaxed">
              Transform your daily catch into instant listings. Connect directly with buyers while the salt is still in the air.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
          <svg className="relative block w-full h-[60px] fill-surface" preserveAspectRatio="none" viewBox="0 0 1200 120">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C58.05,117.26,132.89,121.23,196.41,114.33Z" />
          </svg>
        </div>
      </section>

      <section className="px-12 max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 -mt-10 relative z-20">
        {KPI_CARDS.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-surface-container-lowest p-8 rounded-lg ocean-shadow group hover:scale-[1.02] transition-transform"
          >
            <p className="text-outline text-sm uppercase tracking-widest font-bold">{kpi.label}</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-5xl font-black italic-accent-caveat text-primary">{kpi.value}</span>
              <span className="material-symbols-outlined text-primary-container">{kpi.icon}</span>
            </div>
            <div className="mt-4">
              <SparklineChart data={SPARKLINE_DATA[kpi.key]} color="#1e78b4" height={32} />
            </div>
          </div>
        ))}
      </section>

      {pendingOrders.length > 0 && (
        <section className="px-12 max-w-screen-2xl mx-auto mt-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-600">notifications_active</span>
                <span className="font-bold text-amber-800">
                  You have {pendingOrders.length} pending order{pendingOrders.length > 1 ? 's' : ''} awaiting pickup
                </span>
              </div>
              <button className="text-amber-700 font-bold hover:underline">View Orders</button>
            </div>
          </div>
        </section>
      )}

      <section className="px-12 max-w-screen-2xl mx-auto flex flex-col lg:flex-row gap-12 items-start mt-12">
        <div className="flex-1 bg-surface-container-lowest p-12 rounded-lg ocean-shadow">
          <header className="mb-10">
            <span className="italic-accent-caveat text-primary text-2xl">Fresh from the nets</span>
            <h2 className="text-4xl font-extrabold tracking-tighter">List a new crate</h2>
            {submitSuccess && (
              <div className="mt-4 bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="font-bold">Listing created successfully!</span>
              </div>
            )}
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="ghost-border p-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1">Species *</label>
                <input
                  type="text"
                  value={formData.species}
                  onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                  className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-medium outline-none"
                  placeholder="e.g. Bluefin Tuna"
                  required
                />
              </div>

              <div className="ghost-border p-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1">Weight (lbs) *</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-medium outline-none"
                  placeholder="45"
                  required
                  min="1"
                />
              </div>

              <div className="ghost-border p-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1">Price per lb *</label>
                <div className="flex items-center">
                  <span className="text-lg font-medium mr-1">$</span>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-medium outline-none"
                    placeholder="12.50"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="ghost-border p-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1">Grade</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value as 'sushi' | 'A' | 'B' })}
                  className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-medium outline-none cursor-pointer"
                >
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="sushi">Sushi Grade</option>
                </select>
              </div>

              <div className="ghost-border p-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-medium outline-none cursor-pointer"
                >
                  <option>Whole Round</option>
                  <option>H&G</option>
                  <option>Fillet</option>
                </select>
              </div>

              <div className="ghost-border p-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1">Delivery Available</label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.deliveryAvailable}
                      onChange={(e) => setFormData({ ...formData, deliveryAvailable: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                  <span className="text-sm text-outline">Offer delivery to buyers</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-4">Photo</label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
              <div
                onClick={handlePhotoUpload}
                className="border-2 border-dashed border-outline-variant/30 rounded-lg p-12 text-center hover:bg-surface-container-low transition-colors group cursor-pointer"
              >
                {formData.photos.length > 0 ? (
                  <img src={formData.photos[0]} alt="Preview" className="h-40 mx-auto object-contain rounded-lg" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-5xl text-outline-variant group-hover:text-primary transition-colors">
                      cloud_upload
                    </span>
                    <p className="mt-2 text-outline font-medium">
                      Drop your catch photo here or <span className="text-primary underline">browse</span>
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-primary to-primary-container text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Publishing...
                  </>
                ) : (
                  <>
                    Publish Listing
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="w-full lg:w-96 space-y-8">
          <div className="bg-surface-container-lowest rounded-lg overflow-hidden ocean-shadow relative">
            <div className="h-56 relative">
              <img
                className="w-full h-full object-cover"
                alt="Preview"
                src={
                  formData.photos[0] ||
                  'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&auto=format&fit=crop'
                }
              />
              <div className="absolute top-4 left-4 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase shadow-lg">
                Live Preview
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{formData.species || 'Atlantic Salmon'}</h3>
                  <p className="text-outline text-sm">
                    {formData.type} • {formData.weight || '45'} lbs
                  </p>
                </div>
                <span className="text-2xl font-black text-primary">
                  ${formData.price || '12.50'}
                  <span className="text-sm font-normal text-outline">/lb</span>
                </span>
              </div>
              <div className="mt-6 flex items-center text-sm font-medium text-on-surface-variant">
                <span className="material-symbols-outlined text-sm mr-2">location_on</span>
                Pier 42, North Harbor
              </div>
            </div>
          </div>

          <div className="bg-tertiary-container p-8 rounded-lg shadow-sm border-l-8 border-tertiary">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-on-tertiary-container">lightbulb</span>
              <div>
                <h4 className="font-bold text-on-tertiary-container mb-2">Captain's Tip</h4>
                <p className="text-on-tertiary-container/80 text-sm leading-relaxed">
                  Listings with high-quality daylight photos sell 40% faster. Try to avoid shadows from the boat's rigging!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-12 max-w-screen-2xl mx-auto flex flex-col md:flex-row gap-12 mt-20 pb-20">
        <div className="flex-grow">
          <header className="mb-8 flex justify-between items-end">
            <div>
              <span className="italic-accent-caveat text-primary text-2xl">Current Fleet</span>
              <h2 className="text-4xl font-extrabold tracking-tighter">Your active listings</h2>
            </div>
            <button className="flex items-center text-primary font-bold hover:gap-3 transition-all gap-2">
              View Archive <span className="material-symbols-outlined">arrow_right_alt</span>
            </button>
          </header>

          <div className="bg-surface-container-lowest rounded-lg overflow-hidden ocean-shadow">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Catch', 'Grade', 'Quantity', 'Price', 'Status', ''].map((h) => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-outline">
                      Loading...
                    </td>
                  </tr>
                ) : listings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-outline">
                      No active listings. Create your first listing above.
                    </td>
                  </tr>
                ) : (
                  listings.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                            <img
                              className="w-full h-full object-cover"
                              alt={row.species}
                              src={row.photos?.[0] || '/placeholder-fish.png'}
                            />
                          </div>
                          <span className="font-bold capitalize">{row.species}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            row.grade === 'sushi'
                              ? 'bg-blue-100 text-blue-700'
                              : row.grade === 'A'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {row.grade}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-on-surface-variant font-medium">
                        {row.quantity} {row.unit}
                      </td>
                      <td className="px-6 py-6 text-on-surface-variant font-medium">
                        ${row.pricePerUnit.toFixed(2)}/lb
                      </td>
                      <td className="px-6 py-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${
                            row.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : row.status === 'sold'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <button className="material-symbols-outlined text-outline hover:text-primary">more_vert</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="w-full md:w-80 space-y-8 mt-20">
          <div className="bg-surface-container p-8 rounded-lg ocean-shadow">
            <h3 className="text-2xl font-black italic-accent-caveat text-primary mb-6">Sell faster</h3>
            <ul className="space-y-6">
              {[
                {
                  icon: 'timer',
                  title: 'Morning Rush',
                  desc: 'Listings before 7:00 AM receive 3x more views from restaurant chefs.',
                },
                {
                  icon: 'sell',
                  title: 'Bundling Magic',
                  desc: 'Try listing a "Soup Pack" with smaller off-cuts for quick liquidation.',
                },
                {
                  icon: 'verified',
                  title: 'Identity Counts',
                  desc: 'Add a photo of your boat to your profile to build trust with high-end buyers.',
                },
              ].map((tip) => (
                <li key={tip.title} className="flex gap-4">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {tip.icon}
                  </span>
                  <div>
                    <p className="font-bold text-sm">{tip.title}</p>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{tip.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button className="w-full mt-10 py-3 rounded-full border border-primary/20 text-primary font-bold hover:bg-primary hover:text-white transition-all">
              Explore All Tips
            </button>
          </div>
        </aside>
      </section>
    </div>
  )
}
