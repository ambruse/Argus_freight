"use client";
import { useState, useRef, useEffect } from "react";
import { Contact } from "@/types";

interface Props {
  contacts: Contact[];
  currentPol: string;
  currentPod: string;
  currentMode: string;
  currentDearWho: string;
  value: string;
  onChange: (email: string, dearWho?: string) => void;
}

export default function EmailAutoSuggest({
  contacts, currentPol, currentPod, currentMode, currentDearWho, value, onChange
}: Props) {
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

  // Smarter matching logic: handles "INDIA, GUJRAT" vs "GUJRAT"
  const isMatch = (input: string | null | undefined, dbVal: string | null | undefined) => {
    // If the input field in the form is empty, we don't enforce a match for this field.
    // If the user hasn't typed anything for POL, any POL is technically acceptable.
    if (!input || input.trim() === '') return true;
    
    // If input has a value but DB doesn't, they don't match.
    if (!dbVal) return false;

    // Split by comma, trim, and check for intersection
    const inputParts = input.toLowerCase().split(',').map(s => s.trim()).filter(s => s.length > 0);
    const dbParts = dbVal.toLowerCase().split(',').map(s => s.trim()).filter(s => s.length > 0);

    // If any part of the input matches any part of the DB value, it's a match
    return inputParts.some(ip => dbParts.some(dp => ip === dp || ip.includes(dp) || dp.includes(ip)));
  };

  // Filter contacts
  const suggestions = contacts.filter(c => {
    // If they are actively typing an email, prioritize that
    if (value && c.email.toLowerCase().includes(value.toLowerCase())) return true;
    
    // Otherwise, strictly match context: ALL provided fields must match (AND condition)
    const polMatch = isMatch(currentPol, c.pol);
    const podMatch = isMatch(currentPod, c.pod);
    const modeMatch = isMatch(currentMode, c.mode);
    
    // If all conditions pass, it's a valid suggestion for this specific route/mode
    // But don't just show ALL contacts if everything is blank.
    // Require at least one field (pol, mode) to have been filled out to show contextual suggestions.
    const hasContext = (currentPol.trim() !== '') || (currentMode.trim() !== '');
    
    return hasContext && polMatch && modeMatch;
  });

  return (
    <div className={`relative ${isOpen ? "z-50" : "z-10"}`} ref={wrapperRef}>
      <input
        type="email"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="input w-full"
        placeholder="Select or type email..."
        required
      />
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface-2 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
          {suggestions.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                onChange(c.email, c.dear_who);
                setIsOpen(false);
              }}
              className="px-4 py-2 hover:bg-white/5 cursor-pointer border-b border-white/[0.02] last:border-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-primary text-xs">{c.email}</div>
                {c.mode && (
                  <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-white/10 text-muted uppercase">
                    {c.mode}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted flex gap-2 mt-0.5">
                {c.dear_who && <span>👤 {c.dear_who}</span>}
                {c.pol && <span>🚢 {c.pol}</span>}
                {c.pod && <span>➡ {c.pod}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
