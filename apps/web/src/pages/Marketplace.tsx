import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useListings } from '../hooks/useListings'
import { getFallbackUrl } from '../services/pexels'
import type { ListingWithDistance } from '../services/listings'

const GRADES = [
  { value: 'sushi', label: 'Sushi', color: 'bg-blue-500' },
  { value: 'A', label: 'Grade A', color: 'bg-emerald-500' },
  { value: 'B', label: 'Grade B', color: 'bg-amber-500' },
]

const SPECIES_LIST = [
  'Salmon', 'Tuna', 'Cod', 'Halibut', 'Crab', 'Lobster', 
  'Sardines', 'Mackerel', 'Shrimp', 'Snapper', 'Sea Bass', 'Trout'
]

interface CartItem {
  listing: ListingWithDistance
  weight: number
}

function formatDistance(miles: number | undefined): string {
  if (miles === undefined) return ''
  if (miles < 0.1) return '< 0.1 mi'
  return `${miles.toFixed(1)} mi`
}

function formatTimeLeft(expiresAt: { toDate: () => Date }): string {
  const hours = Math.floor((expiresAt.toDate().getTime() - Date.now()) / (1000 * 60 * 60))
  if (hours < 1) return 'Expires soon'
  if (hours < 24) return `${hours}h left`
  return `${Math.floor(hours / 24)}d left`
}

function ProductCard({ 
  listing, 
  cartItem,
  onAddToCart,
  onUpdateWeight,
  onRemove
}: { 
  listing: ListingWithDistance
  cartItem?: CartItem
  onAddToCart: (listing: ListingWithDistance, weight: number) => void
  onUpdateWeight: (id: string, weight: number) => void
  onRemove: (id: string) => void
}) {
  const [weight, setWeight] = useState(5)
  
  const photoUrl = listing.photos?.[0]
  const photo = photoUrl && !photoUrl.includes('storage.googleapis.com/finventory-listings') 
    ? photoUrl 
    : getFallbackUrl(listing.species.toLowerCase())
  const grade = GRADES.find(g => g.value === listing.grade) || GRADES[1]
  const hoursLeft = Math.floor((listing.expiresAt.toDate().getTime() - Date.now()) / (1000 * 60 * 60))
  const isUrgent = hoursLeft < 4
  
  const totalPrice = listing.pricePerUnit * weight
  const inCart = !!cartItem

  return (
    <div 
      className={`group bg-white rounded-2xl overflow-hidden border transition-all duration-300 ${
        inCart ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 hover:border-primary/50 hover:shadow-xl'
      } ${isUrgent ? 'ring-1 ring-orange-400' : ''}`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img 
          src={photo} 
          alt={listing.species}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <span className={`${grade.color} text-white px-3 py-1 rounded-full text-xs font-bold uppercase`}>
            {grade.label}
          </span>
          {isUrgent && (
            <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              Sunset Special
            </span>
          )}
          {listing.deliveryAvailable && (
            <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">local_shipping</span>
              Delivery
            </span>
          )}
        </div>

        {/* Distance badge */}
        {listing.distance !== undefined && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-700">
            <span className="material-symbols-outlined text-xs align-middle mr-1">location_on</span>
            {formatDistance(listing.distance)}
          </div>
        )}

        {/* Time left overlay */}
        <div className={`absolute bottom-0 left-0 right-0 px-3 py-2 text-xs font-bold ${
          isUrgent ? 'bg-orange-500 text-white' : 'bg-black/60 text-white'
        }`}>
          <span className="material-symbols-outlined text-xs align-middle mr-1">schedule</span>
          {formatTimeLeft(listing.expiresAt)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-900 capitalize">{listing.species}</h3>
          <span className="text-2xl font-black text-primary">
            ${listing.pricePerUnit.toFixed(2)}
            <span className="text-sm font-medium text-slate-500">/lb</span>
          </span>
        </div>

        <p className="text-sm text-slate-500 mb-1">
          <span className="material-symbols-outlined text-xs align-middle mr-1">anchor</span>
          {listing.sellerName || 'Local Fisher'} • {listing.location.address?.split(',')[0] || 'Local Harbor'}
        </p>

        {/* Rating Stars */}
        {listing.rating && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${star <= Math.round(listing.rating!) ? 'fill-current' : 'text-slate-300'}`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-medium text-slate-700">{listing.rating.toFixed(1)}</span>
            {listing.reviewCount && (
              <span className="text-sm text-slate-400">({listing.reviewCount} reviews)</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <span className="material-symbols-outlined text-sm">scale</span>
          {listing.quantity} lbs available
        </div>

        {/* Weight Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Quantity:</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setWeight(w => Math.max(1, w - 1))}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                -
              </button>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Math.max(1, Math.min(listing.quantity, parseInt(e.target.value) || 1)))}
                  className="w-16 text-center font-bold text-lg border-b-2 border-slate-200 focus:border-primary outline-none"
                  min={1}
                  max={listing.quantity}
                />
                <span className="text-sm text-slate-500">lbs</span>
              </div>
              <button 
                onClick={() => setWeight(w => Math.min(listing.quantity, w + 1))}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Total price */}
          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <span className="text-sm text-slate-500">Total:</span>
            <span className="text-xl font-black text-slate-900">${totalPrice.toFixed(2)}</span>
          </div>

          {/* Add to Cart Button */}
          {inCart ? (
            <div className="flex gap-2">
              <button
                onClick={() => onUpdateWeight(listing.id, weight)}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">update</span>
                Update ({cartItem?.weight} lbs)
              </button>
              <button
                onClick={() => onRemove(listing.id)}
                className="px-4 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAddToCart(listing, weight)}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add_shopping_cart</span>
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const ITEMS_PER_PAGE = 12

export default function Marketplace() {
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([])
  const [maxDistance, setMaxDistance] = useState(9999)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'distance' | 'price' | 'freshness'>('distance')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const filters = useMemo(() => ({
    species: selectedSpecies,
    grades: selectedGrades,
    priceRange: [0, 1000] as [number, number],
    distance: maxDistance,
  }), [selectedSpecies, selectedGrades, maxDistance])

  const userLocation = useMemo(() => ({
    latitude: 32.7,  // San Diego (where mock data is located)
    longitude: -117.0,
  }), [])

  const { listings, loading } = useListings(filters, userLocation)

  const filteredListings = useMemo(() => {
    let filtered = listings
    
    if (searchQuery) {
      filtered = filtered.filter(l => 
        l.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.sellerName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort
    switch (sortBy) {
      case 'price':
        filtered = [...filtered].sort((a, b) => a.pricePerUnit - b.pricePerUnit)
        break
      case 'freshness':
        filtered = [...filtered].sort((a, b) => a.expiresAt.toDate().getTime() - b.expiresAt.toDate().getTime())
        break
      default:
        // Already sorted by distance from useListings
        break
    }

    return filtered
  }, [listings, searchQuery, sortBy])

  // Pagination logic
  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE)
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredListings.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredListings, currentPage])

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedGrades, selectedSpecies, maxDistance, sortBy])

  const addToCart = (listing: ListingWithDistance, weight: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.listing.id === listing.id)
      if (existing) {
        return prev.map(item => 
          item.listing.id === listing.id 
            ? { ...item, weight }
            : item
        )
      }
      return [...prev, { listing, weight }]
    })
  }

  const updateCartWeight = (id: string, weight: number) => {
    setCart(prev => prev.map(item => 
      item.listing.id === id ? { ...item, weight } : item
    ))
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.listing.id !== id))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.listing.pricePerUnit * item.weight), 0)
  const cartWeight = cart.reduce((sum, item) => sum + item.weight, 0)

  const toggleGrade = (grade: string) => {
    setSelectedGrades(prev => 
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    )
  }

  const toggleSpecies = (species: string) => {
    setSelectedSpecies(prev => 
      prev.includes(species) ? prev.filter(s => s !== species) : [...prev, species]
    )
  }

  const clearFilters = () => {
    setSelectedGrades([])
    setSelectedSpecies([])
    setMaxDistance(100)
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Title & Count */}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">Fish Market</h1>
              <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">
                {filteredListings.length} available
              </span>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xl relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="Search fish, harbor, or seller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 border-0 rounded-full py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>

            {/* Sort & Cart */}
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'distance' | 'price' | 'freshness')}
                className="bg-slate-100 border-0 rounded-full py-3 px-4 font-medium focus:ring-2 focus:ring-primary/20"
              >
                <option value="distance">Nearest First</option>
                <option value="price">Best Price</option>
                <option value="freshness">Freshness</option>
              </select>

              <button
                onClick={() => setShowCart(!showCart)}
                className={`relative px-4 py-3 rounded-full font-bold flex items-center gap-2 transition-colors ${
                  cart.length > 0 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined">shopping_cart</span>
                <span className="hidden sm:inline">
                  {cart.length > 0 ? `${cart.length} items` : 'Cart'}
                </span>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 space-y-6">
            {/* Clear filters */}
            {(selectedGrades.length > 0 || selectedSpecies.length > 0 || searchQuery) && (
              <button
                onClick={clearFilters}
                className="w-full text-sm text-primary font-bold hover:underline flex items-center justify-center gap-1 py-2"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                Clear all filters
              </button>
            )}

            {/* Grade Filter */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">stars</span>
                Quality Grade
              </h3>
              <div className="space-y-2">
                {GRADES.map(grade => (
                  <label 
                    key={grade.value}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      selectedGrades.includes(grade.value) 
                        ? 'bg-primary/10 border-2 border-primary' 
                        : 'bg-white border-2 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGrades.includes(grade.value)}
                      onChange={() => toggleGrade(grade.value)}
                      className="hidden"
                    />
                    <span className={`w-4 h-4 rounded-full ${grade.color}`} />
                    <span className="font-medium">{grade.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Species Filter */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">set_meal</span>
                Species
              </h3>
              <div className="flex flex-wrap gap-2">
                {SPECIES_LIST.map(species => (
                  <button
                    key={species}
                    onClick={() => toggleSpecies(species)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedSpecies.includes(species)
                        ? 'bg-primary text-white'
                        : 'bg-white border border-slate-200 hover:border-primary'
                    }`}
                  >
                    {species}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">near_me</span>
                Max Distance
              </h3>
              <div className="bg-white p-4 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-500">Within</span>
                  <span className="font-bold text-primary">{maxDistance} mi</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={1000}
                  step={10}
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between mt-1 text-xs text-slate-400">
                  <span>5 mi</span>
                  <span>1000 mi</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <main className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-6xl text-slate-300">search_off</span>
                <h3 className="text-xl font-bold text-slate-700 mt-4">No fish found</h3>
                <p className="text-slate-500 mt-2">Try adjusting your filters</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 bg-primary text-white px-6 py-2 rounded-full font-bold"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedListings.map(listing => (
                    <ProductCard
                      key={listing.id}
                      listing={listing}
                      cartItem={cart.find(item => item.listing.id === listing.id)}
                      onAddToCart={addToCart}
                      onUpdateWeight={updateCartWeight}
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      <span className="material-symbols-outlined text-sm align-middle">chevron_left</span>
                      Prev
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-lg font-bold transition-colors ${
                              currentPage === pageNum
                                ? 'bg-primary text-white'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Next
                      <span className="material-symbols-outlined text-sm align-middle">chevron_right</span>
                    </button>
                  </div>
                )}

                {/* Showing text */}
                <p className="text-center text-sm text-slate-500 mt-4">
                  Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredListings.length)} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredListings.length)} of {filteredListings.length} listings
                </p>
              </>
            )}
          </main>

          {/* Cart Sidebar */}
          {showCart && (
            <aside className="lg:w-80 bg-white rounded-2xl border border-slate-200 p-6 h-fit sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">shopping_bag</span>
                  Your Cart
                </h2>
                <button 
                  onClick={() => setShowCart(false)}
                  className="lg:hidden text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-slate-300">shopping_cart_off</span>
                  <p className="text-slate-500 mt-2">Your cart is empty</p>
                  <p className="text-sm text-slate-400">Add some fresh fish!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.listing.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                        <img 
                          src={item.listing.photos?.[0] || getFallbackUrl(item.listing.species.toLowerCase())}
                          alt={item.listing.species}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 capitalize truncate">{item.listing.species}</h4>
                          <p className="text-sm text-slate-500">{item.weight} lbs</p>
                          <p className="text-sm font-bold text-primary">
                            ${(item.listing.pricePerUnit * item.weight).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.listing.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Weight:</span>
                      <span className="font-bold">{cartWeight} lbs</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-slate-500">Total:</span>
                      <span className="text-2xl font-black text-slate-900">${cartTotal.toFixed(2)}</span>
                    </div>
                    
                    <Link
                      to="/checkout"
                      className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                    >
                      Checkout
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                    
                    <p className="text-xs text-slate-400 text-center">
                      Pickup at harbor or delivery where available
                    </p>
                  </div>
                </>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
