import { useState, useEffect } from 'react'
import type { UnsplashImage as UnsplashImageType } from '../services/unsplash'

interface UnsplashImageProps {
  src: string
  alt: string
  className?: string
  quality?: 'max' | 'high' | 'medium'
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  onLoad?: () => void
  onError?: () => void
  lazy?: boolean
  sizes?: string
}

export function UnsplashImage({
  src,
  alt,
  className = '',
  objectFit = 'cover',
  onLoad,
  onError,
  lazy = true,
  sizes,
}: UnsplashImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setError(false)
  }, [src])

  const handleLoad = () => {
    setLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setError(true)
    onError?.()
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
        src={src}
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

interface UnsplashGalleryProps {
  images: UnsplashImageType[]
  className?: string
  quality?: 'max' | 'high' | 'medium'
  columns?: 2 | 3 | 4
}

export function UnsplashGallery({
  images,
  className = '',
  quality = 'high',
  columns = 3,
}: UnsplashGalleryProps) {
  const get4KUrl = (image: UnsplashImageType): string => {
    const w = quality === 'max' ? 3840 : quality === 'high' ? 2560 : 1920
    const q = quality === 'max' ? 80 : 85
    return `${image.urls.raw}&w=${w}&q=${q}&fm=webp&fit=max`
  }

  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {images.map((image) => (
        <div
          key={image.id}
          className="relative aspect-[4/3] rounded-2xl overflow-hidden group"
        >
          <UnsplashImage
            src={get4KUrl(image)}
            alt={image.alt_description || image.description || 'Unsplash image'}
            className="group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-sm font-medium truncate">
              Photo by {image.user.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

interface UnsplashAttributionProps {
  photographer: string
  link: string
  className?: string
}

export function UnsplashAttribution({ photographer, link, className = '' }: UnsplashAttributionProps) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-xs text-outline hover:text-primary transition-colors ${className}`}
    >
      Photo by {photographer} on Unsplash
    </a>
  )
}
