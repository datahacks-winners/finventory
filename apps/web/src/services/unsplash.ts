const UNSPLASH_API = 'https://api.unsplash.com'

export interface UnsplashImage {
  id: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  alt_description: string | null
  description: string | null
  user: {
    name: string
    link: string
  }
  width: number
  height: number
}

export interface UnsplashSearchResponse {
  results: UnsplashImage[]
  total: number
  total_pages: number
}

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || ''

class UnsplashService {
  private headers: Record<string, string>

  constructor() {
    this.headers = {
      'Authorization': `Client-ID ${ACCESS_KEY}`,
      'Accept-Version': 'v1',
    }
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${UNSPLASH_API}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const response = await fetch(url.toString(), { headers: this.headers })

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  search(query: string, options?: {
    page?: number
    perPage?: number
    orientation?: 'landscape' | 'portrait' | 'squarish'
  }): Promise<UnsplashSearchResponse> {
    return this.fetch<UnsplashSearchResponse>('/search/photos', {
      query,
      page: String(options?.page ?? 1),
      per_page: String(options?.perPage ?? 10),
      orientation: options?.orientation ?? 'landscape',
    })
  }

  get4KUrl(image: UnsplashImage, quality: 'max' | 'high' | 'medium' = 'high'): string {
    const w = quality === 'max' ? 3840 : quality === 'high' ? 2560 : 1920
    const q = quality === 'max' ? 80 : 85
    return `${image.urls.raw}&w=${w}&q=${q}&fm=webp&fit=max`
  }

  getPhoto(id: string): Promise<UnsplashImage> {
    return this.fetch<UnsplashImage>(`/photos/${id}`)
  }
}

export const unsplash = new UnsplashService()

export const FISH_QUERIES = {
  hero: 'fishing boat harbor sunset ocean',
  salmon: 'salmon fish fresh seafood market',
  crab: 'dungeness crab seafood fresh',
  rockfish: 'rockfish red snapper fresh fish',
  tuna: 'tuna fish fresh bluefin',
  lobster: 'lobster fresh seafood live',
  chef: 'chef preparing seafood kitchen',
  market: 'fish market seafood display ice',
  ocean: 'ocean waves coast california',
  dock: 'fishing dock pier boats harbor',
}

export function getFallbackUrl(query: string): string {
  const fallbacks: Record<string, string> = {
    salmon: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=2560&q=80&fm=webp',
    crab: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=2560&q=80&fm=webp',
    tuna: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=2560&q=80&fm=webp',
    lobster: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=2560&q=80&fm=webp',
    hero: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=3840&q=80&fm=webp',
    chef: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=2560&q=80&fm=webp',
    market: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=2560&q=80&fm=webp',
    ocean: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=3840&q=80&fm=webp',
    dock: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=2560&q=80&fm=webp',
  }
  return fallbacks[query] || fallbacks.ocean
}
