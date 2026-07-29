import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export default function ImageLightboxModal({ isOpen, imageUrl, title, onClose }) {
  const modalRef = useRef(null);
  const triggerElementRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      if (modalRef.current) {
        modalRef.current.focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          onClose();
        } else if (e.key === "Tab" && modalRef.current) {
          const focusables = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              last.focus();
              e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        if (triggerElementRef.current && typeof triggerElementRef.current.focus === "function") {
          triggerElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Image preview"}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-12 right-0 sm:top-2 sm:right-2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close enlarged image"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Image Display */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-white/10 max-h-[80vh] flex items-center justify-center">
          <img
            src={imageUrl}
            alt={title || "Enlarged preview"}
            className="max-h-[80vh] w-auto max-w-full object-contain select-none"
            loading="eager"
          />
        </div>

        {/* Optional Title Caption */}
        {title && (
          <p className="mt-3 text-center text-sm font-medium text-white/90 bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm truncate max-w-md">
            {title}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
