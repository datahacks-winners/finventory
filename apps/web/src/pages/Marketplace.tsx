import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useListings } from '../hooks/useListings'
import { PexelsImage } from '../components/PexelsImage'
import { getFallbackUrl } from '../services/pexels'
import type { ListingWithDistance } from '../services/listings'

const _FILTER_TAGS = ['All', 'Bycatch', 'Surplus', 'Off-cut', 'Whole']

const GRADES = [
  { value: 'sushi', label: 'Sushi' },
  { value: 'A', label: 'Grade A' },
  { value: 'B', label: 'Grade B' },
]

const SPECIES = ['Salmon', 'Tuna', 'Cod', 'Halibut', 'Crab', 'Lobster']

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
  if (hoursUntil < 24) return `Pickup: ${hoursUntil}h left`
  return `Pickup: ${Math.floor(hoursUntil / 24)}d left`
}

function getBadge(listing: ListingWithDistance): { text: string; bg: string } | null {
  const hoursLeft = Math.floor(
    (listing.expiresAt.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60)
  )

  if (listing.grade === 'sushi') {
    return { text: 'SUSHI GRADE', bg: 'bg-blue-600' }
  }
  if (hoursLeft < 4) {
    return { text: 'SUNSET DISCOUNT', bg: 'bg-secondary' }
  }
  if (listing.quantity < 10) {
    return { text: 'LOW STOCK', bg: 'bg-tertiary' }
  }
  return null
}

export default function Marketplace() {
  const [_activeFilter, _setActiveFilter] = useState('All')
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([])
  const [maxDistance, setMaxDistance] = useState(25)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredListings = useMemo(() => {
    if (!searchQuery) return listings
    return listings.filter((l) =>
      l.species.toLowerCase().includes(searchQuery.toLowerCase())
    )
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

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-white">
      <main className="max-w-[1600px] mx-auto px-12 py-8 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-12 min-h-[calc(100vh-100px)]">
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
                  <span className="italic-accent-caveat text-xl text-primary">{maxDistance} mi</span>
                </div>
                <input
                  type="range"
                  className="w-full h-1.5 bg-outline-variant/30 rounded-lg appearance-none cursor-pointer accent-primary"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  min={1}
                  max={100}
                />
              </div>
              <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  package_2
                </span>
                {loading ? 'Loading...' : `${filteredListings.length} crates available`}
              </div>
            </div>
          </div>

          <div className="relative w-full flex-grow rounded-lg overflow-hidden ocean-gradient border border-outline-variant/10 ocean-shadow min-h-[600px]">
            <div className="absolute inset-0 map-grid" />
            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 800 600">
              <path d="M0,0 L300,0 Q350,150 250,300 T300,600 L0,600 Z" fill="#ebd6c9" />
            </svg>

            <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-32 h-32 border-2 border-dashed border-primary/30 rounded-full animate-pulse" />
                <div className="w-6 h-6 bg-primary rounded-full border-4 border-white shadow-lg z-10" />
                <div className="absolute w-6 h-6 bg-primary rounded-full animate-ping opacity-75" />
              </div>
            </div>

            {!loading &&
              filteredListings.slice(0, 5).map((listing, i) => (
                <div
                  key={listing.id}
                  className="absolute group"
                  style={{
                    top: `${20 + i * 15}%`,
                    left: `${50 + (i % 2) * 20}%`,
                  }}
                >
                  <Link to={`/marketplace/${listing.id}`}>
                    <div className="bg-primary text-white px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1 cursor-pointer transition-transform hover:scale-110">
                      <span className="text-xs">$</span>
                      {listing.pricePerUnit.toFixed(2)}
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-primary" />
                  </Link>
                </div>
              ))}

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

        <aside className="flex flex-col h-full">
          <div className="sticky top-28 z-40 bg-surface pb-6 flex flex-col gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                type="text"
                placeholder="Search species..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 placeholder:text-outline/50 font-medium outline-none"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {GRADES.map((grade) => (
                <button
                  key={grade.value}
                  onClick={() => toggleGrade(grade.value)}
                  className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                    selectedGrades.includes(grade.value)
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {grade.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {SPECIES.map((species) => (
                <button
                  key={species}
                  onClick={() => toggleSpecies(species)}
                  className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${
                    selectedSpecies.includes(species)
                      ? 'bg-secondary text-white shadow-md'
                      : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {species}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center px-2">
              <span className="text-sm font-bold text-outline uppercase tracking-widest">
                Showing {filteredListings.length} results
              </span>
              <button className="flex items-center gap-1 text-sm font-bold text-primary">
                Sort by: Distance
                <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6 overflow-y-auto pb-12 pr-2">
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-outline">Loading listings...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-error">Error loading listings</p>
              </div>
            )}

            {!loading && filteredListings.length === 0 && (
              <div className="text-center py-12 bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-4xl text-outline mb-4">search_off</span>
                <p className="text-outline">No listings found</p>
                <p className="text-sm text-outline-variant mt-2">Try adjusting your filters</p>
              </div>
            )}

            {filteredListings.map((listing) => {
              const badge = getBadge(listing)
              const photo = listing.photos?.[0] || getFallbackUrl(listing.species.toLowerCase())

              return (
                <Link
                  key={listing.id}
                  to={`/marketplace/${listing.id}`}
                  className="bg-surface-container-lowest rounded-lg overflow-hidden ocean-shadow border border-outline-variant/10 group block"
                >
                  <div className="relative h-48">
                    <PexelsImage
                      src={photo}
                      alt={`${listing.species} - ${listing.grade} grade`}
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                    {badge && (
                      <div className={`absolute top-4 left-4 ${badge.bg} text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg`}>
                        {badge.text}
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold border border-white/30 uppercase">
                      {listing.grade} GRADE
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold tracking-tight text-primary capitalize">{listing.species}</h3>
                      <div className="text-2xl font-black text-primary">
                        <span className="text-sm">$</span>
                        {listing.pricePerUnit.toFixed(2)}
                        <span className="text-xs text-outline font-normal">/lb</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {[
                        { icon: 'scale', label: `${listing.quantity} ${listing.unit}` },
                        { icon: 'distance', label: formatDistance(listing.distance) },
                        { icon: 'schedule', label: formatPickupTime(listing.expiresAt) },
                      ].map((tag) => (
                        <span
                          key={tag.label}
                          className="px-3 py-1 bg-surface-container-low text-outline-variant text-[10px] font-bold rounded-full uppercase tracking-widest border border-outline-variant/10 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            {tag.icon}
                          </span>
                          {tag.label}
                        </span>
                      ))}
                    </div>
                    <button className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3 rounded-full font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                      Claim Crate
                    </button>
                  </div>
                </Link>
              )
            })}
          </div>
        </aside>
      </main>
    </div>
  )
}
