import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Megaphone } from "lucide-react";

export default function AdsBannerCarousel({ banners = [], data = [], backendOrigin = "" }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedIndices, setFailedIndices] = useState({});
  const autoSlideIntervalRef = useRef(null);

  const startAutoSlide = () => {
    if (autoSlideIntervalRef.current) clearInterval(autoSlideIntervalRef.current);
    if (banners.length <= 1) return;
    autoSlideIntervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
  };

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (autoSlideIntervalRef.current) clearInterval(autoSlideIntervalRef.current);
    };
  }, [banners.length]);

  if (banners.length === 0) return null;

  const resolveUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    let clean = url.trim();
    if (/^\/uploads\//i.test(clean) || clean.startsWith("/")) {
      const origin = backendOrigin || (typeof window !== "undefined" ? window.location.origin : "");
      clean = `${origin.replace(/\/$/, "")}${clean.startsWith("/") ? clean : `/${clean}`}`;
    }
    if (typeof window !== "undefined" && window.location.protocol === "https:" && clean.startsWith("http:")) {
      clean = clean.replace(/^http:/, "https:");
    }
    return clean;
  };

  const rawBanner = banners[currentIndex];
  const currentBanner = resolveUrl(rawBanner);
  const currentData = data[currentIndex];
  const isImageFailed = failedIndices[currentIndex];

  const handleBannerClick = () => {
    const linkedRestaurants = currentData?.linkedRestaurants || [];
    if (linkedRestaurants.length > 0) {
      const firstRestaurant = linkedRestaurants[0];
      const restaurantSlug = firstRestaurant.slug || firstRestaurant.restaurantId || firstRestaurant._id;
      navigate(`/food/user/restaurants/${restaurantSlug}`);
    } else if (currentData?.ctaLink) {
      navigate(currentData.ctaLink);
    }
  };

  return (
    <div className="px-4 py-3 mb-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary animate-pulse" />
          Sponsored Ads
        </h2>
        {banners.length > 1 && (
          <div className="flex gap-1.5">
            {banners.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-gray-300 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div 
        className="relative w-full overflow-hidden h-[130px] sm:h-[160px] rounded-2xl shadow-md cursor-pointer group bg-gradient-to-r from-orange-600 to-red-600"
        onClick={handleBannerClick}
      >
        {/* Shimmer effect overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-2xl">
          <motion.div
            animate={{
              x: ['-200%', '200%'] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              repeatDelay: 5,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] w-[150%] h-full"
          />
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          {currentBanner && !isImageFailed && (
            <motion.img
              key={currentBanner || currentIndex}
              src={currentBanner}
              alt=""
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => {
                setFailedIndices((prev) => ({ ...prev, [currentIndex]: true }));
              }}
            />
          )}
        </AnimatePresence>
        
        {/* Subtle overlay for better contrast if image is too bright or has text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[5]" />

        {/* Text Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-3 sm:p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              {currentData?.title && (
                <h3 className="text-white font-bold text-base sm:text-lg leading-tight drop-shadow-md mb-0.5 sm:mb-1 line-clamp-1">
                  {currentData.title}
                </h3>
              )}
              {currentData?.subtitle && (
                <p className="text-white/90 text-[11px] sm:text-xs font-semibold drop-shadow-md mb-1.5 sm:mb-2 line-clamp-1">
                  {currentData.subtitle}
                </p>
              )}
              {currentData?.ctaText && (
                <div className="inline-flex items-center text-[10px] sm:text-xs font-bold text-yellow-400 bg-black/40 backdrop-blur-sm px-2 sm:px-2.5 py-1 rounded-md border border-yellow-400/30">
                  {currentData.ctaText}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
