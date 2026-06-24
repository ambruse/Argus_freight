// components/ui/ContainerInput.tsx
// ─────────────────────────────────────────────────────────────
//  Structured container entry: 40FT count, 20FT count,
//  Custom size (free-text) + count, and a Container Type dropdown.
//  Renders only when mode is Sea or Road.
//  Builds + exposes a human-readable container string via onChange.
// ─────────────────────────────────────────────────────────────
"use client";
import { useEffect, useState } from "react";

const CONTAINER_TYPES = [
  "Standard Dry Van (DV)",
  "High Cube (HC)",
  "Pallet Wide (PW)",
  "Open Top (OT)",
  "Flat Rack (FR)",
  "Platform",
  "Side Door / Open Side",
  "Reefer (Refrigerated)",
  "Insulated / Thermal",
  "ISO Tank (Tanktainer)",
  "Bulk / Silo",
];

interface ContainerFields {
  ft40: string;
  ft20: string;
  customSize: string; // free-text label, e.g. "45FT"
  customCount: string;
  type: string;
}

interface Props {
  /** Called whenever the computed container string changes */
  onChange: (containerString: string) => void;
  /** Pass an existing string to pre-fill on mount (optional) */
  initialValue?: string;
}

const buildString = (f: ContainerFields): string => {
  const parts: string[] = [];
  const n40 = parseInt(f.ft40) || 0;
  const n20 = parseInt(f.ft20) || 0;
  const nCustom = parseInt(f.customCount) || 0;
  const typeSuffix = f.type ? ` ${f.type}` : "";
  if (n40 > 0) parts.push(`40FT x ${n40}${typeSuffix}`);
  if (n20 > 0) parts.push(`20FT x ${n20}${typeSuffix}`);
  if (nCustom > 0 && f.customSize.trim()) {
    parts.push(`${f.customSize.trim()} x ${nCustom}${typeSuffix}`);
  }
  return parts.join(" + ");
};

export default function ContainerInput({ onChange, initialValue }: Props) {
  const [fields, setFields] = useState<ContainerFields>({
    ft40: "",
    ft20: "",
    customSize: "",
    customCount: "",
    type: "",
  });

  // Notify parent whenever any field changes
  useEffect(() => {
    onChange(buildString(fields));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const set = (key: keyof ContainerFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const preview = buildString(fields);

  return (
    <div className="glass rounded-xl p-4 space-y-4 border border-white/[0.06]">
      {/* ── Count row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 40 FT */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">
            40 FT — Count
          </label>
          <input
            type="number"
            min="0"
            value={fields.ft40}
            onChange={(e) => set("ft40", e.target.value)}
            placeholder="0"
            className="input w-full font-mono"
          />
        </div>

        {/* 20 FT */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">
            20 FT — Count
          </label>
          <input
            type="number"
            min="0"
            value={fields.ft20}
            onChange={(e) => set("ft20", e.target.value)}
            placeholder="0"
            className="input w-full font-mono"
          />
        </div>

        {/* Custom Size */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">
            Custom Size
          </label>
          <input
            type="text"
            value={fields.customSize}
            onChange={(e) => set("customSize", e.target.value)}
            placeholder="e.g. 45FT"
            className="input w-full font-mono uppercase"
          />
        </div>

        {/* Custom Count */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">
            Custom — Count
          </label>
          <input
            type="number"
            min="0"
            value={fields.customCount}
            onChange={(e) => set("customCount", e.target.value)}
            placeholder="0"
            className="input w-full font-mono"
          />
        </div>
      </div>

      {/* ── Type dropdown ── */}
      <div className="space-y-1">
        <label className="text-[10px] text-muted uppercase tracking-wider font-semibold">
          Container Type
        </label>
        <select
          value={fields.type}
          onChange={(e) => set("type", e.target.value)}
          className="select w-full"
        >
          <option value="">— Select Container Type —</option>
          {CONTAINER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* ── Live preview ── */}
      {preview ? (
        <p className="text-[11px] font-mono text-gold bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.06] leading-relaxed">
          Container: {preview}
        </p>
      ) : (
        <p className="text-[11px] text-muted/50 italic px-1">
          Fill in counts above — preview will appear here.
        </p>
      )}
    </div>
  );
}
