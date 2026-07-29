import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ImageLightboxModal from "./ImageLightboxModal";

export default function AutoSlider({
  items,
  renderItem,
  autoAdvanceMs = 4000,
  loop = true,
  itemsPerView = "auto",
  className = "",
  itemClassName = "",
}) {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [lightbox, setLightbox] = useState({ isOpen: false, imageUrl: "", title: "" });
  
  const timerRef = useRef(null);
  const resumeTimeoutRef = useRef(null);

  const isInteractingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isDraggingRef = useRef(false);

  // If no items or loading state, render nothing
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  const openLightbox = useCallback((imageUrl, title = "") => {
    if (!imageUrl) return;
    setLightbox({ isOpen: true, imageUrl, title });
    setIsPaused(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox({ isOpen: false, imageUrl: "", title: "" });
    setIsPaused(false);
  }, []);

  // Pause / Resume handling
  const handleInteractionStart = useCallback(() => {
    isInteractingRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    setIsPaused(true);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    isInteractingRef.current = false;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      if (!isInteractingRef.current && !lightbox.isOpen) {
        setIsPaused(false);
      }
    }, 2000);
  }, [lightbox.isOpen]);

  // Slide navigation
  const scrollByDirection = useCallback(
    (direction) => {
      if (!scrollRef.current) return;
      const container = scrollRef.current;
      const cardWidth = container.firstElementChild?.clientWidth || 280;
      const scrollAmount = direction === "next" ? cardWidth + 16 : -(cardWidth + 16);

      const maxScroll = container.scrollWidth - container.clientWidth;
      const currentScroll = container.scrollLeft;

      if (direction === "next" && currentScroll >= maxScroll - 10) {
        if (loop) {
          container.scrollTo({ left: 0, behavior: "smooth" });
        }
      } else if (direction === "prev" && currentScroll <= 10) {
        if (loop) {
          container.scrollTo({ left: maxScroll, behavior: "smooth" });
        }
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }

      handleInteractionStart();
      handleInteractionEnd();
    },
    [loop, handleInteractionStart, handleInteractionEnd]
  );

  // Auto-advance timer
  useEffect(() => {
    if (isPaused || lightbox.isOpen || items.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      scrollByDirection("next");
    }, autoAdvanceMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, lightbox.isOpen, items.length, autoAdvanceMs, scrollByDirection]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollByDirection("prev");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollByDirection("next");
    }
  };

  // Mouse Drag handlers
  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    handleInteractionStart();
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      handleInteractionEnd();
    }
  };

  // Item per view width style helper
  const getItemWidthStyle = () => {
    if (typeof itemsPerView === "number") {
      return { flex: `0 0 ${100 / itemsPerView}%` };
    }
    return {};
  };

  return (
    <div
      ref={containerRef}
      className={`relative group/slider focus:outline-none ${className}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleInteractionStart}
      onMouseLeave={(e) => {
        handleMouseUpOrLeave();
        handleInteractionEnd();
      }}
      onTouchStart={handleInteractionStart}
      onTouchEnd={handleInteractionEnd}
      aria-label="Auto sliding content carousel"
    >
      {/* Left Navigation Arrow */}
      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            scrollByDirection("prev");
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:scale-110 opacity-0 group-hover/slider:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Slider Container */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none scroll-smooth py-1 px-0.5 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item, index) => (
          <div
            key={item._id || item.id || `slider-item-${index}`}
            className={`shrink-0 snap-start transition-transform duration-300 ${
              itemsPerView === "auto"
                ? "w-[240px] sm:w-[280px] lg:w-[320px]"
                : ""
            } ${itemClassName}`}
            style={getItemWidthStyle()}
          >
            {renderItem(item, { openLightbox })}
          </div>
        ))}
      </div>

      {/* Right Navigation Arrow */}
      {items.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            scrollByDirection("next");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:scale-110 opacity-0 group-hover/slider:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightbox.isOpen}
        imageUrl={lightbox.imageUrl}
        title={lightbox.title}
        onClose={closeLightbox}
      />
    </div>
  );
}
