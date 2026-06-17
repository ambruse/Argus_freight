"use client";
// components/ui/Modal.tsx
// ─────────────────────────────────────────────────────────────
//  Glassmorphism modal with animated entry, Escape to close.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen:       boolean;
  onClose:      () => void;
  title?:       string;
  size?:        "sm" | "md" | "lg" | "xl" | "full";
  children:     React.ReactNode;
  footer?:      React.ReactNode;
}

const SIZE_CLASSES = {
  sm:   "max-w-md",
  md:   "max-w-2xl",
  lg:   "max-w-4xl",
  xl:   "max-w-6xl",
  full: "max-w-[95vw]",
};

export default function Modal({ isOpen, onClose, title, size = "lg", children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Prevent background scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const modal = (
    <div
      className="modal-overlay animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        className={`
          w-full ${SIZE_CLASSES[size]} max-h-[90vh] flex flex-col
          glass rounded-2xl shadow-card animate-scale-in overflow-hidden
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
            <h2 className="text-base font-semibold text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/10 flex items-center
                         justify-center text-muted hover:text-primary transition-all duration-150"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : null;
}
