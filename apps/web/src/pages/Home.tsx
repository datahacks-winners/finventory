import { Link, useNavigate } from 'react-router-dom'
import OceanCanvas from '../components/OceanCanvas'
import { PexelsImage } from '../components/PexelsImage'
import { usePexelsBatch, usePexels } from '../hooks/usePexels'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { useListings } from '../hooks/useListings'
import { getFallbackUrl } from '../services/pexels'
import { useMemo, useState, useEffect } from 'react'

const WHY_CARDS = [
  { icon: 'set_meal', bg: '#0077B6', textClass: 'text-white', title: 'Rescue the catch', desc: 'List bycatch and unsold hauls in seconds. Move surplus before it spoils.' },
  { icon: 'location_on', bg: '#F4743B', textClass: 'text-white', title: 'Local, by design', desc: "Map-first discovery shows what's available within miles, not days." },
  { icon: 'eco', bg: '#FFCA4D', textClass: 'text-on-background', title: 'Visible impact', desc: 'Every order tracks pounds saved and emissions avoided — backed by CALCOFI data.' },
]

const HOW_STEPS = [
  { n: '1', title: 'List', desc: 'Suppliers post crates with weight, species, and pickup window.' },
  { n: '2', title: 'Discover', desc: 'Buyers spot deals on a map sorted by distance and freshness.' },
  { n: '3', title: 'Reserve', desc: 'One-tap reserve. Payment held until pickup confirms.' },
  { n: '4', title: 'Impact', desc: 'Every transaction logs lbs saved & CO₂ avoided to your dashboard.' },
]

// Fresh Catch Marquee - horizontal scrolling listings
function FreshCatchMarquee() {
  const navigate = useNavigate()
  const filters = useMemo(() => ({
    species: [],
    grades: [],
    priceRange: [0, 1000] as [number, number],
    distance: 100,
  }), [])

  const userLocation = useMemo(() => ({
    latitude: 37.7749,
    longitude: -122.4194,
  }), [])

  const { listings, loading } = useListings(filters, userLocation)

  const featured = useMemo(() => {
    return listings
      .sort((a, b) => a.expiresAt.toDate().getTime() - b.expiresAt.toDate().getTime())
      .slice(0, 12)
  }, [listings])

  if (loading || featured.length === 0) {
    return null
  }

  // Double the listings for seamless infinite scroll
  const doubledListings = [...featured, ...featured]

  return (
    <section className="py-16 bg-surface overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="italic-accent-caveat text-primary text-3xl mb-2 block">fresh from the boats</span>
            <h2 className="text-4xl lg:text-5xl font-black text-on-background tracking-tight">
              Today's Catch
            </h2>
          </div>
          <Link
            to="/marketplace"
            className="hidden md:flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all"
          >
            Browse All
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Scrolling marquee container */}
      <div className="relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none" />
        
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none" />

        {/* Scrolling track */}
        <div className="flex gap-6 animate-marquee hover:[animation-play-state:paused]">
          {doubledListings.map((listing, idx) => {
            const photo = listing.photos?.[0] || getFallbackUrl(listing.species.toLowerCase())
            const hoursLeft = Math.floor((listing.expiresAt.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60))
            
            return (
              <div
                key={`${listing.id}-${idx}`}
                onClick={() => navigate(`/marketplace/${listing.id}`)}
                className="flex-shrink-0 w-72 group cursor-pointer"
              >
                <div className="relative h-80 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <img
                    src={photo}
                    alt={listing.species}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between">
                    {listing.grade === 'sushi' && (
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        Sushi Grade
                      </span>
                    )}
                    {hoursLeft < 6 && (
                      <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse ml-auto">
                        Sunset Deal
                      </span>
                    )}
                  </div>

                  {/* Info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-white font-bold text-xl capitalize mb-1">{listing.species}</h3>
                    <div className="flex items-center justify-between text-white/90">
                      <span className="text-2xl font-black">${listing.pricePerUnit.toFixed(0)}<span className="text-sm font-normal">/lb</span></span>
                      {listing.distance !== undefined && (
                        <span className="text-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          {listing.distance.toFixed(1)} mi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile CTA */}
      <div className="md:hidden mt-8 text-center px-6">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold"
        >
          Browse All Catches
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </div>
    </section>
  )
}

// AI Demo Section - Animated showcase of photo-to-listing feature
function AIDemoSection() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const steps = [
    { title: 'Snap a photo', icon: 'photo_camera', desc: 'Take a photo of your catch' },
    { title: 'AI Analysis', icon: 'auto_awesome', desc: 'Identifying species & grade...' },
    { title: 'Smart Details', icon: 'insights', desc: 'Weight, price & freshness detected' },
    { title: 'Listing Live', icon: 'rocket_launch', desc: 'Published in seconds' },
  ]

  return (
    <section className="py-24 bg-gradient-to-br from-primary/5 via-surface to-secondary/5">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text content */}
          <div>
            <span className="italic-accent-caveat text-primary text-3xl mb-4 block">for suppliers</span>
            <h2 className="text-4xl lg:text-6xl font-black text-on-background tracking-tight mb-6">
              Snap. Analyze. List.
            </h2>
            <p className="text-xl text-on-surface-variant mb-12 max-w-lg">
              Our AI identifies your catch, grades quality, estimates weight, and suggests pricing — all from a single photo.
            </p>

            {/* Step indicators */}
            <div className="space-y-4">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${
                    step === i ? 'bg-primary text-white shadow-lg scale-105' : 'bg-white/50 text-on-surface'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    step === i ? 'bg-white text-primary' : 'bg-primary/10 text-primary'
                  }`}>
                    <span className="material-symbols-outlined">{s.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{s.title}</h4>
                    <p className={`text-sm ${step === i ? 'text-white/80' : 'text-on-surface-variant'}`}>
                      {s.desc}
                    </p>
                  </div>
                  {step === i && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Link
                to="/suppliers"
                className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform"
              >
                Try It Now
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Right: Animated phone demo */}
          <div className="relative">
            {/* Phone frame */}
            <div className="relative mx-auto w-80 h-[600px] bg-surface-container-lowest rounded-[3rem] shadow-2xl border-8 border-surface-container-highest overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-surface-container-highest rounded-b-2xl z-20" />

              {/* Screen content */}
              <div className="relative h-full pt-12 pb-8 px-4">
                {/* App header */}
                <div className="flex items-center justify-between mb-6">
                  <span className="font-bold text-on-surface">New Listing</span>
                  <span className="material-symbols-outlined text-outline">close</span>
                </div>

                {/* Animated content based on step */}
                <div className="relative h-full">
                  {/* Step 0: Camera/Photo */}
                  <div className={`absolute inset-0 transition-all duration-700 ${step === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                    <div className="h-64 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-2xl flex items-center justify-center mb-4">
                      <img
                        src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&auto=format&fit=crop"
                        alt="Fresh salmon"
                        className="w-full h-full object-cover rounded-2xl"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 border-4 border-white rounded-full flex items-center justify-center animate-pulse">
                          <span className="material-symbols-outlined text-4xl text-white">photo_camera</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-on-surface-variant">Point camera at your catch</p>
                  </div>

                  {/* Step 1: AI Scanning */}
                  <div className={`absolute inset-0 transition-all duration-700 ${step === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                    <div className="h-64 rounded-2xl overflow-hidden mb-4 relative">
                      <img
                        src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&auto=format&fit=crop"
                        alt="Analyzing"
                        className="w-full h-full object-cover"
                      />
                      {/* Scanning overlay */}
                      <div className="absolute inset-0 bg-primary/20">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-primary animate-[scan_2s_ease-in-out_infinite]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white/90 px-4 py-2 rounded-full flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-medium text-primary">Analyzing...</span>
                          </div>
                        </div>
                      </div>
                      {/* Detection boxes */}
                      <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-primary/50 rounded-lg animate-pulse">
                        <div className="absolute -top-6 left-0 bg-primary text-white text-xs px-2 py-1 rounded">Fish detected</div>
                      </div>
                    </div>
                    <p className="text-center text-on-surface-variant">AI analyzing species & freshness</p>
                  </div>

                  {/* Step 2: Results */}
                  <div className={`absolute inset-0 transition-all duration-700 ${step === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                    <div className="h-40 rounded-2xl overflow-hidden mb-4">
                      <img
                        src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&auto=format&fit=crop"
                        alt="Salmon"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Analysis results */}
                    <div className="space-y-2 animate-[slideIn_0.5s_ease-out]">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Species</span>
                        <span className="font-bold text-emerald-800">Atlantic Salmon</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-sm text-blue-700">Grade</span>
                        <span className="font-bold text-blue-800">Sushi Grade</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-sm text-amber-700">Est. Weight</span>
                        <span className="font-bold text-amber-800">12.5 lbs</span>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-sm text-purple-700">Suggested Price</span>
                        <span className="font-bold text-purple-800">$18-24/lb</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Published */}
                  <div className={`absolute inset-0 transition-all duration-700 ${step === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                    <div className="h-full flex flex-col items-center justify-center">
                      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <span className="material-symbols-outlined text-5xl text-emerald-600">check_circle</span>
                      </div>
                      <h3 className="text-2xl font-bold text-on-surface mb-2">Listed!</h3>
                      <p className="text-center text-on-surface-variant mb-6">Your salmon is now live on the marketplace</p>
                      
                      {/* Mini listing preview */}
                      <div className="w-full bg-white rounded-xl p-4 shadow-lg">
                        <div className="flex gap-3">
                          <img
                            src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100&auto=format&fit=crop"
                            alt="Salmon"
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-bold">Atlantic Salmon</h4>
                            <p className="text-sm text-outline">Sushi Grade • 12.5 lbs</p>
                            <p className="text-lg font-black text-primary">$21<span className="text-sm font-normal text-outline">/lb</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom progress dots */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        step === i ? 'w-6 bg-primary' : 'bg-outline/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-secondary/10 rounded-full blur-2xl" />
          </div>
        </div>
      </div>

      {/* Add scan animation keyframes */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: 100%; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}

const FISH_QUERY_MAP: Record<string, string> = {
  hero: 'fishing boat harbor sunset ocean',
  dock: 'fishing dock pier boats harbor',
  chef: 'chef preparing seafood kitchen',
  market: 'fish market seafood display',
}

export default function Home() {
  const { url: heroUrl, alt: heroAlt } = usePexels({
    query: FISH_QUERY_MAP.hero,
    quality: 'large2x',
    fallbackQuery: 'hero',
  })

  const { images: cardImages } = usePexelsBatch({
    queries: [FISH_QUERY_MAP.dock, FISH_QUERY_MAP.chef],
    quality: 'large2x',
  })

  const { url: fishDisplayUrl, alt: fishDisplayAlt } = usePexels({
    query: FISH_QUERY_MAP.market,
    quality: 'large2x',
    fallbackQuery: 'market',
  })

  return (
    <div className="bg-surface font-body text-on-surface">
      {/* ── Hero ── */}
      <section className="relative min-h-[921px] flex flex-col justify-center text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          {heroUrl && (
            <PexelsImage
              src={heroUrl}
              alt={heroAlt || 'California harbor at sunset'}
              className="w-full h-full"
              lazy={false}
            />
          )}
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Three.js ocean overlay */}
        <OceanCanvas className="absolute inset-0 z-[1] pointer-events-none opacity-25" />

        <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 lg:px-12 pt-20 pb-12">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 mb-8">
            <span className="material-symbols-outlined text-sunset-yellow" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>colors_spark</span>
            <span className="text-sm font-semibold tracking-wide">Now serving the California coast</span>
          </div>

          <h1 className="text-5xl lg:text-8xl font-extrabold leading-[1.05] mb-8 max-w-4xl tracking-tight">
            Fresh from the coast,{' '}
            <span className="italic-accent-caveat text-sunset-yellow">never wasted.</span>
          </h1>

          <p className="text-lg lg:text-xl text-white/90 max-w-2xl mb-12 leading-relaxed">
            Finventory is the B2B marketplace where fishers sell surplus catch, bycatch, and off-cuts
            to chefs and bulk buyers — at prices that keep boats running and oceans thriving.
          </p>

          <div className="flex flex-wrap gap-6 mb-24">
            <Link
              to="/marketplace"
              className="bg-sunset-yellow text-on-background px-10 py-5 rounded-full font-bold text-lg flex items-center gap-2 hover:scale-105 transition-transform"
            >
              Browse the catch
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              to="/suppliers"
              className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-white/20 transition-all"
            >
              I'm a supplier
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/20">
            {[
              { value: 18, suffix: 'k+', label: 'LBS RESCUED' },
              { value: 240, suffix: 't', label: 'CO₂ SAVED' },
              { value: 120, suffix: '+', label: 'COASTAL PARTNERS' },
            ].map(s => (
              <div key={s.label} className="flex flex-col">
                <span className="italic-accent-caveat text-5xl text-sunset-yellow">
                  <AnimatedNumber value={s.value} suffix={s.suffix} duration={2} />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Finventory ── */}
      <section className="py-24 bg-surface">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 text-center">
          <span className="italic-accent-caveat text-primary text-3xl mb-4 block">why finventory</span>
          <h2 className="text-5xl lg:text-6xl font-black text-on-background tracking-tight mb-6">
            A tide that lifts every boat
          </h2>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-20">
            Built for the realities of perishable goods — speed, locality, and trust.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {WHY_CARDS.map(c => (
              <div
                key={c.title}
                className="bg-white p-10 rounded-3xl shadow-sm border border-black/5 text-left group hover:shadow-xl transition-all duration-500"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8"
                  style={{ backgroundColor: c.bg }}
                >
                  <span className={`material-symbols-outlined text-3xl ${c.textClass}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {c.icon}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-4">{c.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Today's Fresh Catch ── */}
      <FreshCatchMarquee />

      {/* ── AI Demo ── */}
      <AIDemoSection />

      {/* ── For Suppliers / For Buyers ── */}
      <section className="py-12 bg-surface">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[
              {
                tag: 'FOR SUPPLIERS',
                title: 'Turn surplus into revenue',
                items: ['List a crate in under 60 seconds', 'Set your own price and pickup window', 'Get paid the day after pickup'],
                cta: 'Open supplier portal',
                to: '/suppliers',
                img: cardImages[0]?.url,
                imgAlt: cardImages[0]?.alt || 'Fisherman on a boat',
              },
              {
                tag: 'FOR CHEFS & BUYERS',
                title: "Source the day's freshest finds",
                items: ['Browse a map of nearby crates', 'Save 30–60% vs. wholesale prices', 'Build relationships with local boats'],
                cta: 'Open marketplace',
                to: '/marketplace',
                img: cardImages[1]?.url,
                imgAlt: cardImages[1]?.alt || 'Chef preparing fresh seafood',
              },
            ].map(card => (
              <div key={card.tag} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-black/5 flex flex-col h-full">
                <div className="h-[400px] relative overflow-hidden">
                  {card.img && (
                    <PexelsImage
                      src={card.img}
                      alt={card.imgAlt}
                      className="w-full h-full"
                    />
                  )}
                </div>
                <div className="p-10 lg:p-12 flex flex-col flex-grow">
                  <span className="text-sm font-bold uppercase tracking-widest text-[#F4743B] mb-4">{card.tag}</span>
                  <h3 className="text-4xl font-black mb-8 tracking-tight">{card.title}</h3>
                  <ul className="space-y-4 mb-12 flex-grow">
                    {card.items.map(item => (
                      <li key={item} className="flex items-center gap-3 text-lg text-on-surface-variant">
                        <span className="w-2 h-2 bg-[#0077B6] rounded-full flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={card.to}
                    className="w-full lg:w-max bg-primary text-white px-10 py-5 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                  >
                    {card.cta}
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-32 bg-surface">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div>
              <span className="italic-accent-caveat text-[#F4743B] text-3xl mb-4 block">how it works</span>
              <h2 className="text-6xl font-black text-on-background tracking-tight mb-16">
                From boat to kitchen, in hours.
              </h2>
              <div className="space-y-12">
                {HOW_STEPS.map(s => (
                  <div key={s.n} className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-sunset-yellow flex items-center justify-center font-bold text-xl">
                      {s.n}
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold mb-2">{s.title}</h4>
                      <p className="text-lg text-on-surface-variant">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[3rem] overflow-hidden shadow-2xl">
              {fishDisplayUrl && (
                <PexelsImage
                  src={fishDisplayUrl}
                  alt={fishDisplayAlt || 'Fresh fish display'}
                  className="w-full aspect-[4/3]"
                />
              )}
              </div>
              <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-[2rem] shadow-2xl border border-black/5 max-w-[280px]">
                <div className="bg-sky-100 text-primary w-10 h-10 rounded-lg flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-2xl">waves</span>
                </div>
                <div className="text-5xl font-black text-on-background mb-2 tracking-tighter">3.4 hrs</div>
                <p className="text-on-surface-variant leading-tight">Avg. time from listing to pickup</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="relative bg-[#00ACC1] rounded-[3rem] p-12 lg:p-24 overflow-hidden shadow-2xl">
          <div className="absolute -right-20 -top-20 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <span className="italic-accent-caveat text-sunset-yellow text-4xl mb-6 block">join the movement</span>
            <h2 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight mb-8">
              Less waste. More flavor. Healthier coasts.
            </h2>
            <p className="text-xl text-white/90 mb-12 max-w-xl leading-relaxed">
              Join California's first B2B marketplace built around the rhythm of the tide.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link to="/auth" className="bg-sunset-yellow text-on-background px-12 py-5 rounded-full font-bold text-xl shadow-xl hover:scale-105 transition-all">
                Create free account
              </Link>
              <Link to="/marketplace" className="bg-transparent border-2 border-white text-white px-12 py-5 rounded-full font-bold text-xl hover:bg-white/10 transition-all">
                Explore marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
