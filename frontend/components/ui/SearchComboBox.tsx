"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import "./search-combobox.css";

export type SearchOption = { value: string; label: string; description?: string; kind?: string; searchText?: string };
export const searchText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
type Props = {
  value: string; onChange: (value: string) => void; options: SearchOption[];
  label: string; placeholder?: string; required?: boolean; allowCustom?: boolean;
  emptyMessage?: string; limit?: number;
};

export default function SearchComboBox({ value, onChange, options, label, placeholder, required, allowCustom = false, emptyMessage = "No matches. Try another search.", limit = 80 }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);
  const indexed = useMemo(() => options.map(option => ({ option, text: searchText(`${option.label} ${option.description || ""} ${option.searchText || ""}`) })), [options]);
  const terms = searchText(query).split(" ").filter(Boolean);
  const matches = indexed.filter(item => terms.every(term => item.text.includes(term)));
  const visible = matches.slice(0, limit);
  const choose = (option: SearchOption) => { onChange(option.value); setQuery(""); setOpen(false); setActive(-1); };
  useEffect(() => { input.current?.setCustomValidity(required && !allowCustom && !selected ? `Select ${label.toLowerCase()} from the suggestions.` : ""); }, [value, selected, required, allowCustom, label]);
  useEffect(() => { if (active >= 0) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);
  return <div className={`search-combobox ${open ? "search-combobox-open" : ""}`} onBlur={e => {
    if (!e.currentTarget.contains(e.relatedTarget)) { setOpen(false); setActive(-1); }
  }}>
    <input ref={input} className="input w-full" role="combobox" aria-label={label} aria-autocomplete="list"
      aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 && visible[active] ? `${id}-${active}` : undefined}
      autoComplete="off" required={required} placeholder={placeholder || `Search ${label.toLowerCase()}…`}
      value={open ? query : selected?.label || (allowCustom ? value : "")}
      onFocus={() => { setQuery(selected ? "" : allowCustom ? value : ""); setActive(-1); setOpen(true); }}
      onClick={() => { if (!open) { setQuery(selected ? "" : allowCustom ? value : ""); setActive(-1); setOpen(true); } }}
      onChange={e => { setQuery(e.target.value); onChange(allowCustom ? e.target.value : ""); setActive(-1); setOpen(true); }}
      onKeyDown={e => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault(); e.stopPropagation(); setOpen(true);
          setActive(n => !visible.length ? -1 : n < 0 ? (e.key === "ArrowDown" ? 0 : visible.length - 1) : (n + (e.key === "ArrowDown" ? 1 : -1) + visible.length) % visible.length);
        } else if (e.key === "Enter" && open) {
          e.preventDefault(); e.stopPropagation();
          if (visible[active]) choose(visible[active].option);
          else if (visible.length === 1) choose(visible[0].option);
        } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); setActive(-1); }
      }} />
    <span className="search-combobox-chevron" aria-hidden="true">⌄</span>
    {open && <div className="search-combobox-popover">
      <div ref={list} id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`} className="search-combobox-list">
        {visible.map(({ option }, i) => <div id={`${id}-${i}`} key={option.value} role="option" aria-selected={option.value === value}
          data-index={i} className={`search-combobox-option ${active === i ? "is-active" : ""}`}
          onMouseDown={e => e.preventDefault()} onMouseMove={() => setActive(i)} onClick={e => { e.preventDefault(); choose(option); }}>
          <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
          {option.kind && <span className="search-combobox-kind">{option.kind}</span>}
        </div>)}
      </div>
      <div role="status" className="search-combobox-status">{!matches.length ? emptyMessage : matches.length > limit ? `Showing ${limit} of ${matches.length}. Keep typing to narrow your search.` : `${matches.length} ${matches.length === 1 ? "match" : "matches"} · ↑ ↓ to browse, Enter to select`}</div>
    </div>}
  </div>;
}
