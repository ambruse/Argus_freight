"use client";
import { useState, useRef, useEffect } from "react";
import { Customer } from "@/types";

interface Props {
  customers: Customer[];
  value: string;
  onChange: (customerName: string) => void;
}

export default function CustomerAutoSuggest({ customers, value, onChange }: Props) {
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

  // Filter based on currently typed name
  const suggestions = value 
    ? customers.filter(c => c.name.toLowerCase().includes(value.toLowerCase()))
    : customers;

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
        return next >= suggestions.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev - 1;
        return next < 0 ? suggestions.length - 1 : next;
      });
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        e.stopPropagation(); // Stop parent keydown handler from moving to next input
        const c = suggestions[activeIndex];
        onChange(c.name);
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
        placeholder="Select or type a customer name..."
      />
      
      {isOpen && suggestions.length > 0 && (
        <div ref={dropdownRef} className="absolute z-[9999] w-full mt-1 bg-surface-2 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
          {suggestions.map((c, idx) => (
            <div
              key={c.id}
              onClick={() => {
                onChange(c.name);
                setIsOpen(false);
              }}
              className={`px-4 py-2 cursor-pointer border-b border-white/[0.02] last:border-0 transition-colors flex justify-between items-center ${
                idx === activeIndex 
                  ? "bg-white/10 text-emerald-400 font-semibold" 
                  : "hover:bg-white/5"
              }`}
            >
              <div className="font-semibold text-primary text-xs">{c.name}</div>
              <div className="text-[10px] text-muted font-mono bg-white/5 px-2 py-0.5 rounded">
                ID: {c.customer_id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
