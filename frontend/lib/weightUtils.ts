// lib/weightUtils.ts
// ─────────────────────────────────────────────────────────────
//  Automatic calculation helper for Gross Weight (G.W.) and Chargeable Weight
// ─────────────────────────────────────────────────────────────
import { Shipment } from "@/types";

export function getCalculatedWeights(shipment?: Partial<Shipment> | null) {
  if (!shipment) {
    return { grossWeight: "—", chargeableWeight: "—" };
  }

  const rawWeight = String(shipment.weight || "").trim();
  const rawGw = String(shipment.gross_weight || "").trim();
  const rawCw = String(shipment.chargeable_weight || "").trim();
  const dimStr = String(shipment.dimension || "").trim();

  // 1. Gross Weight (G.W.)
  let gwDisplay = rawGw;
  let gwNum = 0;
  if (!gwDisplay && rawWeight) {
    gwDisplay = rawWeight.toLowerCase().endsWith("kg") || rawWeight.toLowerCase().endsWith("lb")
      ? rawWeight
      : `${rawWeight} KG`;
  }

  if (gwDisplay) {
    const match = gwDisplay.match(/[\d.]+/);
    if (match) gwNum = parseFloat(match[0]) || 0;
  }

  // 2. Chargeable Weight Calculation
  let cwDisplay = rawCw;
  if (!cwDisplay) {
    let volumetricKg = 0;

    // Check for CBM pattern (e.g. "1.5 CBM")
    const cbmMatch = dimStr.match(/([\d.]+)\s*CBM/i);
    if (cbmMatch) {
      const cbmVal = parseFloat(cbmMatch[1]) || 0;
      volumetricKg = cbmVal * 167; // Air / Standard freight factor (1 CBM = 167 KG)
    } else {
      // Check for LxWxH (Qty: N) patterns e.g. "50x40x30 cm (Qty: 10)"
      const regex = /([\d.]+)\s*[xX*]\s*([\d.]+)\s*[xX*]\s*([\d.]+)(?:[^\d]*Qty:\s*(\d+))?/gi;
      let m: RegExpExecArray | null;
      let totalVolCbm = 0;
      while ((m = regex.exec(dimStr)) !== null) {
        const l = parseFloat(m[1]) || 0;
        const w = parseFloat(m[2]) || 0;
        const h = parseFloat(m[3]) || 0;
        const qty = parseInt(m[4] || "1", 10) || 1;
        const itemCbm = ((l * w * h) / 1000000) * qty;
        totalVolCbm += itemCbm;
      }
      volumetricKg = totalVolCbm * 167;
    }

    const chargeableNum = Math.max(gwNum, volumetricKg);
    if (chargeableNum > 0) {
      const unit = (gwDisplay.match(/[a-zA-Z]+/g) || ["KG"])[0];
      const formattedNum = Number.isInteger(chargeableNum) ? chargeableNum : parseFloat(chargeableNum.toFixed(2));
      cwDisplay = `${formattedNum} ${unit.toUpperCase()}`;
    } else if (gwDisplay) {
      cwDisplay = gwDisplay;
    }
  }

  return {
    grossWeight: gwDisplay || "—",
    chargeableWeight: cwDisplay || "—"
  };
}
