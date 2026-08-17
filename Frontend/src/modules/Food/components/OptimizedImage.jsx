import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { normalizeImageUrl } from '@food/utils/common'

export const ShopPlaceholder = () => (
  <svg viewBox="0 0 100 100" className="w-[40%] h-[40%] max-w-[80px] max-h-[80px] text-[#cfcac2] dark:text-zinc-600" fill="currentColor">
    {/* Background clouds */}
    <path opacity="0.3" d="M15,40 Q15,35 20,35 Q25,32 30,35 Q35,35 35,40 Z" fill="currentColor" />
    <path opacity="0.3" d="M75,35 Q75,30 80,30 Q85,27 90,30 Q95,30 95,35 Z" fill="currentColor" />

    {/* Circular Sign with Fork and Spoon */}
    <circle cx="50" cy="30" r="16" fill="currentColor" opacity="0.1" />
    <circle cx="50" cy="30" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M46,22 L46,29 M43,22 L43,26 M49,22 L49,26 M43,26 Q46,30 49,26 M46,30 L46,38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M54,23 C51,23 51,28 54,29 C57,28 57,23 54,23 Z M54,29 L54,38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

    {/* Shop Building Outline */}
    <path d="M22,55 L78,55 L78,85 L22,85 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />

    {/* Scalloped Awning */}
    <path d="M18,45 L82,45 L80,55 L20,55 Z" fill="currentColor" opacity="0.1" />
    <path d="M18,45 L82,45 L80,55 L20,55 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M20,55 Q23.75,60 27.5,55 Q31.25,60 35,55 Q38.75,60 42.5,55 Q46.25,60 50,55 Q53.75,60 57.5,55 Q61.25,60 65,55 Q68.75,60 72.5,55 Q76.25,60 80,55" fill="none" stroke="currentColor" strokeWidth="2" />

    {/* Door */}
    <rect x="30" y="65" width="16" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Window */}
    <rect x="52" y="65" width="20" height="12" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="52" y1="71" x2="72" y2="65" stroke="currentColor" strokeWidth="1" opacity="0.5" />

    {/* Ground / Bushes */}
    <line x1="8" y1="85" x2="92" y2="85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path opacity="0.4" d="M12,85 Q12,75 18,75 Q24,72 26,85 Z" fill="currentColor" />
    <path opacity="0.4" d="M88,85 Q88,75 82,75 Q76,70 70,85 Z" fill="currentColor" />
  </svg>
)

export const FoodPlaceholder = () => (
  <svg viewBox="0 0 100 100" className="w-[40%] h-[40%] max-w-[80px] max-h-[80px] text-[#cfcac2] dark:text-zinc-600" fill="currentColor">
    {/* Circle Background */}
    <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.08" />
    {/* Cloche Dome */}
    <path d="M25,65 Q25,30 50,30 Q75,30 75,65 Z" fill="currentColor" opacity="0.5" />
    {/* Knob */}
    <circle cx="50" cy="25" r="5" fill="currentColor" opacity="0.7" />
    {/* Highlights */}
    <path d="M35,55 Q35,42 45,38" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.7" />

    {/* Plate */}
    <rect x="20" y="66" width="60" height="7" rx="3.5" fill="currentColor" opacity="0.7" />
    <rect x="28" y="74" width="44" height="4" rx="2" fill="currentColor" opacity="0.5" />
  </svg>
)

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Direct Google and third-party image resolution (with no-referrer bypass)
 * - Cloudinary image optimizations
 * - Resilient direct image fallback if any proxy fails
 * - Lazy loading with Intersection Observer
 * - Fallback placeholders
 */
const OptimizedImage = React.memo(({
  src,
  alt,
  className = '',
  priority = false,
  sizes = '100vw',
  objectFit = 'cover',
  placeholder = 'blur',
  placeholderType = 'food',
  blurDataURL,
  fallbackSrc,
  onLoad,
  onError,
  ...props
}) => {
  const cleanSrc = useMemo(() => normalizeImageUrl(src || ''), [src])
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [useRawFallback, setUseRawFallback] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef(null)
  const observerRef = useRef(null)

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false)
    setHasError(false)
    setUseRawFallback(false)
  }, [cleanSrc])

  // Native Cloudinary transforms
  const isCloudinary = useMemo(() => {
    return typeof cleanSrc === 'string' && /res\.cloudinary\.com/i.test(cleanSrc) && /\/image\/upload\//i.test(cleanSrc);
  }, [cleanSrc]);

  const getCloudinaryUrl = (imageSrc, params = {}) => {
    if (!imageSrc) return imageSrc;
    const { w, format, q = 80 } = params;
    const transforms = [];
    if (format === 'webp') transforms.push('f_webp');
    else if (format) transforms.push(`f_${format}`);
    else transforms.push('f_auto');
    transforms.push(`q_${q}`);
    if (w) transforms.push(`w_${w}`);

    const hasTransform = /\/image\/upload\/(?:f_|q_|w_|h_|c_|dpr_|g_)/i.test(imageSrc);
    if (!hasTransform) {
      return imageSrc.replace('/image/upload/', `/image/upload/${transforms.join(',')}/`);
    }
    return imageSrc;
  };

  const currentDisplaySrc = useMemo(() => {
    if (!cleanSrc) return '';
    if (useRawFallback || !isCloudinary) return cleanSrc;
    return getCloudinaryUrl(cleanSrc, { w: 800, q: 80 });
  }, [cleanSrc, useRawFallback, isCloudinary]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return

    if (!imgRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current)
            }
          }
        })
      },
      {
        rootMargin: '100px',
        threshold: 0.01
      }
    )

    observerRef.current.observe(imgRef.current)

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current)
      }
    }
  }, [priority, isInView])

  const handleLoad = (e) => {
    setIsLoaded(true)
    if (onLoad) onLoad(e)
  }

  const handleError = (e) => {
    if (!useRawFallback && isCloudinary) {
      // First retry with raw un-transformed direct URL
      setUseRawFallback(true);
      return;
    }
    if (fallbackSrc && !hasError) {
      setHasError(true);
      return;
    }
    setHasError(true)
    if (onError) onError(e)
  }

  const defaultBlurDataURL = blurDataURL || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjwvc3ZnPg=='

  if (!cleanSrc) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-[#f7f5f2] dark:bg-zinc-800 flex flex-col items-center justify-center">
          {placeholderType === 'shop' ? <ShopPlaceholder /> : <FoodPlaceholder />}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} ref={imgRef}>
      {/* Blur Placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: isLoaded ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          style={{
            backgroundImage: `url(${defaultBlurDataURL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)',
            transform: 'scale(1.1)' }}
        />
      )}

      {/* Loading Skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-[#f7f5f2] dark:bg-zinc-800 flex flex-col items-center justify-center animate-pulse">
          {placeholderType === 'shop' ? <ShopPlaceholder /> : <FoodPlaceholder />}
        </div>
      )}

      {/* Actual Image */}
      {isInView && !hasError && (
        <motion.img
          src={currentDisplaySrc}
          alt={alt || ''}
          className={`w-full h-full ${objectFit === 'cover' ? 'object-cover' : objectFit === 'contain' ? 'object-contain' : ''} ${priority || isLoaded ? 'opacity-100' : 'opacity-0'} ${!priority && 'transition-opacity duration-300'}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {/* Fallback image or Error State */}
      {hasError && (
        <div className="absolute inset-0 bg-[#f7f5f2] dark:bg-zinc-800 flex flex-col items-center justify-center">
          {fallbackSrc ? (
            <img
              src={fallbackSrc}
              alt={alt || ''}
              className={`w-full h-full ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}`}
              referrerPolicy="no-referrer"
            />
          ) : (
            placeholderType === 'shop' ? <ShopPlaceholder /> : <FoodPlaceholder />
          )}
        </div>
      )}
    </div>
  )
})

export default OptimizedImage
