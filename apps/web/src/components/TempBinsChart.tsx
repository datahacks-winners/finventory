import { useEffect, useRef } from 'react'
import embed from 'vega-embed'

export default function TempBinsChart({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let view: { finalize: () => void } | undefined

    embed(containerRef.current, '/chart_temp_bins.json', {
      actions: false,
      renderer: 'svg',
    }).then(result => {
      view = result.view
    })

    return () => {
      view?.finalize()
    }
  }, [])

  return <div ref={containerRef} className={className} />
}
