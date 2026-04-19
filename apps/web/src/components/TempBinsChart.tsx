import { useEffect, useRef, useState } from 'react'
import embed from 'vega-embed'

export default function TempBinsChart({ className }: { className?: string }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const viewRef = useRef<{ finalize: () => void; resize: () => void } | null>(null)
  useEffect(() => {
    if (!chartRef.current) return

    embed(chartRef.current, '/chart_temp_bins.json', {
      actions: false,
      renderer: 'svg',
    } as any).then(result => {
      viewRef.current = result.view
      // Force resize after a brief delay to ensure container is measured
      setTimeout(() => result.view.resize(), 50)
    }).catch(err => {
      console.error('Vega embed error:', err)
      setError(err instanceof Error ? err.message : 'Chart failed to load')
    })

    return () => {
      viewRef.current?.finalize()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      viewRef.current?.resize()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (error) {
    return (
      <div className="w-full h-[450px] flex items-center justify-center bg-surface-container-low rounded-lg">
        <div className="text-center p-6">
          <p className="text-error font-bold mb-2">Chart Error</p>
          <p className="text-on-surface-variant text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={chartRef}
      className={`${className} w-full`}
      style={{ minHeight: '450px' }}
    />
  )
}
