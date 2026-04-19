import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CO2_TONS = [8.2, 10.4, 12.1, 14.8, 13.2, 16.9, 19.4, 22.1, 18.7, 23.4, 20.2, 24.8]
const REVENUE_K = [28, 36, 42, 51, 45, 58, 65, 74, 63, 80, 69, 85]

export default function ImpactLineChart({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const W = containerRef.current.clientWidth || 600
    const H = 260
    const margin = { top: 24, right: 72, bottom: 44, left: 60 }
    const iW = W - margin.left - margin.right
    const iH = H - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', W).attr('height', H)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scalePoint().domain(MONTHS).range([0, iW])
    const yCO2 = d3.scaleLinear().domain([0, 28]).range([iH, 0])
    const yRev = d3.scaleLinear().domain([0, 100]).range([iH, 0])

    // Gradients
    const defs = svg.append('defs')
    const gradCO2 = defs.append('linearGradient').attr('id', 'lg-co2').attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%')
    gradCO2.append('stop').attr('offset','0%').attr('stop-color','#005f93').attr('stop-opacity',0.18)
    gradCO2.append('stop').attr('offset','100%').attr('stop-color','#005f93').attr('stop-opacity',0)
    const gradRev = defs.append('linearGradient').attr('id', 'lg-rev').attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%')
    gradRev.append('stop').attr('offset','0%').attr('stop-color','#8c4f14').attr('stop-opacity',0.15)
    gradRev.append('stop').attr('offset','100%').attr('stop-color','#8c4f14').attr('stop-opacity',0)

    // Grid
    g.append('g')
      .call(d3.axisLeft(yCO2).ticks(5).tickSize(-iW).tickFormat(() => ''))
      .call(gg => {
        gg.select('.domain').remove()
        gg.selectAll('line').attr('stroke','#c0c7d1').attr('stroke-opacity',0.2).attr('stroke-dasharray','4,4')
      })

    const lineFn = (yFn: d3.ScaleLinear<number,number>) =>
      d3.line<number>()
        .x((_, i) => x(MONTHS[i])!)
        .y(d => yFn(d))
        .curve(d3.curveCatmullRom.alpha(0.5))

    const areaFn = (yFn: d3.ScaleLinear<number,number>) =>
      d3.area<number>()
        .x((_, i) => x(MONTHS[i])!)
        .y0(iH)
        .y1(d => yFn(d))
        .curve(d3.curveCatmullRom.alpha(0.5))

    // Areas
    g.append('path').datum(CO2_TONS).attr('fill','url(#lg-co2)').attr('d', areaFn(yCO2))
    g.append('path').datum(REVENUE_K).attr('fill','url(#lg-rev)').attr('d', areaFn(yRev))

    // Lines
    const pathCO2 = g.append('path').datum(CO2_TONS)
      .attr('fill','none').attr('stroke','#005f93').attr('stroke-width',2.5).attr('d', lineFn(yCO2))
    const pathRev = g.append('path').datum(REVENUE_K)
      .attr('fill','none').attr('stroke','#8c4f14').attr('stroke-width',2.5).attr('d', lineFn(yRev))

    // Animate draw
    for (const [path, delay] of [[pathCO2, 0], [pathRev, 150]] as const) {
      const len = (path.node() as SVGPathElement).getTotalLength()
      path.attr('stroke-dasharray', len).attr('stroke-dashoffset', len)
        .transition().duration(1100).delay(delay).ease(d3.easeLinear).attr('stroke-dashoffset', 0)
    }

    // Dots — CO2
    g.selectAll('.dot-co2').data(CO2_TONS).join('circle')
      .attr('cx', (_, i) => x(MONTHS[i])!).attr('cy', d => yCO2(d))
      .attr('r', 3.5).attr('fill','#005f93').attr('stroke','white').attr('stroke-width',1.5)

    // Dots — Revenue
    g.selectAll('.dot-rev').data(REVENUE_K).join('circle')
      .attr('cx', (_, i) => x(MONTHS[i])!).attr('cy', d => yRev(d))
      .attr('r', 3.5).attr('fill','#8c4f14').attr('stroke','white').attr('stroke-width',1.5)

    // X axis
    g.append('g')
      .attr('transform',`translate(0,${iH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(gg => {
        gg.select('.domain').remove()
        gg.selectAll('text').attr('fill','#707881').attr('font-size','11px').attr('font-weight','600').attr('dy','1.2em')
      })

    // Y left — CO2
    g.append('g')
      .call(d3.axisLeft(yCO2).ticks(5).tickFormat(d => `${d}t`))
      .call(gg => {
        gg.select('.domain').remove(); gg.selectAll('line').remove()
        gg.selectAll('text').attr('fill','#005f93').attr('font-size','11px')
      })

    // Y right — Revenue
    g.append('g')
      .attr('transform',`translate(${iW},0)`)
      .call(d3.axisRight(yRev).ticks(5).tickFormat(d => `$${d}k`))
      .call(gg => {
        gg.select('.domain').remove(); gg.selectAll('line').remove()
        gg.selectAll('text').attr('fill','#8c4f14').attr('font-size','11px')
      })

    // Legend
    const legend = g.append('g').attr('transform',`translate(${iW / 2 - 80}, -18)`)
    legend.append('line').attr('x1',0).attr('x2',16).attr('y1',0).attr('y2',0).attr('stroke','#005f93').attr('stroke-width',2.5)
    legend.append('text').attr('x',20).attr('y',4).attr('fill','#005f93').attr('font-size','10px').attr('font-weight','700').text('CO₂ TONS')
    legend.append('line').attr('x1',90).attr('x2',106).attr('y1',0).attr('y2',0).attr('stroke','#8c4f14').attr('stroke-width',2.5)
    legend.append('text').attr('x',110).attr('y',4).attr('fill','#8c4f14').attr('font-size','10px').attr('font-weight','700').text('REVENUE $K')

  }, [])

  return (
    <div ref={containerRef} className={className}>
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}
