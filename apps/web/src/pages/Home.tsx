import { Link, useNavigate } from 'react-router-dom'
import OceanCanvas from '../components/OceanCanvas'
import { PexelsImage } from '../components/PexelsImage'
import { usePexelsBatch, usePexels } from '../hooks/usePexels'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { useListings } from '../hooks/useListings'
import { getFallbackUrl } from '../services/pexels'
import { useMemo, useState, useRef } from 'react'
import PhotoAnalysis from '../components/PhotoAnalysis'

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

// Snap & List Section - AI-powered photo-to-listing feature
function SnapAndListSection() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState('')
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [_analysisData, setAnalysisData] = useState<{
    species: string
    grade: 'sushi' | 'A' | 'B'
    estimatedWeight: { value: number; unit: 'lb' | 'kg' }
    description: string
    suggestedPrice: { min: number; max: number }
  } | null>(null)

  const handlePhotoUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const photoUrl = ev.target?.result as string
        setUploadedPhotoUrl(photoUrl)
        setShowAnalysis(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAnalysisComplete = (data: {
    species: string
    grade: 'sushi' | 'A' | 'B'
    estimatedWeight: { value: number; unit: 'lb' | 'kg' }
    description: string
    suggestedPrice: { min: number; max: number }
  }) => {
    setAnalysisData(data)
    setShowAnalysis(false)
    // Navigate to supplier portal with draft data
    navigate('/suppliers', {
      state: {
        draft: {
          species: data.species,
          grade: data.grade,
          weight: data.estimatedWeight.value.toString(),
          price: ((data.suggestedPrice.min + data.suggestedPrice.max) / 2).toFixed(2),
          photo: uploadedPhotoUrl,
        }
      }
    })
  }

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-surface to-secondary/5">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="italic-accent-caveat text-primary text-3xl mb-4 block">for suppliers</span>
            <h2 className="text-4xl lg:text-5xl font-black text-on-background tracking-tight mb-6">
              Snap a photo. We handle the rest.
            </h2>
            <p className="text-lg text-on-surface-variant mb-8 max-w-lg">
              Our AI analyzes your catch in seconds — identifying species, grading quality, 
              estimating weight, and suggesting fair market prices. Just upload and review.
            </p>

            <div className="space-y-4 mb-8">
              {[
                { icon: 'photo_camera', text: 'Take a photo of your catch' },
                { icon: 'auto_awesome', text: 'AI identifies species & grade' },
                { icon: 'edit_note', text: 'Review & publish in seconds' },
              ].map((step, i) => (
                <div key={step.text} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                  <span className="material-symbols-outlined text-primary">{step.icon}</span>
                  <span className="text-on-surface font-medium">{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {!uploadedPhotoUrl ? (
              <div
                onClick={handlePhotoUpload}
                className="bg-surface-container-lowest rounded-3xl p-12 border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer text-center"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl text-primary">photo_camera</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2">Upload your catch</h3>
                <p className="text-on-surface-variant mb-4">
                  Drop a photo here or click to browse
                </p>
                <button className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform">
                  Try It Now
                </button>
              </div>
            ) : showAnalysis ? (
              <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xl">
                <img
                  src={uploadedPhotoUrl}
                  alt="Upload preview"
                  className="w-full h-48 object-cover rounded-xl mb-4"
                />
                <PhotoAnalysis
                  photoUrl={uploadedPhotoUrl}
                  onAnalysisComplete={handleAnalysisComplete}
                  onCancel={() => {
                    setShowAnalysis(false)
                    setUploadedPhotoUrl('')
                  }}
                />
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-xl text-center">
                <span className="material-symbols-outlined text-6xl text-emerald-500 mb-4">check_circle</span>
                <h3 className="text-xl font-bold text-on-surface mb-2">Analysis Complete!</h3>
                <p className="text-on-surface-variant mb-4">
                  Redirecting you to complete your listing...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
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

      {/* ── Snap & List ── */}
      <SnapAndListSection />

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
