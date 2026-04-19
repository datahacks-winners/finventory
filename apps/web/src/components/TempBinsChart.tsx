import { useEffect, useRef, useState } from 'react'
import embed from 'vega-embed'

export default function TempBinsChart({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let view: { finalize: () => void } | undefined

    embed(containerRef.current, '/chart_temp_bins.json', {
      actions: false,
      renderer: 'svg',
    }).then(result => {
      view = result.view
    }).catch(err => {
      console.error('Vega embed error:', err)
      setError(err instanceof Error ? err.message : 'Chart failed to load')
    })

    return () => {
      view?.finalize()
    }
  }, [])

  if (error) {
    return (
      <div className={`${className} w-full min-h-[400px] flex items-center justify-center bg-surface-container-low rounded-lg`}>
        <div className="text-center p-6">
          <p className="text-error font-bold mb-2">Chart Error</p>
          <p className="text-on-surface-variant text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`${className} w-full min-h-[400px]`} />
  )
}
