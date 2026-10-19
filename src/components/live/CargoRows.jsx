import { measure } from '../../../shared/livePricing.mjs';
export const blankCargo = () => ({ input: 'DIMENSIONS', length: '', width: '', height: '', unit: 'cm', quantity: 1, weight: '', weight_unit: 'kg', weight_basis: 'LINE', cbm: '' });
export function CargoTotals({ rows }) {
    let totals;
    try {
        totals = measure(rows);
    }
    catch {
        totals = null;
    }
    return <div className="live-totals" aria-live="polite"><span>Total CBM<strong>{totals ? totals.cbm.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'} m³</strong></span><span>Total actual weight<strong>{totals ? totals.kg.toLocaleString(undefined, { maximumFractionDigits: 3 }) : '—'} kg</strong></span><span>Packages<strong>{totals?.packages ?? '—'}</strong></span></div>;
}
export default function CargoRows({ rows, onChange }) {
    const update = (i, key, value) => onChange(rows.map((r, j) => i === j ? { ...r, [key]: value } : r));
    const input = (r, i, key, label, props = {}) => <label>{label}<input type="number" min="0.000001" step="any" required value={r[key]} onChange={e => update(i, key, e.target.value)} {...props}/></label>;
    return <div className="live-cargo"><h3>Cargo details</h3>{rows.map((r, i) => <fieldset key={i}><legend>Cargo {i + 1}</legend><div className="live-row-head"><label>Volume entry<select value={r.input} onChange={e => update(i, 'input', e.target.value)}><option value="DIMENSIONS">Dimensions</option><option value="CBM">Direct CBM · total line volume</option></select></label>{rows.length > 1 && <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remove cargo ${i + 1}`}>Remove</button>}</div>
    <div className="live-fields">{r.input === 'DIMENSIONS' ? <>{input(r, i, 'length', 'Length')}{input(r, i, 'width', 'Width')}{input(r, i, 'height', 'Height')}<label>Measurement unit<select value={r.unit} onChange={e => update(i, 'unit', e.target.value)}>{Object.entries({ mm: 'mm', cm: 'cm', m: 'm', in: 'inches', ft: 'feet' }).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label></> : input(r, i, 'cbm', 'Total line volume (m³)')}
    {input(r, i, 'weight', r.weight_basis === 'LINE' ? 'Total line weight' : 'Weight per package')}<label>Weight unit<select value={r.weight_unit} onChange={e => update(i, 'weight_unit', e.target.value)}><option value="kg">kg</option><option value="tonne">metric tonnes</option><option value="lb">lb</option></select></label><label>Weight applies to<select value={r.weight_basis} onChange={e => update(i, 'weight_basis', e.target.value)}><option value="LINE">Entire cargo line</option><option value="PACKAGE">Each package</option></select></label>{input(r, i, 'quantity', 'Packages', { min: 1, max: 1000000, step: 1 })}</div></fieldset>)}
    <button type="button" disabled={rows.length >= 100} onClick={() => onChange([...rows, blankCargo()])}>＋ Add More Cargo</button><CargoTotals rows={rows}/></div>;
}
