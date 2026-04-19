import { useMarketComparison } from '../hooks/useMarketPrices'
import type { ListingWithDistance } from '../services/listings'

interface MarketPriceIndicatorProps {
  listing: ListingWithDistance
  showDetails?: boolean
}

export function MarketPriceIndicator({ listing, showDetails = false }: MarketPriceIndicatorProps) {
  const comparison = useMarketComparison(listing.pricePerUnit, listing.species)

  if (!comparison.marketPrice) {
    return (
      <div className="text-xs text-slate-400 italic">
        No market data available
      </div>
    )
  }

  const { isGoodDeal, diffPercent, formattedPercent, marketPrice } = comparison

  // Color coding based on deal quality
  const getColors = () => {
    if (diffPercent > 15) return {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: 'trending_down',
      label: 'Great Deal'
    }
    if (diffPercent > 5) return {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: 'trending_down',
      label: 'Good Deal'
    }
    if (diffPercent > -5) return {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: 'remove',
      label: 'Fair Price'
    }
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: 'trending_up',
      label: 'Above Market'
    }
  }

  const colors = getColors()

  return (
    <div className={`inline-flex flex-col gap-1 ${showDetails ? 'w-full' : ''}`}>
      {/* Compact badge */}
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${colors.bg} ${colors.text} border ${colors.border}`}>
        <span className="material-symbols-outlined text-sm">{colors.icon}</span>
        <span className="text-xs font-bold">{formattedPercent}</span>
        {isGoodDeal && (
          <span className="text-xs font-medium opacity-75">• {colors.label}</span>
        )}
      </div>

      {/* Expanded details */}
      {showDetails && (
        <div className="mt-2 p-3 bg-slate-50 rounded-xl text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500">Market Average</span>
            <span className="font-bold text-slate-700">
              ${marketPrice.avgPrice.toFixed(2)}/{marketPrice.unit}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500">Price Range</span>
            <span className="font-medium text-slate-600">
              ${marketPrice.priceRange[0].toFixed(0)}-${marketPrice.priceRange[1].toFixed(0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Market Trend</span>
            <div className="flex items-center gap-1">
              <span className={`material-symbols-outlined text-sm ${
                marketPrice.trend === 'up' ? 'text-emerald-500' :
                marketPrice.trend === 'down' ? 'text-red-500' : 'text-slate-400'
              }`}>
                {marketPrice.trend === 'up' ? 'trending_up' :
                 marketPrice.trend === 'down' ? 'trending_down' : 'trending_flat'}
              </span>
              <span className={`font-medium ${
                marketPrice.trend === 'up' ? 'text-emerald-600' :
                marketPrice.trend === 'down' ? 'text-red-600' : 'text-slate-500'
              }`}>
                {marketPrice.changePercent > 0 ? '+' : ''}
                {marketPrice.changePercent.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-400">
            Source: {marketPrice.source}
          </div>
        </div>
      )}
    </div>
  )
}

// Market prices panel for sidebar
export function MarketPricesPanel() {
  const prices = [
    { name: 'Salmon (Chinook)', price: '$24.50', trend: 'up', change: '+0.8%' },
    { name: 'Salmon (Sockeye)', price: '$26.00', trend: 'up', change: '+5.1%' },
    { name: 'Halibut', price: '$32.00', trend: 'down', change: '-2.1%' },
    { name: 'Dungeness Crab', price: '$18.00', trend: 'stable', change: '+0.3%' },
    { name: 'Yellowfin Tuna', price: '$48.00', trend: 'up', change: '+4.2%' },
  ]

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">query_stats</span>
        Live Market Prices
      </h3>
      <div className="space-y-3">
        {prices.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <span className="text-sm text-slate-600">{item.name}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{item.price}</span>
              <span className={`text-xs font-medium ${
                item.trend === 'up' ? 'text-emerald-600' :
                item.trend === 'down' ? 'text-red-600' : 'text-slate-500'
              }`}>
                {item.change}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
        Updates every 30 min • NOAA + Local Markets
      </div>
    </div>
  )
}
