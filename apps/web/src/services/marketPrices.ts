export interface MarketPrice {
  species: string
  avgPrice: number
  priceRange: [number, number]
  unit: string
  trend: 'up' | 'down' | 'stable'
  changePercent: number
  lastUpdated: Date
  source: string
}

// NOAA Fisheries market data + local market simulation
// In production, this would connect to actual market APIs
const MARKET_BASE_PRICES: Record<string, Omit<MarketPrice, 'species' | 'lastUpdated'>> = {
  'chinook salmon': {
    avgPrice: 24.5,
    priceRange: [18.0, 32.0],
    unit: 'lbs',
    trend: 'stable',
    changePercent: 0.8,
    source: 'NOAA Fisheries + PNS Market'
  },
  'coho salmon': {
    avgPrice: 18.0,
    priceRange: [14.0, 24.0],
    unit: 'lbs',
    trend: 'up',
    changePercent: 3.2,
    source: 'NOAA Fisheries + PNS Market'
  },
  'sockeye salmon': {
    avgPrice: 26.0,
    priceRange: [20.0, 34.0],
    unit: 'lbs',
    trend: 'up',
    changePercent: 5.1,
    source: 'NOAA Fisheries + PNS Market'
  },
  'albacore tuna': {
    avgPrice: 22.0,
    priceRange: [16.0, 28.0],
    unit: 'lbs',
    trend: 'stable',
    changePercent: -0.5,
    source: 'NOAA Fisheries'
  },
  'yellowfin tuna': {
    avgPrice: 48.0,
    priceRange: [38.0, 58.0],
    unit: 'lbs',
    trend: 'up',
    changePercent: 4.2,
    source: 'NOAA Fisheries'
  },
  'halibut': {
    avgPrice: 32.0,
    priceRange: [26.0, 40.0],
    unit: 'lbs',
    trend: 'down',
    changePercent: -2.1,
    source: 'Pacific Halibut Commission'
  },
  'dungeness crab': {
    avgPrice: 18.0,
    priceRange: [14.0, 24.0],
    unit: 'each',
    trend: 'stable',
    changePercent: 0.3,
    source: 'West Coast Crab Market'
  },
  'king crab': {
    avgPrice: 55.0,
    priceRange: [45.0, 68.0],
    unit: 'lbs',
    trend: 'up',
    changePercent: 7.5,
    source: 'Alaska Crab Market'
  },
  'rockfish': {
    avgPrice: 11.0,
    priceRange: [8.0, 16.0],
    unit: 'lbs',
    trend: 'stable',
    changePercent: 1.2,
    source: 'Pacific Groundfish'
  },
  'lingcod': {
    avgPrice: 16.0,
    priceRange: [12.0, 22.0],
    unit: 'lbs',
    trend: 'down',
    changePercent: -1.8,
    source: 'Pacific Groundfish'
  },
  'sablefish': {
    avgPrice: 28.0,
    priceRange: [22.0, 36.0],
    unit: 'lbs',
    trend: 'up',
    changePercent: 2.3,
    source: 'Alaska Sablefish Market'
  },
  'oysters': {
    avgPrice: 3.0,
    priceRange: [2.0, 4.5],
    unit: 'each',
    trend: 'stable',
    changePercent: 0.0,
    source: 'West Coast Shellfish'
  },
  'spot prawns': {
    avgPrice: 42.0,
    priceRange: [34.0, 52.0],
    unit: 'lbs',
    trend: 'up',
    changePercent: 6.8,
    source: 'Pacific Prawn Market'
  },
  'sea urchin': {
    avgPrice: 9.0,
    priceRange: [6.0, 14.0],
    unit: 'each',
    trend: 'up',
    changePercent: 3.5,
    source: 'California Uni Market'
  },
  'geoduck': {
    avgPrice: 45.0,
    priceRange: [38.0, 55.0],
    unit: 'lbs',
    trend: 'stable',
    changePercent: 1.0,
    source: 'West Coast Clam Market'
  },
  'mussels': {
    avgPrice: 5.0,
    priceRange: [3.5, 7.0],
    unit: 'lbs',
    trend: 'down',
    changePercent: -3.2,
    source: 'West Coast Shellfish'
  },
  'razor clams': {
    avgPrice: 17.0,
    priceRange: [13.0, 22.0],
    unit: 'lbs',
    trend: 'stable',
    changePercent: 0.5,
    source: 'Pacific Clam Market'
  },
  'sand dabs': {
    avgPrice: 8.0,
    priceRange: [6.0, 12.0],
    unit: 'lbs',
    trend: 'stable',
    changePercent: -0.8,
    source: 'California Flatfish'
  },
  'petrale sole': {
    avgPrice: 11.0,
    priceRange: [8.0, 16.0],
    unit: 'lbs',
    trend: 'up',
    changePercent: 2.1,
    source: 'Pacific Groundfish'
  },
  'striped bass': {
    avgPrice: 20.0,
    priceRange: [15.0, 28.0],
    unit: 'lbs',
    trend: 'stable',
    changePercent: 1.5,
    source: 'California Market'
  },
  'white sturgeon': {
    avgPrice: 38.0,
    priceRange: [30.0, 48.0],
    unit: 'lbs',
    trend: 'up',
    changePercent: 4.5,
    source: 'Farm-raised Sturgeon'
  },
  'leopard shark': {
    avgPrice: 7.5,
    priceRange: [5.0, 12.0],
    unit: 'lbs',
    trend: 'down',
    changePercent: -4.2,
    source: 'California Market'
  }
}

// Normalize species names for lookup
function normalizeSpecies(species: string): string {
  return species.toLowerCase()
    .replace(/\([^)]*\)/g, '') // Remove parentheses
    .replace(/\s+/g, ' ')
    .trim()
}

export function getMarketPrice(species: string): MarketPrice | null {
  const normalized = normalizeSpecies(species)

  // Try exact match first
  if (MARKET_BASE_PRICES[normalized]) {
    return {
      species,
      ...MARKET_BASE_PRICES[normalized],
      lastUpdated: new Date()
    }
  }

  // Try partial matches
  for (const [key, data] of Object.entries(MARKET_BASE_PRICES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        species,
        ...data,
        lastUpdated: new Date()
      }
    }
  }

  // Try matching by species parts (e.g., "salmon" in "chinook salmon")
  const speciesParts = normalized.split(' ')
  for (const part of speciesParts) {
    if (part.length < 3) continue // Skip short words
    for (const [key, data] of Object.entries(MARKET_BASE_PRICES)) {
      if (key.includes(part)) {
        return {
          species,
          ...data,
          lastUpdated: new Date()
        }
      }
    }
  }

  return null
}

export function getAllMarketPrices(): MarketPrice[] {
  return Object.entries(MARKET_BASE_PRICES).map(([species, data]) => ({
    species,
    ...data,
    lastUpdated: new Date()
  }))
}

export function compareToMarket(listingPrice: number, species: string): {
  marketPrice: MarketPrice | null
  diff: number
  diffPercent: number
  isGoodDeal: boolean
} {
  const marketPrice = getMarketPrice(species)
  if (!marketPrice) {
    return { marketPrice: null, diff: 0, diffPercent: 0, isGoodDeal: false }
  }

  const diff = marketPrice.avgPrice - listingPrice
  const diffPercent = (diff / marketPrice.avgPrice) * 100
  const isGoodDeal = diffPercent > 5 // 5% below market is a good deal

  return { marketPrice, diff, diffPercent, isGoodDeal }
}

// Simulated real-time updates (would be WebSocket or polling in production)
let marketUpdateCallbacks: (() => void)[] = []

export function subscribeToMarketUpdates(callback: () => void): () => void {
  marketUpdateCallbacks.push(callback)

  // Simulate updates every 30 seconds
  const interval = setInterval(() => {
    // Randomly adjust some prices slightly to simulate market movement
    Object.keys(MARKET_BASE_PRICES).forEach(key => {
      const price = MARKET_BASE_PRICES[key]
      const volatility = 0.02 // 2% max change
      const change = 1 + (Math.random() * volatility * 2 - volatility)
      price.avgPrice = Math.round(price.avgPrice * change * 100) / 100

      // Update trend based on random movement
      const trendChange = Math.random()
      if (trendChange > 0.7) {
        price.trend = 'up'
        price.changePercent = Math.abs(price.changePercent) + Math.random() * 2
      } else if (trendChange < 0.3) {
        price.trend = 'down'
        price.changePercent = -(Math.abs(price.changePercent) + Math.random() * 2)
      } else {
        price.trend = 'stable'
        price.changePercent = price.changePercent * 0.5
      }
    })

    marketUpdateCallbacks.forEach(cb => cb())
  }, 30000)

  return () => {
    clearInterval(interval)
    marketUpdateCallbacks = marketUpdateCallbacks.filter(cb => cb !== callback)
  }
}
