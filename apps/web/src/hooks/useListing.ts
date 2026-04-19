import { useState, useEffect } from 'react'
import { fetchListingById, type Listing } from '../services/listings'

export function useListing(id: string | undefined) {
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetchListingById(id)
      .then((data) => {
        setListing(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [id])

  return { listing, loading, error }
}
