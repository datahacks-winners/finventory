import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LBS_DATA = [12400, 15800, 18200, 22000, 19500, 24800, 28100, 31600, 27400, 34200, 29800, 36000]

export default function ImpactBarChart({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const W = containerRef.current.clientWidth || 600
    const H = 280
    const margin = { top: 24, right: 24, bottom: 44, left: 64 }
    const iW = W - margin.left - margin.right
    const iH = H - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', W).attr('height', H)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleBand().domain(MONTHS).range([0, iW]).padding(0.32)
    const y = d3.scaleLinear().domain([0, d3.max(LBS_DATA)! * 1.12]).range([iH, 0])

    // Gradient
    const defs = svg.append('defs')
    const grad = defs.append('linearGradient').attr('id', 'bar-grad').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%')
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#1e78b4')
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#005f93').attr('stop-opacity', 0.5)

    // Horizontal grid
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat(() => ''))
      .call(gg => {
        gg.select('.domain').remove()
        gg.selectAll('line').attr('stroke', '#c0c7d1').attr('stroke-opacity', 0.25).attr('stroke-dasharray', '4,4')
      })

    // Bars
    g.selectAll('.bar')
      .data(LBS_DATA)
      .join('rect')
      .attr('x', (_, i) => x(MONTHS[i])!)
      .attr('y', iH)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', 'url(#bar-grad)')
      .attr('rx', 5)
      .transition()
      .duration(700)
      .delay((_, i) => i * 55)
      .ease(d3.easeBackOut.overshoot(0.6))
      .attr('y', d => y(d))
      .attr('height', d => iH - y(d))

    // Value labels on hover via title
    g.selectAll('.bar-label')
      .data(LBS_DATA)
      .join('text')
      .attr('x', (_, i) => x(MONTHS[i])! + x.bandwidth() / 2)
      .attr('y', d => y(d) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#005f93')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('opacity', 0)
      .text(d => `${(d / 1000).toFixed(1)}k`)
      .transition()
      .delay((_, i) => 700 + i * 55)
      .attr('opacity', 1)

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(gg => {
        gg.select('.domain').remove()
        gg.selectAll('text').attr('fill', '#707881').attr('font-size', '11px').attr('font-weight', '600').attr('dy', '1.2em')
      })

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${+d / 1000}k`))
      .call(gg => {
        gg.select('.domain').remove()
        gg.selectAll('line').remove()
        gg.selectAll('text').attr('fill', '#707881').attr('font-size', '11px')
      })

    // Y label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -iH / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#707881')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('letter-spacing', '0.1em')
      .text('LBS RESCUED')

  }, [])

  return (
    <div ref={containerRef} className={className}>
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
