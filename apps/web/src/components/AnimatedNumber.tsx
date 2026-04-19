import { useEffect, useState, useRef, useCallback } from 'react'
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
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const startAnimation = useCallback(() => {
    if (!hasAnimated) {
      setIsVisible(true)
      setHasAnimated(true)
    }
  }, [hasAnimated])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Check if already visible
    const rect = element.getBoundingClientRect()
    const isInViewport = rect.top < window.innerHeight && rect.bottom > 0
    
    if (isInViewport) {
      startAnimation()
      return
    }

    // Set up intersection observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation()
          observerRef.current?.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    observerRef.current.observe(element)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [startAnimation])

  // Format the static display value
  const formatStaticValue = () => {
    if (decimals > 0) {
      return `${prefix}${(0).toFixed(decimals)}${suffix}`
    }
    return `${prefix}0${suffix}`
  }

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
        formatStaticValue()
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
