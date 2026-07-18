"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";

// Tabs for Calculator
type Tab = "chargeable" | "duty";

export default function CalculatorPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("chargeable");

  // Chargeable Weight inputs
  const [weight, setWeight] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [length, setLength] = useState<string>("");
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");

  // Duty inputs
  const [mode, setMode] = useState<"AIR" | "SEA" | "ROAD">("AIR");
  const [invoiceValue, setInvoiceValue] = useState<string>("");
  const [currency, setCurrency] = useState<"QAR" | "USD">("QAR");
  const [dutyWeight, setDutyWeight] = useState<string>("");

  // Calculations for Chargeable Weight
  const weightVal = parseFloat(weight) || 0;
  const qtyVal = parseFloat(quantity) || 0;
  const lenVal = parseFloat(length) || 0;
  const widthVal = parseFloat(width) || 0;
  const heightVal = parseFloat(height) || 0;

  // CBM = length x width x height / 1000000 * quantity
  const cbm = ((lenVal * widthVal * heightVal) / 1000000) * qtyVal;
  const volumetricWeight = cbm * 167;
  const chargeableWeight = Math.max(weightVal, volumetricWeight);

  // Calculations for Duty
  const invVal = parseFloat(invoiceValue) || 0;
  const dWeightVal = parseFloat(dutyWeight) || 0;

  const invoiceQar = currency === "USD" ? invVal * 3.65 : invVal;
  const insurance = invoiceQar * 0.01;
  const duty = (invoiceQar + insurance) * 0.05;
  const customsService = 250;
  const mofaFee = 150;

  // Tariff calculation sliding scale
  let tariff = 0;
  if (invoiceQar > 0) {
    if (invoiceQar <= 15000) {
      tariff = 500;
    } else if (invoiceQar <= 100000) {
      tariff = 1000;
    } else if (invoiceQar <= 250000) {
      tariff = 2500;
    } else if (invoiceQar <= 1000000) {
      tariff = 5000;
    } else {
      tariff = invoiceQar * 0.006;
    }
  }

  const dutyTotal = duty + customsService + mofaFee + tariff;

  // QAS calculation (AIR mode only)
  let qas_a = dWeightVal * 50;
  if (qas_a < 250) qas_a = 250;
  let qas_b = dWeightVal * 0.1;
  if (qas_b < 20) qas_b = 20;
  let qas_c = dWeightVal * 0.3;
  if (qas_c < 20) qas_c = 20;

  const qasTotal = qas_a + 115 + qas_b + qas_c;
  const grandTotal = dutyTotal + qasTotal;

  // Formatting helper
  const formatNum = (num: number) => {
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold"></div>
        </div>
      </AppLayout>
    );
  }

  const isAuthorized = ["admin", "operator", "sales"].includes(user.role);
  if (!isAuthorized) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-muted text-sm">
            You do not have permission to view the Calculator.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary font-outfit">
              Freight & Duty Calculator
            </h1>
            <p className="text-xs text-muted mt-1">
              Calculate chargeable weights and draft custom duty charges.
            </p>
          </div>
          <div className="text-xs px-3 py-1.5 bg-white/5 rounded-full border border-white/10 font-mono text-[#F5B037]">
            Authorized Role: <span className="capitalize font-semibold">{user.role}</span>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-white/10 mb-6 gap-2">
          <button
            onClick={() => setActiveTab("chargeable")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "chargeable"
                ? "border-[#F5B037] text-[#F5B037]"
                : "border-transparent text-muted hover:text-primary"
            }`}
          >
            1. Chargeable Weight
          </button>
          <button
            onClick={() => setActiveTab("duty")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "duty"
                ? "border-[#F5B037] text-[#F5B037]"
                : "border-transparent text-muted hover:text-primary"
            }`}
          >
            2. Duty & Customs Calculator
          </button>
        </div>

        {/* Calculator Window Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Inputs Section */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "chargeable" ? (
              <div className="glass rounded-2xl p-6 space-y-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5B037] border-b border-white/5 pb-2">
                    Chargeable Weight Inputs
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Enter the shipment's weight, quantity, and dimensions in centimeters.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Actual Weight (Kg)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 150"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="input w-full font-mono font-normal"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Quantity</label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="input w-full font-mono font-normal"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Length (cm)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 120"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className="input w-full font-mono font-normal"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Width (cm)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 80"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      className="input w-full font-mono font-normal"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] font-semibold text-muted uppercase">Height (cm)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 60"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="input w-full font-mono font-normal"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-6 space-y-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5B037] border-b border-white/5 pb-2">
                    Duty & Customs Inputs
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Enter the shipment mode, invoice details, and weight.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Mode</label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as "AIR" | "SEA" | "ROAD")}
                      className="select w-full"
                    >
                      <option value="AIR">AIR</option>
                      <option value="SEA">SEA</option>
                      <option value="ROAD">ROAD</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as "QAR" | "USD")}
                      className="select w-full"
                    >
                      <option value="QAR">QAR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Invoice Value</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 5000"
                      value={invoiceValue}
                      onChange={(e) => setInvoiceValue(e.target.value)}
                      className="input w-full font-mono font-normal"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted uppercase">Weight (Kg)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 100"
                      value={dutyWeight}
                      onChange={(e) => setDutyWeight(e.target.value)}
                      className="input w-full font-mono font-normal"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview Section */}
          <div className="lg:col-span-1 space-y-6">
            {activeTab === "chargeable" ? (
              <div className="glass rounded-2xl p-6 space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl"></div>
                
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#F5B037] border-b border-white/5 pb-2">
                  Live Preview
                </h2>

                <div className="space-y-4 text-xs font-mono text-muted">
                  
                  <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                    <span>Actual Weight:</span>
                    <span className="text-primary font-semibold">
                      {weightVal ? `${formatNum(weightVal)} Kg` : "0.00 Kg"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                    <span>Quantity:</span>
                    <span className="text-primary font-semibold">
                      {qtyVal || 1}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                    <span>Dimensions (L x W x H):</span>
                    <span className="text-primary font-semibold text-right">
                      {lenVal && widthVal && heightVal ? `${lenVal} x ${widthVal} x ${heightVal} cm` : "0 x 0 x 0 cm"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                    <span>CBM Volume:</span>
                    <span className="text-primary font-semibold">
                      {cbm ? `${cbm.toFixed(4)} cm³` : "0.0000 cm³"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                    <span>Volumetric Weight:</span>
                    <span className="text-primary font-semibold">
                      {volumetricWeight ? `${formatNum(volumetricWeight)} Kg` : "0.00 Kg"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 bg-white/5 px-3 rounded-lg border border-white/5 mt-2">
                    <span className="text-gold font-bold text-xs uppercase font-outfit">Chargeable Weight:</span>
                    <span className="text-gold font-bold text-sm font-mono">
                      {chargeableWeight ? `${formatNum(chargeableWeight)} Kg` : "0.00 Kg"}
                    </span>
                  </div>

                  <div className="text-[10px] text-muted text-center italic mt-4 pt-2 border-t border-white/[0.03]">
                    CBM = L × W × H × Qty / 1000000
                    <br />
                    Volumetric Weight = CBM × 167 Kg
                    <br />
                    Chargeable Weight = Max(Actual Weight, Volumetric)
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-6 space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl"></div>
                
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#F5B037] border-b border-white/5 pb-2">
                  Live Preview
                </h2>

                <div className="space-y-3 text-xs font-mono text-muted">
                  
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                    <span>Mode:</span>
                    <span className="text-primary font-semibold uppercase">{mode}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                    <span>Weight:</span>
                    <span className="text-primary font-semibold">{dWeightVal ? `${formatNum(dWeightVal)} Kg` : "0.00 Kg"}</span>
                  </div>

                  <div className="flex justify-between items-start py-1 border-b border-white/[0.03]">
                    <span>INVOICE VALUE:</span>
                    <span className="text-primary font-semibold text-right">
                      QAR {formatNum(invoiceQar)}
                      {currency === "USD" && (
                        <span className="block text-[10px] text-muted font-normal mt-0.5">
                          (USD {formatNum(invVal)} × 3.65)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                    <span>INSURANCE:</span>
                    <span className="text-primary font-semibold">
                      QAR {formatNum(insurance)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                    <span>DUTY:</span>
                    <span className="text-primary font-semibold">
                      QAR {formatNum(duty)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                    <span>CUTSOMS SERVICE FOR COMPANY:</span>
                    <span className="text-primary font-semibold">
                      QAR {formatNum(customsService)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                    <span>MOFA FEE FOR CO NON ATTESTATION:</span>
                    <span className="text-primary font-semibold">
                      QAR {formatNum(mofaFee)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                    <span>TARIFF:</span>
                    <span className="text-primary font-semibold">
                      QAR {formatNum(tariff)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 bg-white/5 px-3 rounded-lg border border-white/5 mt-2">
                    <span className="text-gold font-bold text-xs uppercase font-outfit">Total Duty Charges:</span>
                    <span className="text-gold font-bold text-sm font-mono">
                      QAR {formatNum(dutyTotal)}
                    </span>
                  </div>

                  {mode === "AIR" && (
                    <>
                      <div className="mt-4 pt-3 border-t border-white/10 space-y-1">
                        <p className="text-[10px] font-bold text-[#F5B037] uppercase tracking-wider mb-2">QAS Details</p>
                        
                        <div className="flex justify-between items-center py-0.5 border-b border-white/[0.02]">
                          <span>a (Weight × 50, min 250):</span>
                          <span>QAR {formatNum(qas_a)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-0.5 border-b border-white/[0.02]">
                          <span>b (Weight × 0.1, min 20):</span>
                          <span>QAR {formatNum(qas_b)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-0.5 border-b border-white/[0.02]">
                          <span>c (Weight × 0.3, min 20):</span>
                          <span>QAR {formatNum(qas_c)}</span>
                        </div>

                        <div className="flex justify-between items-center py-1 border-b border-white/[0.02] mt-2">
                          <span>QAS (a + 115 + b + c):</span>
                          <span className="text-primary font-semibold">QAR {formatNum(qasTotal)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-2 bg-gold/10 px-3 rounded-lg border border-gold/20 mt-2">
                        <span className="text-gold font-bold text-xs uppercase font-outfit">Grand Total:</span>
                        <span className="text-gold font-bold text-sm font-mono">
                          QAR {formatNum(grandTotal)}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="text-[10px] text-muted text-center italic mt-4 pt-2 border-t border-white/[0.03]">
                    Insurance = Value × 1%
                    <br />
                    Duty = (Value + Insurance) × 5%
                    <br />
                    Total = Duty + Customs (250) + MOFA (150) + Tariff
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
