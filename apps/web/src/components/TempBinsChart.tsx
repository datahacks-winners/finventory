import { useEffect, useRef, useState } from 'react'
import embed from 'vega-embed'

export default function TempBinsChart({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const viewRef = useRef<{ finalize: () => void; resize: () => void } | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    embed(chartRef.current, '/chart_temp_bins.json', {
      actions: false,
      renderer: 'svg',
    }).then(result => {
      viewRef.current = result.view
      // Trigger initial resize to fit container
      result.view.resize()
    }).catch(err => {
      console.error('Vega embed error:', err)
      setError(err instanceof Error ? err.message : 'Chart failed to load')
    })

    return () => {
      viewRef.current?.finalize()
      viewRef.current = null
    }
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (viewRef.current) {
        viewRef.current.resize()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (error) {
    return (
      <div className={`${className} w-full min-h-[350px] flex items-center justify-center bg-surface-container-low rounded-lg`}>
        <div className="text-center p-6">
          <p className="text-error font-bold mb-2">Chart Error</p>
          <p className="text-on-surface-variant text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`${className} w-full`}>
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold uppercase tracking-widest text-outline">
          Egg Density vs. Surface Temperature
        </p>
        <div
          ref={chartRef}
          className="w-full min-h-[350px]"
          style={{ aspectRatio: '16/9', minHeight: '350px' }}
        />
      </div>
    </div>
  )
}
