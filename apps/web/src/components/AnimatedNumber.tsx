import { useEffect, useState, useRef } from 'react'
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
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <span ref={ref} className={className}>
      {isVisible ? (
        <CountUp
          start={0}
          end={value}
          duration={duration}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          separator={separator}
          useEasing={true}
          easingFn={(t, b, c, d) => {
            // Ease out quart
            t /= d
            t--
            return -c * (t * t * t * t - 1) + b
          }}
        />
      ) : (
        `${prefix}0${suffix}`
      )}
    </span>
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
