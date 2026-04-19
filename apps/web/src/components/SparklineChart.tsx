import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface SparklineChartProps {
  data: number[]
  color?: string
  height?: number
}

export default function SparklineChart({ data, color = '#1e78b4', height = 32 }: SparklineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length) return

    const width = containerRef.current.clientWidth || 200
    const h = height

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', h)

    const xScale = d3.scaleLinear().domain([0, data.length - 1]).range([0, width])
    const yMin = d3.min(data)! * 0.85
    const yMax = d3.max(data)! * 1.1
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([h, 2])

    const gradId = `spark-${Math.random().toString(36).slice(2, 8)}`
    const defs = svg.append('defs')
    const grad = defs.append('linearGradient').attr('id', gradId).attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%')
    grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.25)
    grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0)

    const area = d3.area<number>()
      .x((_, i) => xScale(i))
      .y0(h)
      .y1(d => yScale(d))
      .curve(d3.curveCatmullRom.alpha(0.5))

    const line = d3.line<number>()
      .x((_, i) => xScale(i))
      .y(d => yScale(d))
      .curve(d3.curveCatmullRom.alpha(0.5))

    svg.append('path').datum(data).attr('fill', `url(#${gradId})`).attr('d', area)

    const path = svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.75)
      .attr('d', line)

    // Animate draw
    const totalLength = (path.node() as SVGPathElement).getTotalLength()
    path
      .attr('stroke-dasharray', totalLength)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(900)
      .ease(d3.easeQuadOut)
      .attr('stroke-dashoffset', 0)

    // End dot
    svg.append('circle')
      .attr('cx', xScale(data.length - 1))
      .attr('cy', yScale(data[data.length - 1]))
      .attr('r', 3)
      .attr('fill', color)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)

  }, [data, color, height])

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} style={{ height }} className="w-full" />
    </div>
  )
}
