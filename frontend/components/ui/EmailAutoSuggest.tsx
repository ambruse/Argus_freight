"use client";
import { useState, useRef, useEffect } from "react";
import { Contact } from "@/types";

type CompulsoryEmail = { id: number; email: string; dear_who: string; mode: string; is_active: boolean };

interface Props {
  contacts: Contact[];
  compulsoryEmails?: CompulsoryEmail[];
  currentPolCountry: string;
  currentMode: string;
  value: string;
  onChange: (email: string, dearWho?: string) => void;
}

export default function EmailAutoSuggest({
  contacts,
  compulsoryEmails = [],
  currentPolCountry,
  currentMode,
  value,
  onChange
}: Props) {
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

  // Filter contacts by country and mode
  const filteredContacts = contacts.filter(c => {
    const countryMatch = !currentPolCountry || (c.country && c.country.trim().toLowerCase() === currentPolCountry.trim().toLowerCase());
    const modeMatch = !currentMode || (c.mode && c.mode.trim().toLowerCase() === currentMode.trim().toLowerCase());
    return countryMatch && modeMatch;
  });

  // Filter compulsory emails by mode
  const filteredCompulsory = compulsoryEmails.filter(ce => {
    const modeMatch = !currentMode || (ce.mode && ce.mode.trim().toLowerCase() === currentMode.trim().toLowerCase());
    return ce.is_active && modeMatch;
  });

  // Merge suggestions into a unified display structure
  const mergedSuggestions = [
    ...filteredCompulsory.map(ce => ({
      email: ce.email,
      dear_who: ce.dear_who,
      mode: ce.mode,
      isCompulsory: true,
      country: null,
      pol: null,
      pod: null,
    })),
    ...filteredContacts.map(c => ({
      email: c.email,
      dear_who: c.dear_who,
      mode: c.mode,
      isCompulsory: false,
      country: c.country,
      pol: c.pol,
      pod: c.pod,
    }))
  ];

  // Apply query filter if user is actively typing
  const suggestions = mergedSuggestions.filter(s => {
    if (value) {
      return s.email.toLowerCase().includes(value.toLowerCase());
    }
    // If no value typed, only show suggestions if there's context (pol_country or mode)
    return currentPolCountry.trim() !== "" || currentMode.trim() !== "";
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
        onChange(c.email, c.dear_who);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${isOpen ? "z-[9999]" : "z-10"}`} ref={wrapperRef}>
      <input
        type="email"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleInputKeyDown}
        className="input w-full"
        placeholder="Select or type email..."
        required
      />
      
      {isOpen && suggestions.length > 0 && (
        <div ref={dropdownRef} className="absolute z-[9999] w-full mt-1 bg-surface-2 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
          {suggestions.map((c, index) => (
            <div
              key={`${c.email}-${c.isCompulsory ? "comp" : "contact"}-${index}`}
              onClick={() => {
                onChange(c.email, c.dear_who);
                setIsOpen(false);
              }}
              className={`px-4 py-2 cursor-pointer border-b border-white/[0.02] last:border-0 transition-colors ${
                index === activeIndex 
                  ? "bg-white/10 text-emerald-400 font-semibold" 
                  : "hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-primary text-xs truncate flex items-center gap-1.5">
                  {c.email}
                  {c.isCompulsory && (
                    <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-rose/10 text-rose border border-rose/20 flex-shrink-0">
                      Compulsory
                    </span>
                  )}
                </div>
                {c.mode && (
                  <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-white/10 text-muted uppercase flex-shrink-0">
                    {c.mode}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted flex gap-2 mt-0.5 flex-wrap">
                {c.dear_who && <span className="truncate">👤 {c.dear_who}</span>}
                {c.country && <span className="truncate">📍 {c.country}</span>}
                {c.pol && <span className="truncate">🚢 {c.pol}</span>}
                {c.pod && <span className="truncate">➡ {c.pod}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
