"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function GlobalPageLoader() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  // Synchronous navigation state check
  const isNavigating = () => {
    if (typeof window !== "undefined") {
      return (window as any).__argus_navigating === true;
    }
    return false;
  };

  const setNavigating = (val: boolean) => {
    if (typeof window !== "undefined") {
      (window as any).__argus_navigating = val;
    }
  };

  // Reset navigation status on path transition complete
  useEffect(() => {
    setNavigating(false);
    setIsLoading(false);
  }, [pathname]);

  // Proactively clear selection highlights on interactive clicks to prevent React unmount freezes
  useEffect(() => {
    const handleInteractiveMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest("button, a, input, select, textarea, [role='button']");
      if (isInteractive) {
        try {
          if (window.getSelection) {
            window.getSelection()?.removeAllRanges();
          }
          if (document.getSelection) {
            document.getSelection()?.removeAllRanges();
          }
        } catch (err) {
          // safe catch
        }
      }
    };

    document.addEventListener("mousedown", handleInteractiveMouseDown, { capture: true });
    return () => {
      document.removeEventListener("mousedown", handleInteractiveMouseDown, { capture: true });
    };
  }, []);

  // Synchronous document-level blocker for all pointer, touch, and keyboard interactions when navigating
  useEffect(() => {
    const handleBlocker = (e: Event) => {
      if (isNavigating()) {
        try {
          if (window.getSelection) window.getSelection()?.removeAllRanges();
          if (document.getSelection) document.getSelection()?.removeAllRanges();
        } catch (err) {}
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleKeyBlocker = (e: KeyboardEvent) => {
      if (isNavigating()) {
        // Allow reload keys (F5, Ctrl+R, Cmd+R) and devtools (F12)
        if (e.key === "F5" || e.key === "F12") return;
        if ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R")) return;

        e.preventDefault();
        e.stopPropagation();
      }
    };

    const interactionEvents = [
      "click",
      "mousedown",
      "mouseup",
      "touchstart",
      "touchend",
      "pointerdown",
      "pointerup"
    ];

    interactionEvents.forEach(event => {
      document.addEventListener(event, handleBlocker, { capture: true });
    });

    const keyEvents = ["keydown", "keyup", "keypress"];
    keyEvents.forEach(event => {
      document.addEventListener(event, handleKeyBlocker as any, { capture: true });
    });

    return () => {
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleBlocker, { capture: true });
      });
      keyEvents.forEach(event => {
        document.removeEventListener(event, handleKeyBlocker as any, { capture: true });
      });
    };
  }, []);

  // Intercept navigation clicks
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // If already navigating, block immediately
      if (isNavigating()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (anchor.target && anchor.target.toLowerCase() === "_blank") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      try {
        const url = new URL(anchor.href);
        if (url.host !== window.location.host) return;

        const currentPath = window.location.pathname;
        const targetPath = url.pathname;

        if (targetPath !== currentPath) {
          // Synchronously lock navigation state and activate overlay
          setNavigating(true);
          setIsLoading(true);
        }
      } catch (err) {
        // ignore
      }
    };

    document.addEventListener("click", handleLinkClick, { capture: true });

    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => {
        setNavigating(false);
        setIsLoading(false);
      }, 10000);
    }

    return () => {
      document.removeEventListener("click", handleLinkClick, { capture: true });
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all duration-300"
      style={{
        zIndex: 99999,
        cursor: "wait",
      }}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin-reverse {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          .animate-spin-reverse {
            animation: spin-reverse 1.2s linear infinite;
          }
        `
      }} />

      <div className="flex flex-col items-center space-y-4">
        {/* Premium Gold/Navy Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/[0.04] animate-spin" 
            style={{ borderTopColor: "#f5b037" }}
          />
          <div className="absolute inset-2 rounded-full border-4 border-white/[0.02] animate-spin-reverse opacity-70"
            style={{ borderBottomColor: "#f5b037" }}
          />
        </div>
        
        {/* Status Text */}
        <div className="text-center">
          <h2 className="text-sm font-semibold tracking-wider text-indigo-100 uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Loading Page
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 animate-pulse">
            Please wait...
          </p>
        </div>
      </div>
    </div>
  );
}
