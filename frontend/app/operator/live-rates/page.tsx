"use client";
import { FormEvent, useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import SearchComboBox from '@/components/ui/SearchComboBox';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import './rates.css';
type Config = Record<string, any>;
type Rate = {
    id: string;
    version: number;
    status: string;
    operator_name: string;
    config: Config;
};
type Location = {
    id: string;
    name: string;
    country: string;
    kind: string;
    aliases: string[];
};
const defaults = (): Config => ({ origin_id: '', destination_id: '', mode: 'AIR', subtype: 'AIR', size: '20', equipment: 'DRY', truck: '', carrier: '', service: '', currency: 'QAR', valid_from: '', valid_until: '', model: 'KG', minimum_units: '0', minimum_charge: '0', rounding_step: '0', rounding: 'NEAREST', divisor: '6000', weight_break: false, wm_cbm: '1', wm_tonne: '1', capacity_kg: '0', capacity_cbm: '0', distance: '', distance_source: '', tiers: [{ minimum: '0', price: '' }], charges: [], inclusions: [], exclusions: [] });
const models: Record<string, string[]> = { AIR: ['KG'], LCL: ['CBM', 'TONNE', 'WM'], FCL: ['CONTAINER'], TRUCK: ['FIXED', 'VEHICLE', 'KG', 'CBM', 'TONNE', 'KM'] };
const labels: Record<string, string> = { KG: 'per kg', CBM: 'per CBM', TONNE: 'per metric tonne', WM: 'W/M freight unit', CONTAINER: 'per container', FIXED: 'fixed route / shipment', VEHICLE: 'per vehicle', KM: 'per verified kilometre' };
export default function LiveRates() {
    const { user, loading: authLoading } = useAuth();
    const allowed = user && ['operator', 'admin'].includes(user.role), admin = user?.role === 'admin';
    const [locations, setLocations] = useState<Location[]>([]), [countries, setCountries] = useState<{
        name: string;
        code: string;
    }[]>([]), [rows, setRows] = useState<Rate[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1), [search, setSearch] = useState(''), [status, setStatus] = useState('');
    const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [editor, setEditor] = useState(false), [current, setCurrent] = useState<Rate | null>(null), [c, setC] = useState<Config>(defaults), [dirty, setDirty] = useState(false);
    const [preview, setPreview] = useState<any>(null), [compare, setCompare] = useState<any[]>([]), [volume, setVolume] = useState(''), [weight, setWeight] = useState(''), [quantity, setQuantity] = useState('1'), [history, setHistory] = useState<any>(null), [road, setRoad] = useState({ name: '', country: '' });
    const options = useCallback(async () => { const { data } = await api.get('/live-pricing/locations'); setLocations(data.locations); setCountries(data.countries); }, []);
    const refresh = useCallback(async () => { if (!allowed)
        return; setLoading(true); try {
        const { data } = await api.get('/live-pricing/rates', { params: { page, status, search } });
        setRows(data.rows);
        setTotal(data.total);
    }
    catch (e: any) {
        setError(e.response?.data?.message || 'Unable to load rates.');
    }
    finally {
        setLoading(false);
    } }, [allowed, page, status, search]);
    useEffect(() => { if (allowed)
        options().catch(() => setError('Location options could not be loaded. Use Refresh to retry.')); }, [allowed, options]);
    useEffect(() => { const timer = setTimeout(refresh, 250); return () => clearTimeout(timer); }, [refresh]);
    useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty) {
        e.preventDefault();
        e.returnValue = '';
    } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
    const change = (key: string, value: any) => { setC(p => ({ ...p, [key]: value })); setDirty(true); setPreview(null); setCompare([]); };
    const run = async (fn: () => Promise<void>) => { setBusy(true); setError(''); setMessage(''); try {
        await fn();
    }
    catch (e: any) {
        setError(e.response?.data?.message || e.message || 'Action failed. Please retry.');
    }
    finally {
        setBusy(false);
    } };
    const label = (id: string) => { const l = locations.find(x => x.id === id); return l ? `${l.country}, ${l.name}` : id; };
    const open = (r: Rate | null) => { if (dirty && !window.confirm('Discard unsaved changes?'))
        return; setCurrent(r); setC(r ? structuredClone(r.config) : defaults()); setEditor(true); setDirty(false); setPreview(null); setCompare([]); setHistory(null); };
    const save = async (submit = false) => run(async () => { const body = { config: c, version: current?.version }; const { data } = current ? await api.put('/live-pricing/rates/' + current.id, body) : await api.post('/live-pricing/rates', body); setCurrent({ id: data.id, version: data.version, status: 'draft', operator_name: user?.username || '', config: structuredClone(c) }); setDirty(false); if (submit)
        await api.post(`/live-pricing/rates/${data.id}/action`, { version: data.version, action: 'submit' }); setEditor(false); setMessage(submit ? 'Submitted for administrator approval.' : 'Draft saved.'); await refresh(); });
    const action = (r: Rate, a: string) => run(async () => { let reason = ''; if (a === 'reject') {
        reason = window.prompt('Reason for rejection') || '';
        if (!reason)
            return;
    } if (['approve', 'inactive', 'archive'].includes(a) && !window.confirm(`${a === 'approve' ? 'Publish' : a === 'inactive' ? 'Disable' : 'Archive'} this rate?`))
        return; await api.post(`/live-pricing/rates/${r.id}/action`, { version: r.version, action: a, reason }); setMessage('Rate updated.'); await refresh(); });
    const number = (key: string, title: string, positive = false) => <label key={key}>{title}<input required type="number" min={positive ? '0.000001' : '0'} step="any" value={c[key]} onChange={e => change(key, e.target.value)}/></label>;
    const select = (key: string, title: string, values: string[], names: Record<string, string> = {}) => <label>{title}<select required value={c[key]} onChange={e => change(key, e.target.value)}>{values.map(v => <option key={v} value={v}>{names[v] || v}</option>)}</select></label>;
    const mode = (value: string, subtype?: string) => { if (!window.confirm('Switch pricing configuration? Route locations incompatible with this mode and existing tiers will be reset.'))
        return; const type = subtype || (value === 'SEA' ? 'LCL' : value === 'TRUCK' ? 'LTL' : 'AIR'); setC(p => ({ ...p, mode: value, subtype: type, model: models[value === 'SEA' ? type : value][0], size: p.size || '20', equipment: p.equipment || 'DRY', minimum_units: '0', rounding_step: '0', tiers: [{ minimum: '0', price: '' }], charges: [], origin_id: locations.find(l => l.id === p.origin_id)?.kind === value ? p.origin_id : '', destination_id: locations.find(l => l.id === p.destination_id)?.kind === value ? p.destination_id : '' })); setDirty(true); setPreview(null); setCompare([]); };
    const pricingModel = (value: string) => {
        if (value === c.model) return;
        if (c.tiers.some((t: any) => t.price) && !window.confirm('Reset the selling price for the new pricing model?')) return;
        setC(p => {
            const container = value === 'CONTAINER';
            const nextMode = container ? 'SEA' : p.mode;
            const subtype = nextMode === 'SEA' ? (container ? 'FCL' : 'LCL') : p.subtype;
            return {
                ...p, model: value, mode: nextMode, subtype,
                size: p.size || '20', equipment: p.equipment || 'DRY',
                truck: nextMode === 'TRUCK' ? p.truck : '',
                origin_id: locations.find(l => l.id === p.origin_id)?.kind === nextMode ? p.origin_id : '',
                destination_id: locations.find(l => l.id === p.destination_id)?.kind === nextMode ? p.destination_id : '',
                tiers: [{ minimum: '0', price: '' }], minimum_units: '0', rounding_step: '0',
                charges: p.charges.filter((ch: any) => container
                    ? ['SHIPMENT', 'PERCENT', 'CONTAINER'].includes(ch.basis)
                    : ch.basis !== 'CONTAINER'),
            };
        });
        setDirty(true); setPreview(null); setCompare([]);
    };
    const sample = () => ({ ...c, quantity, cargo: c.subtype === 'FCL' && !volume && !weight ? [] : [{ input: 'CBM', cbm: volume, quantity: 1, weight, weight_unit: 'kg', weight_basis: 'LINE' }] });
    const previewRate = () => run(async () => { const { data } = await api.post('/live-pricing/preview', { config: c, shipment: sample() }); setPreview(data.result || { unavailable: true }); if (admin) {
        const comparison = await api.post('/live-pricing/comparison', { config: c, shipment: sample() });
        setCompare(comparison.data.rows);
    } });
    const flat = ['FIXED', 'VEHICLE', 'CONTAINER', 'KM'].includes(c.model);
    const container = c.model === 'CONTAINER';
    const pricingModels = [...(c.mode === 'SEA' ? models.LCL : models[c.mode]), 'CONTAINER'];
    return <AppLayout title="Freight Live Rates" subtitle="Customer selling tariffs · Asia/Qatar" action={allowed ? <button className="btn-primary" onClick={() => open(null)}>＋ Add rate</button> : undefined}><div className="live-admin">
  {authLoading ? <p>Checking access…</p> : !allowed ? <p>Only operators and administrators can manage live freight rates.</p> : <>
  <p>Enter customer selling prices. Drafts and pending rates remain private. {admin ? 'Approve a current revision to publish it.' : 'An administrator must approve each new or edited rate.'} Published estimates use USD; QAR is converted at 3.65 QAR per USD.</p>
  {error && <div role="alert" className="lr-error">{error}</div>}{message && <p role="status">{message}</p>}
  {editor && <section className="lr-panel"><div className="lr-heading"><h2>{current ? 'Edit rate' : 'New rate'}</h2><button type="button" onClick={() => { if (!dirty || window.confirm('Discard unsaved changes?')) {
                setEditor(false);
                setDirty(false);
            } }}>Close editor</button></div><form onSubmit={(e: FormEvent) => { e.preventDefault(); save(false); }}><fieldset disabled={busy}><div className="lr-grid">
  {(['origin_id', 'destination_id'] as const).map((key, i) => <label key={key}>{i ? 'POD / Destination' : 'POL / Origin'}<SearchComboBox required label={i ? 'Destination' : 'Origin'} value={c[key]} onChange={v => change(key, v)} options={locations.filter(l => l.kind === c.mode && l.id !== c[i ? 'origin_id' : 'destination_id']).map(l => ({ value: l.id, label: `${l.country}, ${l.name}`, searchText: l.id + ' ' + l.aliases.join(' '), kind: l.kind }))}/></label>)}
  <label>Transport mode<select value={c.mode} onChange={e => mode(e.target.value)}><option>AIR</option><option>SEA</option><option>TRUCK</option></select></label>
  {c.mode !== 'AIR' && <label>Shipment type<select value={c.subtype} onChange={e => mode(c.mode, e.target.value)}>{(c.mode === 'SEA' ? ['LCL', 'FCL'] : ['LTL', 'FTL']).map(v => <option key={v}>{v}</option>)}</select></label>}
  {c.mode === 'TRUCK' && <label>Truck / load class<input required value={c.truck} maxLength={100} onChange={e => change('truck', e.target.value)}/></label>}
  <label>Carrier / shipping line<input required maxLength={120} value={c.carrier} onChange={e => change('carrier', e.target.value)}/></label><label>Comparable service name<input required maxLength={120} placeholder="e.g. Airport to airport · general cargo" value={c.service} onChange={e => change('service', e.target.value)}/></label>
  <label>Valid from (Qatar)<input required type="date" value={c.valid_from} onChange={e => change('valid_from', e.target.value)}/></label><label>Valid until (Qatar)<input required type="date" min={c.valid_from} value={c.valid_until} onChange={e => change('valid_until', e.target.value)}/></label>
  <label>Pricing model<select value={c.model} onChange={e => pricingModel(e.target.value)}>{pricingModels.map(v => <option key={v} value={v}>{v === 'CONTAINER' ? 'Container' : labels[v]}</option>)}</select></label>{select('currency', 'Tariff currency', ['USD', 'QAR'])}
  </div><h3>{container ? 'Container pricing' : flat ? 'Selling price' : 'Conditional pricing tiers'}</h3><p className="lr-note">{container ? 'Choose the container type and size, then enter one selling price per container. Container pricing uses SEA / FCL shipments.' : flat ? 'One price for the selected billing unit.' : 'Minimum thresholds are inclusive. Each tier ends where the next starts. Below the first threshold, no price is available unless an explicit minimum or weight-break policy applies.'}</p>
  {container && <div className="lr-grid">{select('equipment', 'Container type', ['DRY', 'REEFER'], { DRY: 'Standard / Dry', REEFER: 'Reefer' })}{select('size', 'Container size (FT)', ['20', '40', '40HQ'], { '20': '20 FT', '40': '40 FT', '40HQ': '40 FT High Cube' })}</div>}
  {c.tiers.map((tier: any, i: number) => <div key={i} className="lr-tier">{!flat && <label>Minimum {labels[c.model]}<input type="number" min="0" step="any" required value={tier.minimum} onChange={e => change('tiers', c.tiers.map((t: any, j: number) => i === j ? { ...t, minimum: e.target.value } : t))}/></label>}<label>Price ({c.currency}) {labels[c.model]}<input type="number" min="0.000001" step="any" required value={tier.price} onChange={e => change('tiers', c.tiers.map((t: any, j: number) => i === j ? { ...t, price: e.target.value } : t))}/></label>{!flat && c.tiers.length > 1 && <button type="button" onClick={() => change('tiers', c.tiers.filter((_: any, j: number) => j !== i))}>Remove</button>}</div>)}
  {!flat && <button type="button" onClick={() => change('tiers', [...c.tiers, { minimum: '', price: '' }])}>＋ Add tier</button>}
  <h3>Minimums and calculation rules</h3><div className="lr-grid">{!flat && number('minimum_units', `Minimum billable ${c.model}`)}{number('minimum_charge', `Minimum freight (${c.currency})`)}{!flat && number('rounding_step', `Round billable ${c.model} up to step (0 = exact)`)}{select('rounding', 'USD line-item rounding', ['NEAREST', 'UP'], { NEAREST: 'Nearest cent', UP: 'Round up to cent' })}
  {c.mode === 'AIR' && <>{number('divisor', 'Volumetric divisor (cm³/kg)', true)}<label className="lr-check"><input type="checkbox" checked={c.weight_break} onChange={e => change('weight_break', e.target.checked)}/>Allow higher weight break when final total is cheaper</label></>}
  {c.model === 'WM' && <>{number('wm_cbm', 'CBM per W/M unit', true)}{number('wm_tonne', 'Tonnes per W/M unit', true)}</>}
  {c.model === 'KM' && <>{number('distance', 'Verified route distance (km)', true)}<label>Distance source<input required value={c.distance_source} onChange={e => change('distance_source', e.target.value)}/></label></>}
  {number('capacity_kg', `Maximum kg ${['FCL', 'FTL'].includes(c.subtype) ? 'per container / truck' : 'per shipment'} (0 = unset)`)}{number('capacity_cbm', `Maximum CBM ${['FCL', 'FTL'].includes(c.subtype) ? 'per container / truck' : 'per shipment'} (0 = unset)`)}</div>
  <h3>Additional customer charges</h3><p className="lr-note">Amounts are in {c.currency}. Percentage charges apply to base freight, independently. Enter any applicable tax as an explicit charge; tax notes do not calculate tax.</p>
  {c.charges.map((ch: any, i: number) => { const update = (k: string, v: string) => change('charges', c.charges.map((x: any, j: number) => i === j ? { ...x, [k]: v } : x)); return <div className="lr-charge" key={i}><label>Name<input required maxLength={100} value={ch.name} onChange={e => update('name', e.target.value)}/></label><label>Basis<select value={ch.basis} onChange={e => update('basis', e.target.value)}>{['SHIPMENT', 'PERCENT', ...(c.subtype === 'FCL' ? ['CONTAINER'] : ['KG', 'CBM', 'TONNE']), ...(c.mode === 'TRUCK' ? ['VEHICLE'] : [])].map(v => <option key={v}>{v}</option>)}</select></label><label>Amount<input required type="number" min="0" step="any" value={ch.amount} onChange={e => update('amount', e.target.value)}/></label><label>Tax treatment<input required maxLength={120} value={ch.tax} onChange={e => update('tax', e.target.value)}/></label><button type="button" onClick={() => change('charges', c.charges.filter((_: any, j: number) => j !== i))}>Remove</button></div>; })}
  <button type="button" onClick={() => change('charges', [...c.charges, { name: '', basis: 'SHIPMENT', amount: '', tax: 'No additional tax' }])}>＋ Add charge</button><div className="lr-grid"><label>Included charges / conditions (one per line)<textarea required value={c.inclusions.join('\n')} onChange={e => change('inclusions', e.target.value.split('\n'))}/></label><label>Excluded charges / conditions (one per line)<textarea value={c.exclusions.join('\n')} onChange={e => change('exclusions', e.target.value.split('\n'))}/></label></div><p className="lr-note">Only rates with the same service and inclusion/exclusion lists compete. Specify all mandatory charges before submitting.</p>
  <div className="lr-preview"><h3>Calculation preview {admin ? '& comparison' : ''}</h3><div className="lr-grid"><label>Total cargo CBM<input type="number" min="0.000001" step="any" value={volume} onChange={e => { setVolume(e.target.value); setPreview(null); }}/></label><label>Total actual kg<input type="number" min="0.000001" step="any" value={weight} onChange={e => { setWeight(e.target.value); setPreview(null); }}/></label>{['FCL', 'FTL'].includes(c.subtype) && <label>Container / truck quantity<input type="number" min="1" step="1" value={quantity} onChange={e => { setQuantity(e.target.value); setPreview(null); }}/></label>}</div><button type="button" onClick={previewRate}>Preview calculation</button>
  {preview && <div role="status">{preview.unavailable ? 'No price: check the tier minimum and capacity limits.' : <><strong>USD {preview.total}</strong><p>Base USD {preview.base} · Billable {preview.pricing_units} {preview.basis}{preview.divisor ? ` · Air divisor ${preview.divisor}` : ''}</p>{preview.charges.map((ch: any, i: number) => <p key={i}>{ch.name}: USD {ch.amount}</p>)}</>}</div>}
  {compare.length > 0 && <div className="lr-scroll"><table><caption>Equivalent offers for the preview shipment (pending offers are not public)</caption><thead><tr><th>Operator</th><th>Status</th><th>Total USD</th><th>Difference</th></tr></thead><tbody>{compare.map((r: any, i: number) => <tr key={r.id}><td>{r.operator_name}{i === 0 ? ' · LOWEST' : ''}</td><td>{r.status}</td><td>{r.result.total}</td><td>{r.difference}</td></tr>)}</tbody></table></div>}</div>
  <div className="lr-actions"><button type="submit">Save draft</button><button className="btn-primary" type="button" disabled={!preview || preview.unavailable} onClick={() => save(true)}>Save & submit for approval</button></div><p className="lr-note">Preview the completed tariff before submitting. Saving an edited published rate immediately removes that version from new quotations until reapproved.</p></fieldset></form></section>}
  <section className="lr-panel"><h2>{admin ? 'All operator rates' : 'My rates'}</h2><div className="lr-grid"><label>Search route, carrier or operator<input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></label><label>Status<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{['draft', 'pending', 'approved', 'expired', 'inactive', 'rejected', 'archived'].map(v => <option key={v}>{v}</option>)}</select></label></div><button disabled={busy} onClick={() => run(async () => { await options(); await refresh(); })}>Refresh</button>
  {loading ? <p role="status">Loading rates…</p> : <div className="lr-list">{rows.map(r => <article key={r.id}><div><h3>{label(r.config.origin_id)} → {label(r.config.destination_id)}</h3><p>{r.config.mode} · {r.config.subtype} · {r.config.size} {r.config.equipment} {r.config.truck} · {r.config.service}</p><p>{r.config.carrier} · {r.config.valid_from} — {r.config.valid_until} · {r.config.currency} {labels[r.config.model]}</p><strong>{r.status.toUpperCase()} · revision {r.version}{admin ? ' · ' + r.operator_name : ''}</strong></div><div className="lr-actions"><button disabled={busy} onClick={() => open(r)}>Review / Edit</button><button disabled={busy} onClick={() => action(r, 'duplicate')}>Duplicate</button><button disabled={busy} onClick={() => run(async () => { const { data } = await api.get(`/live-pricing/rates/${r.id}/history`); setHistory(data); })}>History</button>{['draft', 'rejected'].includes(r.status) && <button disabled={busy} onClick={() => action(r, 'submit')}>Submit</button>}{admin && r.status === 'pending' && <><button disabled={busy} onClick={() => action(r, 'approve')}>Approve & publish</button><button disabled={busy} onClick={() => action(r, 'reject')}>Reject</button></>}{['approved', 'pending'].includes(r.status) && <button disabled={busy} onClick={() => action(r, 'inactive')}>Disable</button>}{r.status !== 'archived' && <button disabled={busy} onClick={() => action(r, 'archive')}>Archive</button>}</div></article>)}{!rows.length && <p>No matching rates.</p>}</div>}
  <div className="lr-actions"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} · {total} rates</span><button disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}>Next</button></div></section>
  {history && <section className="lr-panel"><div className="lr-heading"><h2>Revision & quotation history</h2><button onClick={() => setHistory(null)}>Close history</button></div>{history.events.map((event: any, i: number) => <p key={i}>{event.created_at} UTC · revision {event.version} · {event.action} {event.detail.reason}</p>)}{history.versions.map((v: any) => <details key={v.version}><summary>Revision {v.version} · {v.created_at} UTC</summary><pre>{JSON.stringify(v.config, null, 2)}</pre></details>)}<h3>Latest 100 quotation snapshots</h3>{history.quotes.map((q: any) => <details key={q.id}><summary>{q.created_at} UTC · USD {q.result.estimate?.total} · {q.id}</summary><pre>{JSON.stringify(q.result, null, 2)}</pre></details>)}</section>}
  <details className="lr-panel"><summary>Add a road destination</summary><p>Use a precise pickup/delivery location. Check the existing directory first to avoid duplicate locations.</p><div className="lr-grid"><label>Country<SearchComboBox label="Country" value={road.country} onChange={v => setRoad(p => ({ ...p, country: v }))} options={countries.map(x => ({ value: x.name, label: x.name }))}/></label><label>City / terminal / delivery location<input maxLength={180} value={road.name} onChange={e => setRoad(p => ({ ...p, name: e.target.value }))}/></label></div><button disabled={busy} onClick={() => run(async () => { await api.post('/live-pricing/road-locations', road); await options(); setRoad({ name: '', country: '' }); setMessage('Road destination added.'); })}>Add location</button></details>
  </>}</div></AppLayout>;
}
