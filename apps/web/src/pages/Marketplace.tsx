import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useListings } from '../hooks/useListings'
import { PexelsImage } from '../components/PexelsImage'
import { getFallbackUrl } from '../services/pexels'
import type { ListingWithDistance } from '../services/listings'
import { useAuth } from '../context/AuthContext'

const GRADES = [
  { value: 'sushi', label: 'Sushi', color: 'bg-blue-500', icon: 'restaurant' },
  { value: 'A', label: 'Grade A', color: 'bg-emerald-500', icon: 'star' },
  { value: 'B', label: 'Grade B', color: 'bg-amber-500', icon: 'check_circle' },
]

const SPECIES = ['Salmon', 'Tuna', 'Cod', 'Halibut', 'Crab', 'Lobster', 'Sardines', 'Mackerel']

const FEATURED_PIER = {
  name: 'Bodega Bay Terminal',
  activeBoats: 12,
  cratesListed: 47,
  avgPrice: '$8.50/lb',
}

function formatDistance(miles: number | undefined): string {
  if (miles === undefined) return 'Unknown'
  if (miles < 0.1) return '< 0.1 mi'
  return `${miles.toFixed(1)} mi`
}

function formatPickupTime(expiresAt: { toDate: () => Date }): string {
  const expiry = expiresAt.toDate()
  const now = new Date()
  const hoursUntil = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60))

  if (hoursUntil < 1) return 'Expires soon'
  if (hoursUntil < 24) return `${hoursUntil}h left`
  return `${Math.floor(hoursUntil / 24)}d left`
}

function getUrgencyColor(hoursLeft: number): string {
  if (hoursLeft < 4) return 'text-red-500'
  if (hoursLeft < 12) return 'text-amber-500'
  return 'text-emerald-500'
}

function getBadge(listing: ListingWithDistance): { text: string; bg: string; icon: string; pulse?: boolean } | null {
  const hoursLeft = Math.floor(
    (listing.expiresAt.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60)
  )

  if (listing.grade === 'sushi') {
    return { text: 'SUSHI GRADE', bg: 'bg-gradient-to-r from-blue-600 to-blue-400', icon: 'restaurant', pulse: true }
  }
  if (hoursLeft < 4) {
    return { text: 'SUNSET SPECIAL', bg: 'bg-gradient-to-r from-orange-500 to-red-500', icon: 'wb_twilight', pulse: true }
  }
  if (listing.quantity < 10) {
    return { text: 'LOW STOCK', bg: 'bg-gradient-to-r from-amber-500 to-yellow-400', icon: 'inventory_2' }
  }
  if (listing.deliveryAvailable) {
    return { text: 'DELIVERY', bg: 'bg-gradient-to-r from-emerald-500 to-teal-400', icon: 'local_shipping' }
  }
  return null
}

// Animated wave component
function OceanWaves() {
  return (
    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-0">
      <svg
        className="relative block w-full h-24 animate-pulse"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C58.05,117.26,132.89,121.23,196.41,114.33Z"
          className="fill-primary/10"
        />
      </svg>
    </div>
  )
}

// Floating marker component
function MapMarker({
  listing,
  index,
}: {
  listing: ListingWithDistance
  index: number
}) {
  const [isHovered, setIsHovered] = useState(false)
  const hoursLeft = Math.floor(
    (listing.expiresAt.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60)
  )

  return (
    <div
      className="absolute animate-bounce"
      style={{
        top: `${15 + (index * 12) % 60}%`,
        left: `${20 + (index * 15) % 60}%`,
        animationDelay: `${index * 0.5}s`,
        animationDuration: '3s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/marketplace/${listing.id}`}>
        <div
          className={`relative flex flex-col items-center transition-all duration-300 ${
            isHovered ? 'scale-125 z-50' : ''
          }`}
        >
          {/* Price bubble */}
          <div
            className={`px-3 py-2 rounded-full font-bold shadow-xl flex items-center gap-1 cursor-pointer ${
              hoursLeft < 4
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse'
                : 'bg-gradient-to-r from-primary to-primary-container text-white'
            }`}
          >
            <span className="text-xs">$</span>
            {listing.pricePerUnit.toFixed(2)}
          </div>

          {/* Hover tooltip */}
          {isHovered && (
            <div className="absolute bottom-full mb-2 bg-white rounded-xl p-3 shadow-2xl border border-outline-variant/20 w-48 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="font-bold capitalize text-primary">{listing.species}</p>
              <p className="text-xs text-outline">{listing.grade} Grade • {listing.quantity} lbs</p>
              <p className={`text-xs font-bold mt-1 ${getUrgencyColor(hoursLeft)}`}>
                {hoursLeft < 1 ? '⚠️ Expires in minutes!' : `⏰ ${hoursLeft}h left`}
              </p>
            </div>
          )}

          {/* Anchor point */}
          <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-primary mt-1" />
        </div>
      </Link>
    </div>
  )
}

// Live activity indicator
function LiveIndicator({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
      </span>
      <span className="text-xs font-bold text-emerald-700">
        {count} active {count === 1 ? 'listing' : 'listings'}
      </span>
    </div>
  )
}

// Empty state with CTA
function EmptyState({ isAuthenticated }: { isAuthenticated: boolean }) {
  const navigate = useNavigate()

  return (
    <div className="text-center py-16 bg-gradient-to-br from-surface-container-low to-surface-container rounded-2xl border-2 border-dashed border-outline-variant/30">
      <div className="relative inline-block mb-6">
        <span className="material-symbols-outlined text-6xl text-outline/40">waves</span>
        <span className="material-symbols-outlined text-4xl text-primary absolute -bottom-2 -right-2 animate-bounce">
          search_off
        </span>
      </div>
      <h3 className="text-xl font-bold text-on-surface mb-2">The waters are calm...</h3>
      <p className="text-outline mb-6 max-w-xs mx-auto">
        No crates match your search right now. Try adjusting your filters or be the first to list!
      </p>

      {isAuthenticated ? (
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => navigate('/suppliers')}
            className="bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            List Your First Crate
          </button>
          <button
            onClick={() => window.location.reload()}
            className="text-primary font-bold hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh Search
          </button>
        </div>
      ) : (
        <button
          onClick={() => navigate('/auth')}
          className="bg-gradient-to-r from-secondary to-secondary-container text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
        >
          Sign In to Browse
        </button>
      )}
    </div>
  )
}

export default function Marketplace() {
  const { user } = useAuth()
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([])
  const [maxDistance, setMaxDistance] = useState(25)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [animatedCount, setAnimatedCount] = useState(0)

  const filters = useMemo(
    () => ({
      species: selectedSpecies,
      grades: selectedGrades,
      priceRange: [0, 100] as [number, number],
      distance: maxDistance,
    }),
    [selectedSpecies, selectedGrades, maxDistance]
  )

  const userLocation = useMemo(
    () => ({
      latitude: 37.7749,
      longitude: -122.4194,
    }),
    []
  )

  const { listings, loading, error } = useListings(filters, userLocation)

  // Animate the count when listings change
  useEffect(() => {
    const target = listings.length
    const duration = 500
    const steps = 20
    const increment = target / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setAnimatedCount(target)
        clearInterval(timer)
      } else {
        setAnimatedCount(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [listings.length])

  const filteredListings = useMemo(() => {
    if (!searchQuery) return listings
    return listings.filter((l) => l.species.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [listings, searchQuery])

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    )
  }

  const toggleSpecies = (species: string) => {
    setSelectedSpecies((prev) =>
      prev.includes(species) ? prev.filter((s) => s !== species) : [...prev, species]
    )
  }

  const clearFilters = () => {
    setSelectedGrades([])
    setSelectedSpecies([])
    setMaxDistance(25)
    setSearchQuery('')
  }

  const activeFiltersCount = selectedGrades.length + selectedSpecies.length

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-white min-h-screen">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-surface-container-low via-surface to-surface-container-high border-b border-outline-variant/10">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="italic-accent-caveat text-2xl text-secondary">Local Bounty</span>
                <LiveIndicator count={listings.length} />
              </div>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-primary">
                Discover the Catch
                <span className="material-symbols-outlined text-3xl text-secondary ml-2 animate-bounce">waves</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex bg-surface-container-high rounded-full p-1 border border-outline-variant/20">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-1 ${
                    viewMode === 'map'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">map</span>
                  Map
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-1 ${
                    viewMode === 'list'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">view_list</span>
                  List
                </button>
              </div>

              {/* Radius Control */}
              <div className="flex items-center gap-4 bg-surface-container-low p-3 px-5 rounded-xl border border-outline-variant/15 shadow-sm">
                <div className="flex flex-col gap-1 min-w-[180px]">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-outline">Search Radius</span>
                    <span className="italic-accent-caveat text-xl text-primary">{maxDistance} mi</span>
                  </div>
                  <input
                    type="range"
                    className="w-full h-2 bg-outline-variant/30 rounded-lg appearance-none cursor-pointer accent-primary"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    min={1}
                    max={100}
                  />
                </div>
              </div>

              {/* Count Badge */}
              <div className="bg-gradient-to-r from-primary to-primary-container text-white px-5 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg">
                <span className="material-symbols-outlined text-lg">package_2</span>
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <span>{animatedCount} crates</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 lg:px-12 py-8 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">
        {/* Map/List View Section */}
        <section className="relative flex flex-col gap-4">
          {/* Featured Pier Card */}
          <div className="bg-gradient-to-r from-secondary-container/50 to-tertiary-container/50 p-4 rounded-xl border border-outline-variant/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-on-secondary">anchor</span>
              </div>
              <div>
                <p className="text-xs text-outline font-bold uppercase tracking-tighter">Active Pier</p>
                <p className="font-bold text-on-surface text-lg">{FEATURED_PIER.name}</p>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <p className="font-black text-primary text-xl">{FEATURED_PIER.activeBoats}</p>
                <p className="text-outline text-xs">boats</p>
              </div>
              <div className="text-center">
                <p className="font-black text-secondary text-xl">{FEATURED_PIER.cratesListed}</p>
                <p className="text-outline text-xs">crates</p>
              </div>
              <div className="text-center">
                <p className="font-black text-tertiary text-xl">{FEATURED_PIER.avgPrice}</p>
                <p className="text-outline text-xs">avg</p>
              </div>
            </div>
          </div>

          {/* Map / List Container */}
          <div className="relative w-full flex-grow rounded-2xl overflow-hidden ocean-gradient border border-outline-variant/10 ocean-shadow min-h-[600px]">
            {viewMode === 'map' ? (
              <>
                {/* Animated Background */}
                <div className="absolute inset-0 map-grid opacity-30" />

                {/* Animated Waves SVG */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-10 animate-pulse"
                  preserveAspectRatio="none"
                  viewBox="0 0 800 600"
                >
                  <path d="M0,100 Q200,50 400,100 T800,100" fill="none" stroke="#1e78b4" strokeWidth="2">
                    <animate
                      attributeName="d"
                      dur="4s"
                      repeatCount="indefinite"
                      values="M0,100 Q200,50 400,100 T800,100;M0,100 Q200,150 400,100 T800,100;M0,100 Q200,50 400,100 T800,100"
                    />
                  </path>
                  <path d="M0,200 Q200,150 400,200 T800,200" fill="none" stroke="#1e78b4" strokeWidth="1.5" opacity="0.6">
                    <animate
                      attributeName="d"
                      dur="5s"
                      repeatCount="indefinite"
                      values="M0,200 Q200,150 400,200 T800,200;M0,200 Q200,250 400,200 T800,200;M0,200 Q200,150 400,200 T800,200"
                    />
                  </path>
                  <path d="M0,300 Q200,250 400,300 T800,300" fill="none" stroke="#1e78b4" strokeWidth="1" opacity="0.4">
                    <animate
                      attributeName="d"
                      dur="6s"
                      repeatCount="indefinite"
                      values="M0,300 Q200,250 400,300 T800,300;M0,300 Q200,350 400,300 T800,300;M0,300 Q200,250 400,300 T800,300"
                    />
                  </path>
                </svg>

                {/* User Location Pulse */}
                <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-40 h-40 border-2 border-dashed border-primary/40 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
                    <div className="absolute w-32 h-32 border border-primary/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="w-4 h-4 bg-primary rounded-full border-4 border-white shadow-xl z-10" />
                  </div>
                </div>

                {/* Listing Markers */}
                {!loading &&
                  filteredListings.map((listing, i) => <MapMarker key={listing.id} listing={listing} index={i} />)}

                {/* Ocean Waves at Bottom */}
                <OceanWaves />
              </>
            ) : (
              /* List View */
              <div className="absolute inset-0 overflow-y-auto p-6">
                {filteredListings.length === 0 ? (
                  <EmptyState isAuthenticated={!!user} />
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {filteredListings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/30 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">filter_list</span>
                  <span className="font-bold text-sm">{activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}</span>
                  <button
                    onClick={clearFilters}
                    className="ml-1 text-outline hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="flex flex-col h-full">
          <div className="sticky top-28 z-40 bg-surface pb-6 flex flex-col gap-4">
            {/* Search */}
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                search
              </span>
              <input
                type="text"
                placeholder="Search species, harbor, or boat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 rounded-xl py-4 pl-12 pr-10 focus:ring-0 placeholder:text-outline/50 font-medium outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-error"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            {/* Grade Filters */}
            <div className="flex gap-2 flex-wrap">
              {GRADES.map((grade) => {
                const isActive = selectedGrades.includes(grade.value)
                return (
                  <button
                    key={grade.value}
                    onClick={() => toggleGrade(grade.value)}
                    className={`px-4 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-1.5 ${
                      isActive
                        ? `${grade.color} text-white shadow-lg scale-105`
                        : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{grade.icon}</span>
                    {grade.label}
                  </button>
                )
              })}
            </div>

            {/* Species Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {SPECIES.map((species) => (
                <button
                  key={species}
                  onClick={() => toggleSpecies(species)}
                  className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all flex items-center gap-1 ${
                    selectedSpecies.includes(species)
                      ? 'bg-secondary text-white shadow-md scale-105'
                      : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {selectedSpecies.includes(species) && (
                    <span className="material-symbols-outlined text-sm">check</span>
                  )}
                  {species}
                </button>
              ))}
            </div>

            {/* Results Header */}
            <div className="flex justify-between items-center px-2 pt-2 border-t border-outline-variant/10">
              <span className="text-sm font-bold text-outline uppercase tracking-widest">
                {filteredListings.length} results
              </span>
              <button className="flex items-center gap-1 text-sm font-bold text-primary hover:gap-2 transition-all">
                Sort: Distance
                <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
              </button>
            </div>
          </div>

          {/* Listings Cards */}
          <div className="flex flex-col gap-5 overflow-y-auto pb-12 pr-2">
            {loading && (
              <div className="text-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
                  <span className="material-symbols-outlined text-primary text-2xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse">
                    waves
                  </span>
                </div>
                <p className="text-outline mt-4 animate-pulse">Scanning the horizon...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
                <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
                <p className="text-red-700 font-medium">Error loading listings</p>
                <button onClick={() => window.location.reload()} className="text-red-500 text-sm hover:underline mt-2">
                  Try again
                </button>
              </div>
            )}

            {!loading && filteredListings.length === 0 && <EmptyState isAuthenticated={!!user} />}

            {!loading &&
              filteredListings.map((listing) => <ListingListItem key={listing.id} listing={listing} />)}
          </div>
        </aside>
      </main>
    </div>
  )
}

// Compact card for grid view
function ListingCard({ listing }: { listing: ListingWithDistance }) {
  const badge = getBadge(listing)
  const photo = listing.photos?.[0] || getFallbackUrl(listing.species.toLowerCase())
  const hoursLeft = Math.floor((listing.expiresAt.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60))

  return (
    <Link
      to={`/marketplace/${listing.id}`}
      className="bg-surface-container-lowest rounded-xl overflow-hidden ocean-shadow border border-outline-variant/10 group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-40">
        <PexelsImage
          src={photo}
          alt={`${listing.species} - ${listing.grade} grade`}
          className="transition-transform duration-500 group-hover:scale-110"
        />
        {badge && (
          <div
            className={`absolute top-3 left-3 ${badge.bg} text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 ${badge.pulse ? 'animate-pulse' : ''}`}
          >
            <span className="material-symbols-outlined text-xs">{badge.icon}</span>
            {badge.text}
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/50 uppercase text-primary">
          {listing.grade}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex justify-between items-end">
            <span className="text-white font-bold capitalize">{listing.species}</span>
            <span className={`font-bold ${getUrgencyColor(hoursLeft)}`}>
              {hoursLeft < 1 ? '⚠️ Expiring!' : `${hoursLeft}h left`}
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-2xl font-black text-primary">
            ${listing.pricePerUnit.toFixed(2)}
            <span className="text-sm text-outline font-normal">/lb</span>
          </span>
          <span className="text-sm text-outline">{listing.quantity} {listing.unit}</span>
        </div>
        <button className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-2 rounded-full font-bold text-sm shadow-md group-hover:shadow-lg transition-all group-hover:scale-[1.02]">
          Claim Now
        </button>
      </div>
    </Link>
  )
}

// List item for sidebar
function ListingListItem({ listing }: { listing: ListingWithDistance }) {
  const badge = getBadge(listing)
  const photo = listing.photos?.[0] || getFallbackUrl(listing.species.toLowerCase())

  return (
    <Link
      to={`/marketplace/${listing.id}`}
      className="bg-surface-container-lowest rounded-xl overflow-hidden ocean-shadow border border-outline-variant/10 group block hover:shadow-lg transition-all duration-300"
    >
      <div className="relative h-44">
        <PexelsImage
          src={photo}
          alt={`${listing.species} - ${listing.grade} grade`}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {badge && (
          <div
            className={`absolute top-4 left-4 ${badge.bg} text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 ${badge.pulse ? 'animate-pulse' : ''}`}
          >
            <span className="material-symbols-outlined text-sm">{badge.icon}</span>
            {badge.text}
          </div>
        )}
        <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold border border-white/30 uppercase">
          {listing.grade} GRADE
        </div>

        {/* Distance overlay */}
        {listing.distance !== undefined && (
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-bold">
            <span className="material-symbols-outlined text-sm mr-1">location_on</span>
            {formatDistance(listing.distance)}
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-primary capitalize">{listing.species}</h3>
            <p className="text-sm text-outline">Fresh from local waters</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-primary">
              <span className="text-sm">$</span>
              {listing.pricePerUnit.toFixed(2)}
            </div>
            <div className="text-xs text-outline">per lb</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { icon: 'scale', label: `${listing.quantity} ${listing.unit}` },
            { icon: 'distance', label: formatDistance(listing.distance) },
            { icon: 'schedule', label: formatPickupTime(listing.expiresAt) },
          ].map((tag) => (
            <span
              key={tag.label}
              className="px-3 py-1.5 bg-surface-container-low text-outline-variant text-[10px] font-bold rounded-full uppercase tracking-widest border border-outline-variant/10 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {tag.icon}
              </span>
              {tag.label}
            </span>
          ))}
        </div>

        <button className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">shopping_basket</span>
          Claim Crate
        </button>
      </div>
    </Link>
  )
}
