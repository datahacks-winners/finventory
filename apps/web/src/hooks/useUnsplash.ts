import { useState, useEffect, useCallback } from 'react'
import { unsplash, FISH_QUERIES, getFallbackUrl, type UnsplashImage } from '../services/unsplash'

export { FISH_QUERIES, getFallbackUrl, type UnsplashImage } from '../services/unsplash'

interface UseUnsplashOptions {
  query: string
  quality?: 'max' | 'high' | 'medium'
  fallbackQuery?: string
}

interface UseUnsplashReturn {
  url: string | null
  alt: string | null
  loading: boolean
  error: Error | null
  refresh: () => void
}

export function useUnsplash({ query, quality = 'high', fallbackQuery }: UseUnsplashOptions): UseUnsplashReturn {
  const [image, setImage] = useState<UnsplashImage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchImage = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await unsplash.search(query, { perPage: 5 })
      if (response.results.length > 0) {
        setImage(response.results[0])
      } else if (fallbackQuery) {
        const fallback = await unsplash.search(fallbackQuery, { perPage: 3 })
        setImage(fallback.results[0] ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch image'))
      setImage(null)
    } finally {
      setLoading(false)
    }
  }, [query, fallbackQuery])

  useEffect(() => {
    fetchImage()
  }, [fetchImage])

  const url = image
    ? unsplash.get4KUrl(image, quality)
    : error
      ? getFallbackUrl(fallbackQuery || query)
      : null

  return {
    url,
    alt: image?.alt_description || image?.description || query,
    loading,
    error,
    refresh: fetchImage,
  }
}

interface UseUnsplashBatchOptions {
  queries: string[]
  quality?: 'max' | 'high' | 'medium'
}

interface UseUnsplashBatchReturn {
  images: Array<{ url: string | null; alt: string | null }>
  loading: boolean
  error: Error | null
}

export function useUnsplashBatch({ queries, quality = 'high' }: UseUnsplashBatchOptions): UseUnsplashBatchReturn {
  const [images, setImages] = useState<Array<{ url: string | null; alt: string | null }>>([])
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
              const response = await unsplash.search(query, { perPage: 3 })
              const img = response.results[0]
              if (img) {
                return {
                  url: unsplash.get4KUrl(img, quality),
                  alt: img.alt_description || img.description || query,
                }
              }
            } catch {
              return { url: getFallbackUrl(query), alt: query }
            }
            return { url: getFallbackUrl(query), alt: query }
          })
        )
        setImages(results)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch images'))
        setImages(queries.map(q => ({ url: getFallbackUrl(q), alt: q })))
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [queries, quality])

  return { images, loading, error }
}

export function useUnsplashStatic(queryKey: keyof typeof FISH_QUERIES, quality: 'max' | 'high' | 'medium' = 'high'): UseUnsplashReturn {
  const mappedQuery = FISH_QUERIES[queryKey]
  return useUnsplash({ query: mappedQuery, quality, fallbackQuery: queryKey })
}
