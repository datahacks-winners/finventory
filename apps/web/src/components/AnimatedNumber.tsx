import { useEffect, useState } from 'react'
import CountUp from 'react-countup'

interface AnimatedNumberProps {
  value: number
  suffix?: string
  prefix?: string
  decimals?: number
  duration?: number
  className?: string
  separator?: string
}

export function AnimatedNumber({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  duration = 2,
  className = '',
  separator = ',',
}: AnimatedNumberProps) {
  const [start, setStart] = useState(false)

  useEffect(() => {
    // Small delay to ensure DOM is ready, then animate
    const timer = setTimeout(() => setStart(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (!start) {
    return <span className={className}>{prefix}0{suffix}</span>
  }

  return (
    <CountUp
      start={0}
      end={value}
      duration={duration}
      prefix={prefix}
      suffix={suffix}
      decimals={decimals}
      separator={separator}
      className={className}
      useEasing={true}
    />
  )
}

interface StatCardProps {
  value: number
  suffix?: string
  prefix?: string
  decimals?: number
  label: string
  color?: string
  className?: string
}

export function StatCard({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  label,
  color = 'text-primary',
  className = '',
}: StatCardProps) {
  return (
    <div className={className}>
      <div className={`text-5xl font-black mb-2 ${color}`}>
        <AnimatedNumber
          value={value}
          suffix={suffix}
          prefix={prefix}
          decimals={decimals}
        />
      </div>
      <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-300">
        {label}
      </div>
    </div>
  )
}
