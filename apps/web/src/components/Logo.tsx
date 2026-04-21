interface LogoProps {
  className?: string
  color?: string
  showText?: boolean
  textColor?: string
}

export default function Logo({ 
  className = '', 
  color = '#1E5AA8',
  showText = true,
  textColor = 'currentColor'
}: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Shark Fin + Waves Icon */}
      <svg 
        width="40" 
        height="40" 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Shark Fin / Sail */}
        <path 
          d="M20 70 C20 70, 25 30, 55 15 C65 10, 75 12, 80 20 C75 25, 70 35, 65 45 C60 55, 55 65, 50 70 L20 70Z" 
          fill={color}
        />
        {/* Upper Wave */}
        <path 
          d="M10 75 Q25 65, 40 75 T70 75 T100 70" 
          stroke={color} 
          strokeWidth="6" 
          strokeLinecap="round"
          fill="none"
        />
        {/* Lower Wave */}
        <path 
          d="M15 88 Q30 80, 45 88 T75 85 T95 82" 
          stroke={color} 
          strokeWidth="5" 
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      
      {showText && (
        <span 
          className="text-2xl font-bold tracking-[-0.02em] italic-accent-caveat"
          style={{ color: textColor }}
        >
          Finventory
        </span>
      )}
    </div>
  )
}
