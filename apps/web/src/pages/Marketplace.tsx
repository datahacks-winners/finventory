import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListings } from '../hooks/useListings'
import { PexelsImage } from '../components/PexelsImage'
import { getFallbackUrl } from '../services/pexels'
import type { ListingWithDistance } from '../services/listings'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'shellfish', label: 'Shellfish', icon: 'set_meal' },
  { id: 'finfish', label: 'Finfish', icon: 'phishing' },
  { id: 'crustacean', label: 'Crustaceans', icon: 'pest_control' },
  { id: 'sushi', label: 'Sushi Grade', icon: 'restaurant' },
]

// Categorize listings for personalization
interface CategorizedListings {
  featured: ListingWithDistance[]
  nearYou: ListingWithDistance[]
  trending: ListingWithDistance[]
  sushiGrade: ListingWithDistance[]
  sunsetSpecials: ListingWithDistance[]
  all: ListingWithDistance[]
}

function categorizeListings(listings: ListingWithDistance[]): CategorizedListings {
  const now = new Date()
  const hoursLeft = (listing: ListingWithDistance) => 
    Math.floor((listing.expiresAt.toDate().getTime() - now.getTime()) / (1000 * 60 * 60))

  return {
    featured: listings.slice(0, 4),
    nearYou: listings.filter(l => l.distance && l.distance < 10).slice(0, 4),
    trending: listings.filter(l => l.deliveryAvailable).slice(0, 4),
    sushiGrade: listings.filter(l => l.grade === 'sushi').slice(0, 4),
    sunsetSpecials: listings.filter(l => hoursLeft(l) < 6).slice(0, 4),
    all: listings,
  }
}

function formatDistance(miles: number | undefined): string {
  if (miles === undefined) return ''
  if (miles < 0.1) return '< 0.1 mi'
  return `${miles.toFixed(1)} mi`
}

function formatTimeLeft(expiresAt: { toDate: () => Date }): string {
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

// Pinterest-style masonry card
function ListingCard({ listing, size = 'medium' }: { listing: ListingWithDistance; size?: 'small' | 'medium' | 'large' }) {
  const navigate = useNavigate()
  const photo = listing.photos?.[0] || getFallbackUrl(listing.species.toLowerCase())
  const hoursLeft = Math.floor((listing.expiresAt.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60))

  const heightClass = size === 'large' ? 'h-80' : size === 'small' ? 'h-48' : 'h-64'

  return (
    <div
      onClick={() => navigate(`/marketplace/${listing.id}`)}
      className="group relative rounded-2xl overflow-hidden cursor-pointer bg-surface-container-lowest shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className={`${heightClass} relative overflow-hidden`}>
        <PexelsImage
          src={photo}
          alt={`${listing.species} - ${listing.grade} grade`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          {listing.grade === 'sushi' && (
            <span className="bg-blue-500 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
              <span className="material-symbols-outlined text-sm">restaurant</span>
              Sushi
            </span>
          )}
          {hoursLeft < 6 && (
            <span className="bg-orange-500 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg animate-pulse">
              <span className="material-symbols-outlined text-sm">wb_twilight</span>
              Sunset
            </span>
          )}
          {listing.deliveryAvailable && (
            <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg ml-auto">
              <span className="material-symbols-outlined text-sm">local_shipping</span>
              Delivery
            </span>
          )}
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-white font-bold text-lg capitalize leading-tight">{listing.species}</h3>
              <p className="text-white/80 text-sm">{listing.sellerName || 'Local Supplier'}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-black text-2xl">${listing.pricePerUnit.toFixed(0)}</p>
              <p className="text-white/70 text-xs">/lb</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-white/70 text-xs">
            {listing.distance !== undefined && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {formatDistance(listing.distance)}
              </span>
            )}
            <span className={`flex items-center gap-1 ${getUrgencyColor(hoursLeft)}`}>
              <span className="material-symbols-outlined text-sm">schedule</span>
              {formatTimeLeft(listing.expiresAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Hover action */}
      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <button className="bg-white text-primary px-6 py-3 rounded-full font-bold shadow-xl transform scale-90 group-hover:scale-100 transition-transform flex items-center gap-2">
          <span className="material-symbols-outlined">shopping_basket</span>
          Claim
        </button>
      </div>
    </div>
  )
}

// Section header component
function SectionHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-primary">{icon}</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface">{title}</h2>
          {subtitle && <p className="text-sm text-outline">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-primary font-medium text-sm hover:underline flex items-center gap-1"
        >
          {action.label}
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      )}
    </div>
  )
}

// Masonry grid section
function MasonryGrid({ listings, columns = 4 }: { listings: ListingWithDistance[]; columns?: number }) {
  const getSize = (index: number): 'small' | 'medium' | 'large' => {
    // Create visual variety like Pinterest
    const pattern = index % 7
    if (pattern === 0 || pattern === 5) return 'large'
    if (pattern === 2 || pattern === 6) return 'small'
    return 'medium'
  }

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  }

  return (
    <div className={`grid ${gridCols[columns as keyof typeof gridCols] || 'grid-cols-4'} gap-4`}>
      {listings.map((listing, index) => (
        <ListingCard key={listing.id} listing={listing} size={getSize(index)} />
      ))}
    </div>
  )
}

// Empty state
function EmptyState({ isAuthenticated, onClearFilters }: { isAuthenticated: boolean; onClearFilters: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="text-center py-20 bg-surface-container rounded-3xl border-2 border-dashed border-outline-variant/30">
      <span className="material-symbols-outlined text-6xl text-outline/40 mb-4">waves</span>
      <h3 className="text-xl font-bold text-on-surface mb-2">No catches found</h3>
      <p className="text-outline mb-6 max-w-sm mx-auto">
        We couldn't find any seafood matching your filters. Try adjusting your search or browse all listings.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onClearFilters}
          className="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-full font-medium hover:bg-surface-container-highest transition-colors"
        >
          Clear Filters
        </button>
        {isAuthenticated ? (
          <button
            onClick={() => navigate('/suppliers')}
            className="bg-primary text-white px-5 py-2.5 rounded-full font-medium hover:scale-105 transition-transform"
          >
            List Seafood
          </button>
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="bg-primary text-white px-5 py-2.5 rounded-full font-medium hover:scale-105 transition-transform"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  )
}

// Search and filter bar
function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  activeFiltersCount,
  onClearFilters,
}: {
  searchQuery: string
  setSearchQuery: (s: string) => void
  selectedCategory: string
  setSelectedCategory: (c: string) => void
  activeFiltersCount: number
  onClearFilters: () => void
}) {
  return (
    <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/10 py-4">
      <div className="max-w-7xl mx-auto px-4">
        {/* Search */}
        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            type="text"
            placeholder="Search salmon, tuna, crab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 text-lg font-medium placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20 outline-none"
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

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 px-4 py-2.5 rounded-full font-medium text-sm text-error hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Marketplace() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])

  const filters = useMemo(
    () => ({
      species: [],
      grades: selectedGrades,
      priceRange: [0, 1000] as [number, number],
      distance: 100,
    }),
    [selectedGrades]
  )

  const userLocation = useMemo(
    () => ({
      latitude: 37.7749,
      longitude: -122.4194,
    }),
    []
  )

  const { listings, loading, error } = useListings(filters, userLocation)

  // Filter by category and search
  const filteredListings = useMemo(() => {
    let filtered = listings

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((l) =>
        l.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.sellerName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      switch (selectedCategory) {
        case 'shellfish':
          filtered = filtered.filter((l) =>
            ['oyster', 'clam', 'mussel', 'scallop'].some((s) =>
              l.species.toLowerCase().includes(s)
            )
          )
          break
        case 'finfish':
          filtered = filtered.filter((l) =>
            ['salmon', 'tuna', 'cod', 'bass', 'halibut', 'rockfish', 'sturgeon'].some((s) =>
              l.species.toLowerCase().includes(s)
            )
          )
          break
        case 'crustacean':
          filtered = filtered.filter((l) =>
            ['crab', 'lobster', 'prawn', 'shrimp', 'crayfish'].some((s) =>
              l.species.toLowerCase().includes(s)
            )
          )
          break
        case 'sushi':
          filtered = filtered.filter((l) => l.grade === 'sushi')
          break
      }
    }

    return filtered
  }, [listings, searchQuery, selectedCategory])

  const categorized = useMemo(() => categorizeListings(filteredListings), [filteredListings])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedGrades([])
  }

  const activeFiltersCount = (searchQuery ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0) + selectedGrades.length

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary mb-1">Local Marketplace</p>
              <h1 className="text-3xl font-black tracking-tight">Today's Catch</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-sm font-medium text-emerald-700">
                  {listings.length} active listings
                </span>
              </div>
              <button
                onClick={() => navigate('/suppliers')}
                className="bg-primary text-white px-5 py-2.5 rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                Sell
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={clearFilters}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
              <span className="material-symbols-outlined text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse">
                waves
              </span>
            </div>
            <p className="text-outline mt-4">Loading fresh catches...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
            <p className="text-red-700 font-medium">Error loading listings</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <EmptyState isAuthenticated={!!user} onClearFilters={clearFilters} />
        ) : (
          <div className="space-y-12">
            {/* Personalized: Featured */}
            {categorized.featured.length > 0 && !searchQuery && selectedCategory === 'all' && (
              <section>
                <SectionHeader
                  title="Featured Today"
                  subtitle="Hand-picked premium catches"
                  icon="auto_awesome"
                  action={{ label: 'View all', onClick: () => navigate('/marketplace') }}
                />
                <MasonryGrid listings={categorized.featured} columns={4} />
              </section>
            )}

            {/* Personalized: Near You */}
            {categorized.nearYou.length > 0 && !searchQuery && selectedCategory === 'all' && (
              <section>
                <SectionHeader
                  title="Near You"
                  subtitle="Within 10 miles of your location"
                  icon="near_me"
                  action={{ label: 'See map', onClick: () => {} }}
                />
                <MasonryGrid listings={categorized.nearYou} columns={4} />
              </section>
            )}

            {/* Personalized: Sunset Specials */}
            {categorized.sunsetSpecials.length > 0 && !searchQuery && selectedCategory === 'all' && (
              <section>
                <SectionHeader
                  title="Sunset Specials"
                  subtitle="Expiring soon - grab them before they're gone!"
                  icon="wb_twilight"
                />
                <MasonryGrid listings={categorized.sunsetSpecials} columns={4} />
              </section>
            )}

            {/* Personalized: Sushi Grade */}
            {categorized.sushiGrade.length > 0 && !searchQuery && selectedCategory === 'all' && (
              <section>
                <SectionHeader
                  title="Sushi Grade"
                  subtitle="Restaurant-quality, certified fresh"
                  icon="restaurant"
                />
                <MasonryGrid listings={categorized.sushiGrade} columns={4} />
              </section>
            )}

            {/* All Listings */}
            <section>
              <SectionHeader
                title={searchQuery || selectedCategory !== 'all' ? 'Search Results' : 'All Listings'}
                subtitle={`${filteredListings.length} catches available`}
                icon="grid_view"
              />
              <MasonryGrid listings={filteredListings} columns={4} />
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
