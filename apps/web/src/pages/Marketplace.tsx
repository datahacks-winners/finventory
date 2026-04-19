import { useState } from 'react'
import { Link } from 'react-router-dom'

const FILTER_TAGS = ['All', 'Bycatch', 'Surplus', 'Off-cut', 'Whole']

const CRATES = [
  {
    id: '1',
    name: 'Wild King Salmon',
    price: 8.40,
    weight: 22,
    distance: 3.2,
    pickup: 'Pickup: 4PM',
    badge: 'SUNSET DISCOUNT',
    badgeBg: 'bg-secondary',
    tag: 'WILD CAUGHT',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA30stG08LgmrXLrDFv3Fro5ra3FqzlssNTOc6oxSNOrWzr0JplkVajr6aWCFDGMUZRzObRTO-FyyyogLDWMRLSBA6g3KDrFC8pY2QTQPSXUSztpKryEQX0WBR4Czx_XJeJuLrKXqZSqsAMJLMvEKr8iRVM2-H7Xl8A-Yl_JF4f4jO6t7W-PfGuYv3tzSr7g7xGLoUb3EXSTtR2pxbwyc-jkboZ5LWQQ3sdQU1eJyCzmDs189sv95ISLIPKdbfGI4pS_zvQO7eND7U',
    alt: 'fresh wild king salmon fillets on ice',
  },
  {
    id: '2',
    name: 'Dungeness Crab',
    price: 12.50,
    weight: 15,
    distance: 0.8,
    pickup: 'Ready Now',
    badge: null,
    tag: 'BYCATCH',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZZ-YX7eWKqJG4q2Xo8FPZWbGXwYt2JDnZ3G3a1c8qhUCA0sPabO8UOXx0d1o_xvhzENMEHZRmhXLqUhvzP4i5i6kylAWCOQxsEd76EtfAsuUNZhmF5x1kbm2kdqrLzND5RpSdAL3zxe8KbrG-uXHbvohNd-wdaxrKHgNHjA3JCbZ83oJF55vmLsaV4AAQiDwbdnbRRsW3PVzJLYJ8RJIsFNaILwgEjsyTS6QRyIuELWKUp5pdQ43BhfSsivMh_YYs3uKAypp6hcg',
    alt: 'fresh dungeness crab in a blue crate',
  },
  {
    id: '3',
    name: 'Pacific Rockfish',
    price: 6.20,
    weight: 40,
    distance: 5.1,
    pickup: 'Pickup: 6PM',
    badge: 'SURPLUS',
    badgeBg: 'bg-secondary',
    tag: null,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQdYo5Bu93SgR6w5IzeL338cKTw3VjYXSLJk6nH3mJNuQFPe86DzztG5Xj3m0MaIJ-gB7JeNDa-BBABsr58b4WD8FQn4TufoWNt49J3KzeZIaW5als58S989PGMT0WHuQQ6g1SQHaBXrz9IGTQvYk3ePkqEbPfpvEowfnJw9bGT1VF9RgKj9V7d369YkYu5UskW9DoWiZwWKK0ODIkGTgbvmI6eGK-4IpmyTrFxj0rNjJn89CuoFpzmNsLXliHwNRZ5xkwd9lTw7k',
    alt: 'piles of fresh rockfish in a white container',
  },
]

export default function Marketplace() {
  const [activeFilter, setActiveFilter] = useState('All')

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-white">
      <main className="max-w-[1600px] mx-auto px-12 py-8 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-12 min-h-[calc(100vh-100px)]">
        {/* ── Left: Map ── */}
        <section className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="italic-accent-caveat text-2xl text-secondary mb-1 block">Local Bounty</span>
              <h1 className="text-4xl font-black tracking-tighter text-primary">Discover the Catch.</h1>
            </div>
            <div className="flex items-center gap-8 bg-surface-container-low p-4 px-6 rounded-xl border border-outline-variant/15">
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-outline">Search Radius</span>
                  <span className="italic-accent-caveat text-xl text-primary">12 mi</span>
                </div>
                <input type="range" className="w-full h-1.5 bg-outline-variant/30 rounded-lg appearance-none cursor-pointer accent-primary" defaultValue={12} min={1} max={50} />
              </div>
              <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>package_2</span>
                47 crates available
              </div>
            </div>
          </div>

          {/* Stylized Coastal Map */}
          <div className="relative w-full flex-grow rounded-lg overflow-hidden ocean-gradient border border-outline-variant/10 ocean-shadow min-h-[600px]">
            <div className="absolute inset-0 map-grid" />
            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 800 600">
              <path d="M0,0 L300,0 Q350,150 250,300 T300,600 L0,600 Z" fill="#ebd6c9" />
            </svg>

            {/* User Marker */}
            <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 border-2 border-dashed border-primary/30 rounded-full animate-pulse" />
                <div className="w-6 h-6 bg-primary rounded-full border-4 border-white shadow-lg z-10" />
                <div className="absolute w-6 h-6 bg-primary rounded-full animate-ping opacity-75" />
              </div>
            </div>

            {/* Price Pins */}
            {[
              { top: '30%', left: '60%', price: '8.40' },
              { top: '65%', left: '55%', price: '12.50' },
              { top: '45%', left: '80%', price: '6.20' },
            ].map(pin => (
              <div key={pin.price} className="absolute group" style={{ top: pin.top, left: pin.left }}>
                <div className="bg-primary text-white px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1 cursor-pointer transition-transform hover:scale-110">
                  <span className="text-xs">$</span>{pin.price}
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-primary" />
              </div>
            ))}

            {/* Map Overlay */}
            <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-md p-4 rounded-xl ocean-shadow border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container">anchor</span>
                </div>
                <div>
                  <p className="text-xs text-outline font-bold uppercase tracking-tighter">Active Pier</p>
                  <p className="font-bold text-on-surface">Bodega Bay Terminal</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right: Filters + List ── */}
        <aside className="flex flex-col h-full">
          <div className="sticky top-28 z-40 bg-surface pb-6 flex flex-col gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                type="text"
                placeholder="Search species..."
                className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 placeholder:text-outline/50 font-medium outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {FILTER_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveFilter(tag)}
                  className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${
                    activeFilter === tag
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center px-2">
              <span className="text-sm font-bold text-outline uppercase tracking-widest">Showing 47 results</span>
              <button className="flex items-center gap-1 text-sm font-bold text-primary">
                Sort by: Distance
                <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
              </button>
            </div>
          </div>

          {/* Crate Cards */}
          <div className="flex flex-col gap-6 overflow-y-auto pb-12 pr-2">
            {CRATES.map(crate => (
              <Link key={crate.id} to={`/marketplace/${crate.id}`} className="bg-surface-container-lowest rounded-lg overflow-hidden ocean-shadow border border-outline-variant/10 group block">
                <div className="relative h-48">
                  <img
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    alt={crate.alt}
                    src={crate.img}
                  />
                  {crate.badge && (
                    <div className={`absolute top-4 left-4 ${crate.badgeBg} text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg`}>
                      {crate.badge}
                    </div>
                  )}
                  {crate.tag && (
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold border border-white/30">
                      {crate.tag}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold tracking-tight text-primary">{crate.name}</h3>
                    <div className="text-2xl font-black text-primary">
                      <span className="text-sm">$</span>{crate.price.toFixed(2)}
                      <span className="text-xs text-outline font-normal">/lb</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[
                      { icon: 'scale', label: `${crate.weight} lbs` },
                      { icon: 'distance', label: `${crate.distance} mi` },
                      { icon: 'schedule', label: crate.pickup },
                    ].map(tag => (
                      <span key={tag.label} className="px-3 py-1 bg-surface-container-low text-outline-variant text-[10px] font-bold rounded-full uppercase tracking-widest border border-outline-variant/10 flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{tag.icon}</span>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  <button className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3 rounded-full font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                    Claim Crate
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}
