"use client";
import { useState, useRef, useEffect } from "react";
import { MAJOR_PORTS, MajorPort } from "@/lib/ports";

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  mode?: string;
  country?: string;
}

export default function PortAutoSuggest({ value, onChange, placeholder, mode, country }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className={`relative ${isOpen ? "z-50" : "z-10"}`} ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="input w-full"
        placeholder={placeholder || "Select or type a port..."}
      />
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface-2 border border-white/10 rounded-lg shadow-xl max-h-56 overflow-y-auto overflow-x-hidden">
          {suggestions.map((p, idx) => (
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
              className="px-4 py-2 hover:bg-white/5 cursor-pointer border-b border-white/[0.02] last:border-0 transition-colors flex justify-between items-center"
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
