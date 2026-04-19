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
  rockfish: 'rockfish red snapper fresh fish',
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
    salmon: 'https://images.pexels.com/photos/3296395/pexels-photo-3296395.jpeg?auto=compress&cs=tinysrgb&w=2560',
    crab: 'https://images.pexels.com/photos/3296395/pexels-photo-3296395.jpeg?auto=compress&cs=tinysrgb&w=2560',
    tuna: 'https://images.pexels.com/photos/4552171/pexels-photo-4552171.jpeg?auto=compress&cs=tinysrgb&w=2560',
    lobster: 'https://images.pexels.com/photos/4552171/pexels-photo-4552171.jpeg?auto=compress&cs=tinysrgb&w=2560',
    hero: 'https://images.pexels.com/photos/1536437/pexels-photo-1536437.jpeg?auto=compress&cs=tinysrgb&w=3840',
    chef: 'https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg?auto=compress&cs=tinysrgb&w=2560',
    market: 'https://images.pexels.com/photos/4552130/pexels-photo-4552130.jpeg?auto=compress&cs=tinysrgb&w=2560',
    ocean: 'https://images.pexels.com/photos/1536437/pexels-photo-1536437.jpeg?auto=compress&cs=tinysrgb&w=3840',
    dock: 'https://images.pexels.com/photos/2253275/pexels-photo-2253275.jpeg?auto=compress&cs=tinysrgb&w=2560',
    shrimp: 'https://images.pexels.com/photos/4552171/pexels-photo-4552171.jpeg?auto=compress&cs=tinysrgb&w=2560',
    oyster: 'https://images.pexels.com/photos/4552130/pexels-photo-4552130.jpeg?auto=compress&cs=tinysrgb&w=2560',
  }
  return fallbacks[query] || fallbacks.ocean
}
