const PEXELS_API = 'https://api.pexels.com/v1'

export interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  photographer_id: number
  avg_color: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  alt: string | null
  liked: boolean
}

export interface PexelsSearchResponse {
  total_results: number
  page: number
  per_page: number
  photos: PexelsPhoto[]
  next_page: string | null
}

export interface PexelsCuratedResponse {
  page: number
  per_page: number
  photos: PexelsPhoto[]
  next_page: string | null
}

const API_KEY = import.meta.env.VITE_PEXELS_API_KEY || ''

class PexelsService {
  private headers: Record<string, string>

  constructor() {
    this.headers = {
      'Authorization': API_KEY,
    }
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${PEXELS_API}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value)
      })
    }

    const response = await fetch(url.toString(), { headers: this.headers })

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  search(query: string, options?: {
    page?: number
    perPage?: number
    orientation?: 'landscape' | 'portrait' | 'square'
  }): Promise<PexelsSearchResponse> {
    return this.fetch<PexelsSearchResponse>('/search', {
      query,
      page: String(options?.page ?? 1),
      per_page: String(options?.perPage ?? 10),
      orientation: options?.orientation ?? '',
    })
  }

  curated(options?: {
    page?: number
    perPage?: number
  }): Promise<PexelsCuratedResponse> {
    return this.fetch<PexelsCuratedResponse>('/curated', {
      page: String(options?.page ?? 1),
      per_page: String(options?.perPage ?? 10),
    })
  }

  getPhoto(id: number): Promise<PexelsPhoto> {
    return this.fetch<PexelsPhoto>(`/photos/${id}`)
  }

  get4KUrl(photo: PexelsPhoto, quality: 'original' | 'large2x' | 'large' = 'large2x'): string {
    return photo.src[quality]
  }
}

export const pexels = new PexelsService()

export const FISH_QUERIES = {
  hero: 'fishing boat harbor sunset ocean',
  salmon: 'salmon fish fresh seafood',
  crab: 'dungeness crab seafood fresh',
  rockfish: 'rockfish fillet seafood fresh fish on plate white background',
  tuna: 'tuna fish fresh bluefin',
  lobster: 'lobster fresh seafood',
  chef: 'chef preparing seafood kitchen',
  market: 'fish market seafood display',
  ocean: 'ocean waves coast california',
  dock: 'fishing dock pier boats harbor',
  shrimp: 'fresh shrimp seafood',
  oyster: 'fresh oysters seafood',
}

export function getFallbackUrl(query: string): string {
  const fallbacks: Record<string, string> = {
    salmon: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    crab: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800',
    rockfish: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    'vermillion rockfish': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    tuna: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    lobster: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=800',
    hero: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
    chef: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800',
    market: 'https://images.unsplash.com/photo-1534489719095-5c4af064eecd?w=800',
    ocean: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
    dock: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    shrimp: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800',
    oyster: 'https://images.unsplash.com/photo-1534489719095-5c4af064eecd?w=800',
    bass: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    'striped bass': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    'leopard shark': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    halibut: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    sardine: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    anchovy: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    mackerel: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
    squid: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    octopus: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    'sea urchin': 'https://images.unsplash.com/photo-1534489719095-5c4af064eecd?w=800',
    uni: 'https://images.unsplash.com/photo-1534489719095-5c4af064eecd?w=800',
  }
  return fallbacks[query] || fallbacks.ocean
}
