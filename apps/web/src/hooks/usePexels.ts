import { useState, useEffect, useCallback } from 'react'
import { pexels, FISH_QUERIES, getFallbackUrl, type PexelsPhoto } from '../services/pexels'

export { FISH_QUERIES, getFallbackUrl, type PexelsPhoto } from '../services/pexels'

interface UsePexelsOptions {
  query: string
  quality?: 'original' | 'large2x' | 'large'
  fallbackQuery?: string
}

interface UsePexelsReturn {
  url: string | null
  alt: string | null
  photographer: string | null
  loading: boolean
  error: Error | null
  refresh: () => void
}

export function usePexels({ query, quality = 'large2x', fallbackQuery }: UsePexelsOptions): UsePexelsReturn {
  const [photo, setPhoto] = useState<PexelsPhoto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPhoto = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await pexels.search(query, { perPage: 5 })
      if (response.photos.length > 0) {
        setPhoto(response.photos[0])
      } else if (fallbackQuery) {
        const fallback = await pexels.search(fallbackQuery, { perPage: 3 })
        setPhoto(fallback.photos[0] ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch image'))
      setPhoto(null)
    } finally {
      setLoading(false)
    }
  }, [query, fallbackQuery])

  useEffect(() => {
    fetchPhoto()
  }, [fetchPhoto])

  const url = photo
    ? pexels.get4KUrl(photo, quality)
    : error
      ? getFallbackUrl(fallbackQuery || query)
      : null

  return {
    url,
    alt: photo?.alt || query,
    photographer: photo?.photographer || null,
    loading,
    error,
    refresh: fetchPhoto,
  }
}

interface UsePexelsBatchOptions {
  queries: string[]
  quality?: 'original' | 'large2x' | 'large'
}

interface UsePexelsBatchReturn {
  images: Array<{ url: string | null; alt: string | null; photographer: string | null }>
  loading: boolean
  error: Error | null
}

export function usePexelsBatch({ queries, quality = 'large2x' }: UsePexelsBatchOptions): UsePexelsBatchReturn {
  const [images, setImages] = useState<Array<{ url: string | null; alt: string | null; photographer: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true)
      setError(null)

      try {
        const results = await Promise.all(
          queries.map(async (query) => {
            try {
              const response = await pexels.search(query, { perPage: 3 })
              const photo = response.photos[0]
              if (photo) {
                return {
                  url: pexels.get4KUrl(photo, quality),
                  alt: photo.alt || query,
                  photographer: photo.photographer,
                }
              }
            } catch {
              return { url: getFallbackUrl(query), alt: query, photographer: null }
            }
            return { url: getFallbackUrl(query), alt: query, photographer: null }
          })
        )
        setImages(results)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch images'))
        setImages(queries.map(q => ({ url: getFallbackUrl(q), alt: q, photographer: null })))
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [queries, quality])

  return { images, loading, error }
}

export function usePexelsStatic(queryKey: keyof typeof FISH_QUERIES, quality: 'original' | 'large2x' | 'large' = 'large2x'): UsePexelsReturn {
  const mappedQuery = FISH_QUERIES[queryKey]
  return usePexels({ query: mappedQuery, quality, fallbackQuery: queryKey })
}
