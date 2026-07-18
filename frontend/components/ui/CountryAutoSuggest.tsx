"use client";
import { useState, useRef, useEffect } from "react";
import { ALL_COUNTRIES } from "@/lib/ports";

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function CountryAutoSuggest({ value, onChange, placeholder }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter countries by query
  const suggestions = value
    ? ALL_COUNTRIES.filter(c => c.toLowerCase().includes(value.toLowerCase()))
    : ALL_COUNTRIES;

  // Reset active index on value change
  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") { setIsOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1 >= suggestions.length ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 < 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        e.stopPropagation();
        onChange(suggestions[activeIndex]);
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
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="input w-full"
        placeholder={placeholder || "Search country..."}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-[9999] w-full mt-1 bg-surface-2 border border-white/10 rounded-lg shadow-xl max-h-56 overflow-y-auto overflow-x-hidden"
        >
          {suggestions.map((country, idx) => (
            <div
              key={country}
              onClick={() => { onChange(country); setIsOpen(false); }}
              className={`px-4 py-2.5 cursor-pointer border-b border-white/[0.02] last:border-0 transition-colors flex items-center gap-2 ${
                idx === activeIndex
                  ? "bg-white/10 text-emerald-400 font-semibold"
                  : "hover:bg-white/5"
              }`}
            >
              <span className="font-semibold text-primary text-xs">{country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
