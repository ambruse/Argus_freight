"use client";
import { useMemo } from "react";
import SearchComboBox from "./SearchComboBox";
import { availablePorts } from "@/lib/portCatalog";
interface Props { value: string; onChange: (val: string) => void; placeholder?: string; mode?: string; country?: string; isPod?: boolean; label?: string }
export default function PortAutoSuggest({ value, onChange, placeholder, mode, country, isPod, label }: Props) {
  const options = useMemo(() => availablePorts(country, mode).map(p => ({
    value: country ? p.port_name : `${p.country_name}, ${p.port_name}`, label: country ? p.port_name : `${p.country_name}, ${p.port_name}`,
    description: country ? p.country_name : undefined, kind: p.mode === "AIR" ? "Airport" : "Seaport", searchText: [p.id, ...p.aliases].join(" "),
  })), [country, mode]);
  return <SearchComboBox key={`${country || ""}-${mode || ""}`} value={value} onChange={onChange} options={options}
    label={label || (isPod ? "POD" : "POL")} placeholder={placeholder} allowCustom
    emptyMessage="No listed ports match. Try another country or search, or enter your location." />;
}
