import imgBass from '../assets/fish/bass.jpg'
import imgBluefin from '../assets/fish/bluefin.jpeg'
import imgCabezon from '../assets/fish/cabezon.jpg'
import imgCrab from '../assets/fish/dungeness-crab.jpg'
import imgHalibut from '../assets/fish/halibut.jpg'
import imgLeopard from '../assets/fish/leopard.jpeg'
import imgRockfish from '../assets/fish/rockfish.jpg'
import imgSalmon from '../assets/fish/salmon.jpg'
import imgSanddabs from '../assets/fish/sanddabs.jpg'
import imgSeaUrchin from '../assets/fish/sea-urchin.jpg'
import imgShrimp from '../assets/fish/shrimp.jpg'
import imgSockeye from '../assets/fish/sockeye.jpg'
import imgSpotPrawns from '../assets/fish/spot-prawns.jpg'
import imgSturgeon from '../assets/fish/sturgeon.jpg'
import imgYellowfin from '../assets/fish/yellowfin.jpeg'

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
    // ═══════════════════════════════════════════════════════════════
    // SALMON - Fresh whole salmon on ice
    // ═══════════════════════════════════════════════════════════════
    salmon: imgSalmon,
    'pink salmon': imgSalmon,
    'chinook salmon': imgSalmon,
    'coho salmon': imgSalmon,
    'sockeye salmon': imgSockeye,
    sockeye: imgSockeye,

    // ═══════════════════════════════════════════════════════════════
    // TUNA - Fresh bluefin tuna steaks and whole fish
    // ═══════════════════════════════════════════════════════════════
    tuna: imgBluefin,
    'albacore tuna': imgBluefin,
    'bluefin tuna': imgBluefin,
    bluefin: imgBluefin,
    'yellowfin tuna': imgYellowfin,
    yellowfin: imgYellowfin,

    // ═══════════════════════════════════════════════════════════════
    // CRAB - Using local image instead of broken external URL
    // ═══════════════════════════════════════════════════════════════
    crab: imgCrab,
    'dungeness crab': imgCrab,
    'red rock crab': imgCrab,
    'snow crab': imgCrab,
    'king crab': imgCrab,

    // ═══════════════════════════════════════════════════════════════
    // LOBSTER - Using Pexels verified lobster image
    // ═══════════════════════════════════════════════════════════════
    lobster: 'https://images.pexels.com/photos/566345/pexels-photo-566345.jpeg?auto=compress&cs=tinysrgb&w=800',
    'spiny lobster': 'https://images.pexels.com/photos/566345/pexels-photo-566345.jpeg?auto=compress&cs=tinysrgb&w=800',
    'maine lobster': 'https://images.pexels.com/photos/566345/pexels-photo-566345.jpeg?auto=compress&cs=tinysrgb&w=800',

    // ═══════════════════════════════════════════════════════════════
    // ROCKFISH - California rockfish species - using local image
    // ═══════════════════════════════════════════════════════════════
    rockfish: imgRockfish,
    'vermillion rockfish': imgRockfish,
    'bocaccio rockfish': imgRockfish,
    'canary rockfish': imgRockfish,

    // ═══════════════════════════════════════════════════════════════
    // SHEEPHEAD - California sheephead (wrasse family)
    // ═══════════════════════════════════════════════════════════════
    sheephead: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
    'california sheephead': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',

    // ═══════════════════════════════════════════════════════════════
    // HALIBUT - Pacific halibut flatfish
    // ═══════════════════════════════════════════════════════════════
    halibut: imgHalibut,
    'pacific halibut': imgHalibut,
    'california halibut': imgHalibut,

    // ═══════════════════════════════════════════════════════════════
    // SABLEFISH / BLACK COD - Deep water fish
    // ═══════════════════════════════════════════════════════════════
    sablefish: 'https://images.unsplash.com/photo-1606850780554-b55ea6863e85?w=800&auto=format&fit=crop&q=80',
    'black cod': 'https://images.unsplash.com/photo-1606850780554-b55ea6863e85?w=800&auto=format&fit=crop&q=80',

    // ═══════════════════════════════════════════════════════════════
    // SANDDABS - Pacific sanddabs (flatfish)
    // ═══════════════════════════════════════════════════════════════
    sanddab: imgSanddabs,
    sanddabs: imgSanddabs,
    'pacific sanddab': imgSanddabs,

    // ═══════════════════════════════════════════════════════════════
    // SOLE / FLOUNDER - Flatfish species
    // ═══════════════════════════════════════════════════════════════
    sole: 'https://images.unsplash.com/photo-1611171711791-b34c917fd839?w=800&auto=format&fit=crop&q=80',
    'petrale sole': 'https://images.unsplash.com/photo-1611171711791-b34c917fd839?w=800&auto=format&fit=crop&q=80',
    'dover sole': 'https://images.unsplash.com/photo-1611171711791-b34c917fd839?w=800&auto=format&fit=crop&q=80',
    'english sole': 'https://images.unsplash.com/photo-1611171711791-b34c917fd839?w=800&auto=format&fit=crop&q=80',
    flounder: 'https://images.unsplash.com/photo-1611171711791-b34c917fd839?w=800&auto=format&fit=crop&q=80',

    // ═══════════════════════════════════════════════════════════════
    // COD - Pacific cod
    // ═══════════════════════════════════════════════════════════════
    cod: 'https://images.unsplash.com/photo-1534489719095-5c4af064eecd?w=800&auto=format&fit=crop&q=80',
    'pacific cod': 'https://images.unsplash.com/photo-1534489719095-5c4af064eecd?w=800&auto=format&fit=crop&q=80',
    'atlantic cod': 'https://images.unsplash.com/photo-1534489719095-5c4af064eecd?w=800&auto=format&fit=crop&q=80',

    // ═══════════════════════════════════════════════════════════════
    // SNAPPER - Red snapper and varieties
    // ═══════════════════════════════════════════════════════════════
    snapper: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80',
    'red snapper': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80',

    // ═══════════════════════════════════════════════════════════════
    // BASS - Using local image instead of broken external URL
    // ═══════════════════════════════════════════════════════════════
    bass: imgBass,
    'striped bass': imgBass,
    'sea bass': imgBass,
    'chilean sea bass': imgHalibut,

    // ═══════════════════════════════════════════════════════════════
    // TROUT - Freshwater trout (sometimes anadromous)
    // ═══════════════════════════════════════════════════════════════
    trout: 'https://images.unsplash.com/photo-1599689018034-48f92d1c05f3?w=800&auto=format&fit=crop&q=80',
    'steelhead trout': 'https://images.unsplash.com/photo-1599689018034-48f92d1c05f3?w=800&auto=format&fit=crop&q=80',
    'rainbow trout': 'https://images.unsplash.com/photo-1599689018034-48f92d1c05f3?w=800&auto=format&fit=crop&q=80',

    // ═══════════════════════════════════════════════════════════════
    // SHARKS
    // ═══════════════════════════════════════════════════════════════
    'leopard shark': imgLeopard,
    shark: imgLeopard,

    // ═══════════════════════════════════════════════════════════════
    // STURGEON - Using local image
    // ═══════════════════════════════════════════════════════════════
    sturgeon: imgSturgeon,
    'white sturgeon': imgSturgeon,

    // ═══════════════════════════════════════════════════════════════
    // SMALL PELAGICS - Sardines, anchovies, mackerel
    // ═══════════════════════════════════════════════════════════════
    sardine: 'https://images.unsplash.com/photo-1518649922019-557cc57c63a1?w=800&auto=format&fit=crop&q=80',
    'pacific sardine': 'https://images.unsplash.com/photo-1518649922019-557cc57c63a1?w=800&auto=format&fit=crop&q=80',
    anchovy: 'https://images.unsplash.com/photo-1518649922019-557cc57c63a1?w=800&auto=format&fit=crop&q=80',
    mackerel: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800&auto=format&fit=crop&q=80',

    // ═══════════════════════════════════════════════════════════════
    // CEPHALOPODS - Squid and octopus
    // ═══════════════════════════════════════════════════════════════
    squid: 'https://images.pexels.com/photos/361184/asparagus-squid-octopus-361184.jpeg?auto=compress&cs=tinysrgb&w=800',
    'market squid': 'https://images.pexels.com/photos/361184/asparagus-squid-octopus-361184.jpeg?auto=compress&cs=tinysrgb&w=800',
    'humboldt squid': 'https://images.pexels.com/photos/361184/asparagus-squid-octopus-361184.jpeg?auto=compress&cs=tinysrgb&w=800',
    octopus: 'https://images.pexels.com/photos/361184/asparagus-squid-octopus-361184.jpeg?auto=compress&cs=tinysrgb&w=800',

    // ═══════════════════════════════════════════════════════════════
    // CABEZON - California bottom fish - using local image
    // ═══════════════════════════════════════════════════════════════
    cabezon: imgCabezon,

    // ═══════════════════════════════════════════════════════════════
    // SHELLFISH - Using local images instead of external URLs
    // ═══════════════════════════════════════════════════════════════
    shrimp: imgShrimp,
    prawn: imgShrimp,
    'spot prawns': imgSpotPrawns,
    oyster: imgHalibut,
    'sea urchin': imgSeaUrchin,
    uni: imgSeaUrchin,
    geoduck: imgHalibut,
    clam: imgHalibut,
    mussel: imgHalibut,

    // ═══════════════════════════════════════════════════════════════
    // SCENES/CONTEXT - Hero images, fishing boats, markets
    // ═══════════════════════════════════════════════════════════════
    hero: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    'fishing boat': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    'fishing harbor': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    ocean: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1200&auto=format&fit=crop&q=80',
    dock: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    'fishing pier': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    chef: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&auto=format&fit=crop&q=80',
    market: 'https://images.unsplash.com/photo-1534489719095-5c4af064eecd?w=800&auto=format&fit=crop&q=80',
    'fish market': 'https://images.unsplash.com/photo-1534489719095-5c4af064eecd?w=800&auto=format&fit=crop&q=80',
    seafood: 'https://images.unsplash.com/photo-1534489719095-5c4af064eecd?w=800&auto=format&fit=crop&q=80',
  }

  // Try direct lookup first
  if (fallbacks[query]) {
    return fallbacks[query]
  }

  // Try normalized version (lowercase, trimmed)
  const normalized = query.toLowerCase().trim()
  if (fallbacks[normalized]) {
    return fallbacks[normalized]
  }

  // Try to match partial species names
  if (normalized.includes('sockeye')) return fallbacks.sockeye
  if (normalized.includes('salmon')) return fallbacks.salmon
  if (normalized.includes('yellowfin')) return fallbacks.yellowfin
  if (normalized.includes('bluefin')) return fallbacks.bluefin
  if (normalized.includes('tuna')) return fallbacks.tuna
  if (normalized.includes('sanddab')) return fallbacks.sanddab
  if (normalized.includes('crab')) return fallbacks.crab
  if (normalized.includes('lobster')) return fallbacks.lobster
  if (normalized.includes('rockfish')) return fallbacks.rockfish
  if (normalized.includes('sheephead')) return fallbacks.sheephead
  if (normalized.includes('halibut')) return fallbacks.halibut
  if (normalized.includes('sablefish') || normalized.includes('black cod')) return fallbacks.sablefish
  if (normalized.includes('sole') || normalized.includes('flounder')) return fallbacks.sole
  if (normalized.includes('cod')) return fallbacks.cod
  if (normalized.includes('snapper')) return fallbacks.snapper
  if (normalized.includes('bass')) return fallbacks.bass
  if (normalized.includes('trout')) return fallbacks.trout
  if (normalized.includes('shark')) return fallbacks.shark
  if (normalized.includes('sardine')) return fallbacks.sardine
  if (normalized.includes('anchovy')) return fallbacks.anchovy
  if (normalized.includes('mackerel')) return fallbacks.mackerel
  if (normalized.includes('squid')) return fallbacks.squid
  if (normalized.includes('octopus')) return fallbacks.octopus
  if (normalized.includes('shrimp') || normalized.includes('prawn')) return fallbacks.shrimp
  if (normalized.includes('oyster')) return fallbacks.oyster
  if (normalized.includes('urchin') || normalized.includes('uni')) return fallbacks.uni

  // Default fallback - beautiful ocean scene
  return fallbacks.ocean
}
