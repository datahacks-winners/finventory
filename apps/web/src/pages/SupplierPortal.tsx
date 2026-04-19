import SparklineChart from '../components/SparklineChart'
import OceanCanvas from '../components/OceanCanvas'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

// TODO: Replace with real data from Firestore
const SPARKLINE_DATA = {
  crates: [0, 0, 0, 0, 0, 0, 0],
  lbs: [0, 0, 0, 0, 0, 0, 0],
  revenue: [0, 0, 0, 0, 0, 0, 0],
  pickup: [0, 0, 0, 0, 0, 0, 0],
}

const KPI_CARDS = [
  { label: 'Crates listed', value: '—', icon: 'inventory_2', key: 'crates' as const },
  { label: 'lbs rescued', value: '—', icon: 'set_meal', key: 'lbs' as const },
  { label: 'revenue', value: '—', icon: 'payments', key: 'revenue' as const },
  { label: 'pickup time', value: '—', icon: 'schedule', key: 'pickup' as const },
]

interface Listing {
  id: string
  name: string
  type: string
  weight: string
  price: string
  distance: string
  status: string
  statusClass: string
  img: string
}

export default function SupplierPortal() {
  const { user } = useAuth()
  const [_stats, _setStats] = useState(KPI_CARDS)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    // TODO: Fetch seller stats and listings from Firestore
    // Example real-time listener:
    const q = query(collection(db, 'listings'), where('sellerId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedListings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Listing[]
      setListings(fetchedListings)
      setLoading(false)
    })

    return unsubscribe
  }, [user])

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="text-on-surface min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fff8f5' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Supplier Portal</h1>
          <p className="text-outline mb-6">Please sign in to view your dashboard</p>
          <a href="/auth" className="bg-primary text-white px-8 py-3 rounded-full font-bold">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="text-on-surface" style={{ backgroundColor: '#fff8f5' }}>
      {/* ── Hero ── */}
      <section className="relative h-[614px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover grayscale-[20%] contrast-[110%]"
            alt="busy harbor at sunrise"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYDyRIOV_XghhBrPerMfFY4uOSf1XoxcFNo0ZAajR1h69tLHU12DBqs1pq7Duem8NxK32EzUoMzE7ZyFFzJgQhY2oxZN4WU1A3eMdfWPYcvoX_qB9oDZ9zdDdZPt69aUSBegxog640-rVBE9Usk8wMFgsQSziaiKcEplRQZ_vTmAYNmJ2ECxNypdoCgoAH-8wkr4jjovqKnB2UvnhC5IdwsVDMyGmmVw0w8klb9fr9Fx9U6NnD2-AU8yurJPDLhTPaS3CKDuLfiic"
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
        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
          <svg className="relative block w-full h-[60px] fill-surface" preserveAspectRatio="none" viewBox="0 0 1200 120">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C58.05,117.26,132.89,121.23,196.41,114.33Z" />
          </svg>
        </div>
      </section>

      {/* ── KPI Row ── */}
      <section className="px-12 max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {KPI_CARDS.map(kpi => (
          <div key={kpi.label} className="bg-surface-container-lowest p-8 rounded-lg ocean-shadow group hover:scale-[1.02] transition-transform">
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

      {/* ── Form + Preview ── */}
      <section className="px-12 max-w-screen-2xl mx-auto flex flex-col lg:flex-row gap-12 items-start mt-20">
        {/* Form */}
        <div className="flex-1 bg-surface-container-lowest p-12 rounded-lg ocean-shadow">
          <header className="mb-10">
            <span className="italic-accent-caveat text-primary text-2xl">Fresh from the nets</span>
            <h2 className="text-4xl font-extrabold tracking-tighter">List a new crate</h2>
          </header>
          <form className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { label: 'Species', type: 'text', placeholder: 'e.g. Bluefin Tuna' },
                { label: 'Weight (lbs)', type: 'number', placeholder: '45' },
                { label: 'Price per lb', type: 'number', placeholder: '12.50', prefix: '$' },
                { label: 'Discount %', type: 'number', placeholder: '0' },
                { label: 'Pickup Windows', type: 'text', placeholder: 'ASAP - 6:00 PM' },
              ].map(field => (
                <div key={field.label} className="ghost-border p-2">
                  <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1">{field.label}</label>
                  <div className="flex items-center">
                    {field.prefix && <span className="text-lg font-medium mr-1">{field.prefix}</span>}
                    <input
                      type={field.type}
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-medium outline-none"
                      placeholder={field.placeholder}
                    />
                  </div>
                </div>
              ))}
              <div className="ghost-border p-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-1">Type</label>
                <select className="w-full bg-transparent border-none focus:ring-0 p-0 text-lg font-medium outline-none cursor-pointer">
                  <option>Whole Round</option>
                  <option>H&G</option>
                  <option>Fillet</option>
                </select>
              </div>
            </div>

            <div className="mt-8">
              <label className="block text-xs font-bold text-outline uppercase tracking-widest mb-4">Photo dropzone</label>
              <div className="border-2 border-dashed border-outline-variant/30 rounded-lg p-12 text-center hover:bg-surface-container-low transition-colors group cursor-pointer">
                <span className="material-symbols-outlined text-5xl text-outline-variant group-hover:text-primary transition-colors">cloud_upload</span>
                <p className="mt-2 text-outline font-medium">
                  Drop your catch photo here or <span className="text-primary underline">browse</span>
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                className="bg-gradient-to-r from-primary to-primary-container text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-[1.02] transition-transform"
              >
                Publish Listing
              </button>
            </div>
          </form>
        </div>

        {/* Preview + Tip */}
        <div className="w-full lg:w-96 space-y-8">
          <div className="bg-surface-container-lowest rounded-lg overflow-hidden ocean-shadow relative">
            <div className="h-56 relative">
              <img
                className="w-full h-full object-cover"
                alt="fresh atlantic salmon fillets on crushed ice"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD71PYmTkULPrkQEzIPQ1SBiTzO9oYeYoTcaZuJmML_O7aPy-MsMiR9Amjx2mi7EWN0MOwNuAbeMVGCIJnLXKg-s59W5X-kQnhRZDFmt76RiIIqUg6I6lVGfHRLtxJCvzbXSshFzI5PFWDX5UAziAr9VQDhLM5CRyN8EM19l4Pi519fM5b5h6eI7uzVfZTVSu_JaWocyexNNbIOZCkhRj-u7HqBpOu51ipd30h70ktG5s-WUxAbCQQ1MfMQNBFcw9_QvZ_yLxUPL_8"
              />
              <div className="absolute top-4 left-4 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase shadow-lg">
                Live Preview
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Atlantic Salmon</h3>
                  <p className="text-outline text-sm">Whole Round • 45 lbs</p>
                </div>
                <span className="text-2xl font-black text-primary">$12.50<span className="text-sm font-normal text-outline">/lb</span></span>
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

      {/* ── Active Listings Table ── */}
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
                  {['Catch', 'Type', 'Weight', 'Price', 'Distance', 'Status', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-outline uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-outline">Loading...</td></tr>
                ) : listings.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-outline">No active listings. Create your first listing above.</td></tr>
                ) : (
                  listings.map(row => (
                    <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                            <img className="w-full h-full object-cover" alt={row.name} src={row.img || '/placeholder-fish.png'} />
                          </div>
                          <span className="font-bold">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-on-surface-variant font-medium">{row.type}</td>
                      <td className="px-6 py-6 text-on-surface-variant font-medium">{row.weight}</td>
                      <td className="px-6 py-6 text-on-surface-variant font-medium">{row.price}</td>
                      <td className="px-6 py-6 text-on-surface-variant font-medium">{row.distance}</td>
                      <td className="px-6 py-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${row.statusClass}`}>
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

        {/* Sidebar tips */}
        <aside className="w-full md:w-80 space-y-8 mt-20">
          <div className="bg-surface-container p-8 rounded-lg ocean-shadow">
            <h3 className="text-2xl font-black italic-accent-caveat text-primary mb-6">Sell faster</h3>
            <ul className="space-y-6">
              {[
                { icon: 'timer', title: 'Morning Rush', desc: 'Listings before 7:00 AM receive 3x more views from restaurant chefs.' },
                { icon: 'sell', title: 'Bundling Magic', desc: 'Try listing a "Soup Pack" with smaller off-cuts for quick liquidation.' },
                { icon: 'verified', title: 'Identity Counts', desc: 'Add a photo of your boat to your profile to build trust with high-end buyers.' },
              ].map(tip => (
                <li key={tip.title} className="flex gap-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{tip.icon}</span>
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
