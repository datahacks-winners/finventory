import { useState, useEffect, useCallback } from 'react'
import { subscribeToListings, type ListingFilters, type ListingWithDistance } from '../services/listings'

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

    const unsubscribe = subscribeToListings(
      filters,
      userLocation,
      (updatedListings) => {
        setListings(updatedListings)
        setLoading(false)
      }
    )

    return () => unsubscribe()
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
