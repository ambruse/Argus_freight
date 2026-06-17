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

  // Filter based on currently typed name
  const suggestions = value 
    ? customers.filter(c => c.name.toLowerCase().includes(value.toLowerCase()))
    : customers;

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
        placeholder="Select or type a customer name..."
      />
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface-2 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
          {suggestions.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                onChange(c.name);
                setIsOpen(false);
              }}
              className="px-4 py-2 hover:bg-white/5 cursor-pointer border-b border-white/[0.02] last:border-0 transition-colors flex justify-between items-center"
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
