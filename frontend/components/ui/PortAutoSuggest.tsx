"use client";
import { useState, useRef, useEffect } from "react";
import { MAJOR_PORTS, MajorPort } from "@/lib/ports";

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  mode?: string;
  country?: string;
  isPod?: boolean;
}

export default function PortAutoSuggest({ value, onChange, placeholder, mode, country, isPod }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter major ports based on mode and country
  const filteredPorts = MAJOR_PORTS.filter(p => {
    if (country && p.country.toLowerCase() !== country.toLowerCase()) {
      return false;
    }
    if (mode) {
      const upperMode = mode.toUpperCase();
      if (upperMode === "AIR") {
        if (p.type !== "Air Port") return false;
      } else if (upperMode === "SEA") {
        if (p.type !== "Sea Port") return false;
      }
    }
    return true;
  });

  const suggestions = value
    ? filteredPorts.filter(p => {
        const query = value.toLowerCase();
        return (
          p.port.toLowerCase().includes(query) ||
          p.country.toLowerCase().includes(query) ||
          p.city.toLowerCase().includes(query) ||
          p.region.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query)
        );
      })
    : filteredPorts;

  // Sort suggestions so that DOH is always at the top when isPod is true
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    if (isPod) {
      if (a.code === "DOH") return -1;
      if (b.code === "DOH") return 1;
    }
    return 0;
  });

  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev + 1;
        return next >= sortedSuggestions.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev - 1;
        return next < 0 ? sortedSuggestions.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < sortedSuggestions.length) {
        e.preventDefault();
        e.stopPropagation(); // Stop parent keydown handler from moving to next input
        const p = sortedSuggestions[activeIndex];
        const selectedVal = country 
          ? `${p.port} (${p.code})` 
          : `${p.port}, ${p.country} (${p.code})`;
        onChange(selectedVal);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${isOpen ? "z-[9999]" : "z-10"}`} ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleInputKeyDown}
        className="input w-full"
        placeholder={placeholder || "Select or type a port..."}
      />
      
      {isOpen && sortedSuggestions.length > 0 && (
        <div ref={dropdownRef} className="absolute z-[9999] w-full mt-1 bg-surface-2 border border-white/10 rounded-lg shadow-xl max-h-56 overflow-y-auto overflow-x-hidden">
          {sortedSuggestions.map((p, idx) => (
            <div
              key={`${p.code}-${idx}`}
              onClick={() => {
                // Set value as "[Port Name] ([Code])" if country is filtered, else normal "[Port Name], [Country] ([Code])"
                const selectedVal = country 
                  ? `${p.port} (${p.code})` 
                  : `${p.port}, ${p.country} (${p.code})`;
                onChange(selectedVal);
                setIsOpen(false);
              }}
              className={`px-4 py-2 cursor-pointer border-b border-white/[0.02] last:border-0 transition-colors flex justify-between items-center ${
                idx === activeIndex 
                  ? "bg-white/10 text-emerald-400 font-semibold" 
                  : "hover:bg-white/5"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-semibold text-primary text-xs">
                  {p.port}, {p.country}
                </span>
                <span className="text-[10px] text-muted">
                  {p.city ? `${p.city}, ` : ""}{p.region}
                </span>
              </div>
              <div className="text-[10px] text-muted font-mono bg-white/5 px-2 py-0.5 rounded">
                {p.code}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
