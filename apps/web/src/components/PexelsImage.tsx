import { useState, useEffect } from 'react'
import type { PexelsPhoto as PexelsPhotoType } from '../services/pexels'

interface PexelsImageProps {
  src: string
  alt: string
  className?: string
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  onLoad?: () => void
  onError?: () => void
  lazy?: boolean
  sizes?: string
  fallbackSrc?: string
}

export function PexelsImage({
  src,
  alt,
  className = '',
  objectFit = 'cover',
  onLoad,
  onError,
  lazy = true,
  sizes,
  fallbackSrc,
}: PexelsImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)

  useEffect(() => {
    setLoaded(false)
    setError(false)
    setCurrentSrc(src)
  }, [src])

  const handleLoad = () => {
    setLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
    } else {
      setError(true)
      onError?.()
    }
  }

  if (error) {
    return (
      <div
        className={`bg-surface-container-low flex items-center justify-center ${className}`}
        style={{ objectFit }}
      >
        <span className="material-symbols-outlined text-outline text-4xl">image_not_supported</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-surface-container-low animate-pulse flex items-center justify-center">
          <span className="material-symbols-outlined text-outline/50 text-3xl">image</span>
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={`w-full h-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        style={{ objectFit }}
        loading={lazy ? 'lazy' : 'eager'}
        onLoad={handleLoad}
        onError={handleError}
        sizes={sizes}
      />
    </div>
  )
}

interface PexelsGalleryProps {
  photos: PexelsPhotoType[]
  className?: string
  quality?: 'original' | 'large2x' | 'large'
  columns?: 2 | 3 | 4
}

export function PexelsGallery({
  photos,
  className = '',
  quality = 'large2x',
  columns = 3,
}: PexelsGalleryProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="relative aspect-[4/3] rounded-2xl overflow-hidden group"
        >
          <PexelsImage
            src={photo.src[quality]}
            alt={photo.alt || 'Pexels image'}
            className="group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium truncate">
              Photo by {photo.photographer}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

interface PexelsAttributionProps {
  photographer: string
  link: string
  className?: string
}

export function PexelsAttribution({ photographer, link, className = '' }: PexelsAttributionProps) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-xs text-outline hover:text-primary transition-colors ${className}`}
    >
      Photo by {photographer} on Pexels
    </a>
  )
}
