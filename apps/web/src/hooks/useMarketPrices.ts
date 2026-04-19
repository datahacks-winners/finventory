import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getMarketPrice,
  getAllMarketPrices,
  subscribeToMarketUpdates,
  compareToMarket,
  type MarketPrice
} from '../services/marketPrices'

export function useMarketPrice(species: string) {
  const [marketPrice, setMarketPrice] = useState<MarketPrice | null>(null)

  const refresh = useCallback(() => {
    setMarketPrice(getMarketPrice(species))
  }, [species])

  useEffect(() => {
    refresh()
    return subscribeToMarketUpdates(refresh)
  }, [refresh])

  return marketPrice
}

export function useAllMarketPrices() {
  const [prices, setPrices] = useState<MarketPrice[]>([])

  const refresh = useCallback(() => {
    setPrices(getAllMarketPrices())
  }, [])

  useEffect(() => {
    refresh()
    return subscribeToMarketUpdates(refresh)
  }, [refresh])

  return prices
}

export function useMarketComparison(listingPrice: number, species: string) {
  const [comparison, setComparison] = useState(() =>
    compareToMarket(listingPrice, species)
  )

  const refresh = useCallback(() => {
    setComparison(compareToMarket(listingPrice, species))
  }, [listingPrice, species])

  useEffect(() => {
    refresh()
    return subscribeToMarketUpdates(refresh)
  }, [refresh])

  return useMemo(() => ({
    ...comparison,
    formattedDiff: comparison.diff > 0
      ? `$${comparison.diff.toFixed(2)} below market`
      : comparison.diff < 0
        ? `$${Math.abs(comparison.diff).toFixed(2)} above market`
        : 'At market price',
    formattedPercent: comparison.diffPercent > 0
      ? `${comparison.diffPercent.toFixed(1)}% below`
      : comparison.diffPercent < 0
        ? `${Math.abs(comparison.diffPercent).toFixed(1)}% above`
        : 'Market price'
  }), [comparison])
}
