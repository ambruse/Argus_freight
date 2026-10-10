"use client";
import SearchComboBox from "./SearchComboBox";
import { PORT_COUNTRIES } from "@/lib/portCatalog";
const options = PORT_COUNTRIES.map(c => ({ value: c.name, label: c.name, searchText: [c.code, ...c.aliases].join(" ") }));
interface Props { value: string; onChange: (value: string) => void; placeholder?: string; label?: string; required?: boolean; strict?: boolean }
export default function CountryAutoSuggest({ value, onChange, placeholder, label = "Country", required, strict = false }: Props) {
  return <SearchComboBox value={value} onChange={onChange} options={options} label={label} placeholder={placeholder} required={required} allowCustom={!strict} limit={250} />;
}
