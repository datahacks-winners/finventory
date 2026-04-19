import { useState, useEffect, useCallback } from 'react'
import { subscribeToListings, type ListingFilters, type ListingWithDistance } from '../services/listings'

// Mock listings for development/demo when Firebase isn't connected
const MOCK_LISTINGS: ListingWithDistance[] = [
  {
    id: 'mock-1',
    species: 'Chinook Salmon',
    grade: 'A',
    quantity: 50,
    unit: 'lbs',
    pricePerUnit: 21.50,
    freshnessDate: { toDate: () => new Date() } as any,
    expiresAt: { toDate: () => new Date(Date.now() + 48 * 60 * 60 * 1000) } as any,
    location: { latitude: 32.7, longitude: -117.2, address: 'San Diego Harbor, CA' },
    deliveryAvailable: true,
    deliveryFee: 5,
    sellerId: 'vendor-1',
    sellerName: 'Pacific Catch',
    photos: [],
    status: 'active',
    rating: 4.8,
    reviewCount: 24,
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any,
    distance: 2.3,
  },
  {
    id: 'mock-2',
    species: 'Halibut',
    grade: 'A',
    quantity: 30,
    unit: 'lbs',
    pricePerUnit: 28.00,
    freshnessDate: { toDate: () => new Date() } as any,
    expiresAt: { toDate: () => new Date(Date.now() + 36 * 60 * 60 * 1000) } as any,
    location: { latitude: 32.71, longitude: -117.15, address: 'Point Loma, CA' },
    deliveryAvailable: false,
    sellerId: 'vendor-2',
    sellerName: 'Harbor Fish Co',
    photos: [],
    status: 'active',
    rating: 4.5,
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any,
    distance: 5.1,
  },
  {
    id: 'mock-3',
    species: 'Dungeness Crab',
    grade: 'A',
    quantity: 25,
    unit: 'each',
    pricePerUnit: 15.50,
    freshnessDate: { toDate: () => new Date() } as any,
    expiresAt: { toDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } as any,
    location: { latitude: 32.68, longitude: -117.25, address: 'Coronado, CA' },
    deliveryAvailable: true,
    deliveryFee: 3,
    sellerId: 'vendor-3',
    sellerName: 'Bay Seafood',
    photos: [],
    status: 'active',
    rating: 4.2,
    reviewCount: 12,
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any,
    distance: 8.4,
  },
  {
    id: 'mock-4',
    species: 'Yellowfin Tuna',
    grade: 'sushi',
    quantity: 40,
    unit: 'lbs',
    pricePerUnit: 38.00,
    freshnessDate: { toDate: () => new Date() } as any,
    expiresAt: { toDate: () => new Date(Date.now() + 12 * 60 * 60 * 1000) } as any,
    location: { latitude: 32.75, longitude: -117.1, address: 'Mission Bay, CA' },
    deliveryAvailable: true,
    deliveryFee: 8,
    sellerId: 'vendor-4',
    sellerName: 'Sushi Direct',
    photos: [],
    status: 'active',
    sushiCertNumber: 'SUSHI-2026-001',
    rating: 4.9,
    reviewCount: 56,
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any,
    distance: 3.7,
  },
  {
    id: 'mock-5',
    species: 'Rockfish',
    grade: 'B',
    quantity: 80,
    unit: 'lbs',
    pricePerUnit: 8.50,
    freshnessDate: { toDate: () => new Date() } as any,
    expiresAt: { toDate: () => new Date(Date.now() + 72 * 60 * 60 * 1000) } as any,
    location: { latitude: 32.65, longitude: -117.3, address: 'Imperial Beach, CA' },
    deliveryAvailable: false,
    sellerId: 'vendor-5',
    sellerName: 'Dockside Market',
    photos: [],
    status: 'active',
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any,
    distance: 12.2,
  },
  {
    id: 'mock-6',
    species: 'Sockeye Salmon',
    grade: 'A',
    quantity: 35,
    unit: 'lbs',
    pricePerUnit: 22.00,
    freshnessDate: { toDate: () => new Date() } as any,
    expiresAt: { toDate: () => new Date(Date.now() + 48 * 60 * 60 * 1000) } as any,
    location: { latitude: 32.72, longitude: -117.05, address: 'La Jolla Cove, CA' },
    deliveryAvailable: true,
    deliveryFee: 6,
    sellerId: 'vendor-6',
    sellerName: 'Coastline Fresh',
    photos: [],
    status: 'active',
    rating: 4.6,
    createdAt: { toDate: () => new Date() } as any,
    updatedAt: { toDate: () => new Date() } as any,
    distance: 4.5,
  },
]

export function useListings(
  filters: ListingFilters,
  userLocation: { latitude: number; longitude: number } | null
) {
  const [listings, setListings] = useState<ListingWithDistance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    // Try Firestore first
    const unsubscribe = subscribeToListings(
      filters,
      userLocation,
      (updatedListings) => {
        if (updatedListings.length > 0) {
          setListings(updatedListings)
        } else {
          // Fallback to mock data if no real data
          setListings(MOCK_LISTINGS)
        }
        setLoading(false)
      }
    )

    // Timeout fallback - use mock data if Firestore takes too long
    const timeout = setTimeout(() => {
      if (listings.length === 0) {
        setListings(MOCK_LISTINGS)
        setLoading(false)
      }
    }, 3000)

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [
    filters.species.join(','),
    filters.grades.join(','),
    filters.priceRange[0],
    filters.priceRange[1],
    filters.distance,
    userLocation?.latitude,
    userLocation?.longitude,
  ])

  const refetch = useCallback(() => {
    setLoading(true)
  }, [])

  return { listings, loading, error, refetch }
}
