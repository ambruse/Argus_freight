"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Search, RefreshCw, Plane, Ship, Truck, ChevronDown, Check, X, Copy, History, Archive, Ban, Trash2, Calculator, AlertCircle } from 'lucide-react';
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
const defaults = (): Config => ({ origin_id: '', destination_id: '', mode: 'AIR', subtype: 'AIR', size: '20', equipment: 'DRY', truck: '', carrier: '', service: '', currency: 'QAR', valid_from: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), valid_until: '', model: 'KG', minimum_units: '0', minimum_charge: '0', rounding_step: '0', rounding: 'NEAREST', divisor: '6000', weight_break: false, wm_cbm: '1', wm_tonne: '1', capacity_kg: '0', capacity_cbm: '0', distance: '', distance_source: '', tiers: [{ minimum: '0', price: '' }], charges: [], inclusions: [], exclusions: [] });
const models: Record<string, string[]> = { AIR: ['KG'], LCL: ['CBM', 'TONNE', 'WM'], FCL: ['CONTAINER'], TRUCK: ['FIXED', 'VEHICLE', 'KG', 'CBM', 'TONNE', 'KM'] };
const labels: Record<string, string> = { KG: 'per kg', CBM: 'per CBM', TONNE: 'per metric tonne', WM: 'W/M freight unit', CONTAINER: 'per container', FIXED: 'fixed route / shipment', VEHICLE: 'per vehicle', KM: 'per verified kilometre' };
const statusLabels: Record<string, string> = { approved: 'Published', pending: 'Pending approval', draft: 'Draft', expired: 'Expired', inactive: 'Disabled', rejected: 'Rejected', archived: 'Archived' };
const dateLabel = (value: string) => value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z')) : 'Not set';
const priceLabel = (config: Config) => {
    const prices = config.tiers.map((t: any) => Number(t.price)).filter(Number.isFinite);
    return `${prices.length > 1 ? 'From ' : ''}${config.currency} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(Math.min(...prices))}`;
};
export default function LiveRates() {
    const { user, loading: authLoading } = useAuth();
    const allowed = user && ['operator', 'admin', 'rater'].includes(user.role), canPublish = !!user && ['admin', 'rater'].includes(user.role);
    const [locations, setLocations] = useState<Location[]>([]), [countries, setCountries] = useState<{
        name: string;
        code: string;
    }[]>([]), [rows, setRows] = useState<Rate[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1), [search, setSearch] = useState(''), [status, setStatus] = useState('');
    const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [editor, setEditor] = useState(false), [current, setCurrent] = useState<Rate | null>(null), [c, setC] = useState<Config>(defaults), [dirty, setDirty] = useState(false);
    const [preview, setPreview] = useState<any>(null), [compare, setCompare] = useState<any[]>([]), [volume, setVolume] = useState(''), [weight, setWeight] = useState(''), [quantity, setQuantity] = useState('1'), [history, setHistory] = useState<any>(null), [road, setRoad] = useState({ name: '', country: '' });
    const form = useRef<HTMLFormElement>(null), editorHeading = useRef<HTMLHeadingElement>(null), historyHeading = useRef<HTMLHeadingElement>(null);
    const requestVersion = useRef(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [listError, setListError] = useState('');
    const options = useCallback(async () => { const { data } = await api.get('/live-pricing/locations'); setLocations(data.locations); setCountries(data.countries); }, []);
    const refresh = useCallback(async () => { if (!allowed)
        return; const request = ++requestVersion.current; setLoading(true); setListError(''); try {
        const { data } = await api.get('/live-pricing/rates', { params: { page, status, search } });
        if (request !== requestVersion.current) return;
        setRows(data.rows);
        setTotal(data.total);
    }
    catch (e: any) {
        if (request === requestVersion.current) setListError(e.response?.data?.message || 'Unable to load rates. Select Refresh to retry.');
    }
    finally {
        if (request === requestVersion.current) setLoading(false);
    } }, [allowed, page, status, search]);
    useEffect(() => { if (allowed)
        options().catch(() => setError('Location options could not be loaded. Use Refresh to retry.')); }, [allowed, options]);
    useEffect(() => { const timer = setTimeout(refresh, 250); return () => { clearTimeout(timer); requestVersion.current++; }; }, [refresh]);
    useEffect(() => { if (editor) editorHeading.current?.focus(); }, [editor]);
    useEffect(() => { if (history) historyHeading.current?.focus(); }, [history]);
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
        return; setCurrent(r); setC(r ? structuredClone(r.config) : defaults()); setEditor(true); setDirty(false); setPreview(null); setCompare([]); setHistory(null); setError(''); setMessage(''); setVolume(''); setWeight(''); setQuantity('1'); };
    const closeEditor = () => { if (!dirty || window.confirm('Discard unsaved changes?')) { setEditor(false); setDirty(false); setError(''); } };
    const save = async (submit = false) => {
        if (!form.current?.reportValidity() || (submit && (!preview || preview.unavailable))) return;
        if (submit && canPublish && !window.confirm('Save and publish this rate for customer estimates?')) return;
        await run(async () => {
            const body = { config: c, version: current?.version };
            const { data } = current ? await api.put('/live-pricing/rates/' + current.id, body) : await api.post('/live-pricing/rates', body);
            setCurrent({ id: data.id, version: data.version, status: 'draft', operator_name: current?.operator_name || user?.username || '', config: structuredClone(c) });
            setDirty(false);
            setMessage('Draft saved.');
            if (submit) {
                await api.post(`/live-pricing/rates/${data.id}/action`, { version: data.version, action: 'submit' });
                setCurrent(r => r && { ...r, status: 'pending' });
                setMessage('Saved and submitted for approval.');
                if (canPublish) {
                    await api.post(`/live-pricing/rates/${data.id}/action`, { version: data.version, action: 'approve' });
                    setMessage('Rate published. Customers can now receive estimates for its validity period.');
                }
            }
            setEditor(false); await refresh();
        });
    };
    const action = (r: Rate, a: string) => run(async () => { let reason = ''; if (a === 'reject') {
        reason = window.prompt('Reason for rejection') || '';
        if (!reason)
            return;
    } if (['approve', 'inactive', 'archive'].includes(a) && !window.confirm(`${a === 'approve' ? 'Publish' : a === 'inactive' ? 'Disable' : 'Archive'} this rate?`))
        return; await api.post(`/live-pricing/rates/${r.id}/action`, { version: r.version, action: a, reason }); setMessage(a === 'duplicate' ? 'Rate duplicated as a draft. Find it in your drafts to edit.' : 'Rate updated.'); setExpandedId(null); await refresh(); });
    const number = (key: string, title: string, positive = false) => <label key={key}>{title}<input required type="number" min={positive ? '0.000001' : '0'} step="any" value={c[key]} onChange={e => change(key, e.target.value)}/></label>;
    const select = (key: string, title: string, values: string[], names: Record<string, string> = {}) => <label>{title}<select required value={c[key]} onChange={e => change(key, e.target.value)}>{values.map(v => <option key={v} value={v}>{names[v] || v}</option>)}</select></label>;
    const mode = (value: string, subtype?: string) => { if (value === c.mode && (!subtype || subtype === c.subtype)) return; if ((c.tiers.some((t: any) => t.price) || c.origin_id || c.destination_id || c.charges.length) && !window.confirm('Switch pricing configuration? Route locations incompatible with this mode and existing tiers will be reset.'))
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
    const previewRate = () => { if (!form.current?.reportValidity()) return; return run(async () => { const { data } = await api.post('/live-pricing/preview', { config: c, shipment: sample() }); setPreview(data.result || { unavailable: true }); if (canPublish) {
        const comparison = await api.post('/live-pricing/comparison', { config: c, shipment: sample() });
        setCompare(comparison.data.rows);
    } }); };
    const flat = ['FIXED', 'VEHICLE', 'CONTAINER', 'KM'].includes(c.model);
    const container = c.model === 'CONTAINER';
    const pricingModels = [...(c.mode === 'SEA' ? models.LCL : models[c.mode]), 'CONTAINER'];
    const locationName = (id: string) => locations.find(l => l.id === id)?.name || id;
    const resetSample = (update: () => void) => { update(); setPreview(null); setCompare([]); };
    const showHistory = (r: Rate) => run(async () => {
        const { data } = await api.get(`/live-pricing/rates/${r.id}/history`);
        setHistory({ ...data, rate: r }); setExpandedId(null);
    });
    const addRoad = () => run(async () => {
        await api.post('/live-pricing/road-locations', road);
        await options(); setRoad({ name: '', country: '' });
        setMessage('Road destination added. It is now available when entering road rates.');
    });
    const statusBadge = (value: string) => <span className={`lr-status lr-status-${value}`}>{statusLabels[value] || value}</span>;
    const ModeIcon = c.mode === 'SEA' ? Ship : c.mode === 'TRUCK' ? Truck : Plane;
    return <AppLayout title="Freight Live Rates" subtitle="Manage customer selling rates and publishing." action={allowed && !editor ? <button className="lr-header-add" disabled={busy} onClick={() => open(null)}><Plus size={16} aria-hidden="true" /> Add rate</button> : undefined}>
      <div className="live-admin">
        {authLoading ? <p role="status">Checking access…</p> : !allowed ? <p>Only operators, raters and administrators can manage live freight rates.</p> : <>
          {error && <div role="alert" className="lr-feedback lr-error"><AlertCircle size={18} aria-hidden="true" /><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
          {message && <div role="status" className="lr-feedback lr-success"><Check size={18} aria-hidden="true" /><span>{message}</span><button aria-label="Dismiss message" onClick={() => setMessage('')}><X size={16} /></button></div>}

          {editor ? <>
            <div className="lr-editor-heading">
              <button className="lr-text-button" disabled={busy} onClick={closeEditor}><ArrowLeft size={16} aria-hidden="true" /> Back to rates</button>
              <div className="lr-heading"><h2 ref={editorHeading} tabIndex={-1}>{current ? 'Edit freight rate' : 'New freight rate'}</h2><span className="lr-muted">{dirty ? 'Unsaved changes' : current ? `Revision ${current.version}` : 'Start with your route and selling price'}</span></div>
            </div>
            <form ref={form} onSubmit={(e: FormEvent) => { e.preventDefault(); save(false); }} onInvalidCapture={e => {
              const target = e.target as HTMLElement;
              let parent = target.parentElement;
              while (parent && parent !== form.current) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
            }}>
              <fieldset disabled={busy} className="lr-workspace">
                <div className="lr-editor-body">
                  <section className="lr-form-section" aria-labelledby="route-heading">
                    <h3 id="route-heading">Route & service</h3><p className="lr-muted">Choose the transport mode before selecting your locations.</p>
                    <div className="lr-mode-switch" role="group" aria-label="Transport mode">
                      {([{ value: 'AIR', title: 'Air freight', Icon: Plane }, { value: 'SEA', title: 'Sea freight', Icon: Ship }, { value: 'TRUCK', title: 'Road freight', Icon: Truck }]).map(({ value, title, Icon }) => <button key={value} type="button" aria-pressed={c.mode === value} onClick={() => mode(value)}><Icon size={18} aria-hidden="true" />{title}</button>)}
                    </div>
                    <div className="lr-grid">
                      {c.mode !== 'AIR' && <label>Shipment type<select value={c.subtype} onChange={e => mode(c.mode, e.target.value)}>{(c.mode === 'SEA' ? ['LCL', 'FCL'] : ['LTL', 'FTL']).map(v => <option key={v}>{v}</option>)}</select></label>}
                      {c.mode === 'TRUCK' && <label>Truck / load class<input required value={c.truck} maxLength={100} onChange={e => change('truck', e.target.value)} placeholder="e.g. 3-ton box truck" /></label>}
                      {(['origin_id', 'destination_id'] as const).map((key, i) => <label key={key}>{i ? 'Destination (POD)' : 'Origin (POL)'}<SearchComboBox required label={i ? 'Destination' : 'Origin'} value={c[key]} onChange={v => change(key, v)} options={locations.filter(l => l.kind === c.mode && l.id !== c[i ? 'origin_id' : 'destination_id']).map(l => ({ value: l.id, label: `${l.country}, ${l.name}`, searchText: l.id + ' ' + l.aliases.join(' '), kind: l.kind }))} /></label>)}
                      <label>Carrier / shipping line<input required maxLength={120} value={c.carrier} onChange={e => change('carrier', e.target.value)} placeholder="Enter carrier name" /></label>
                      <label>Comparable service name<input required maxLength={120} value={c.service} onChange={e => change('service', e.target.value)} placeholder="e.g. Airport to airport · general cargo" /></label>
                      <label>Valid from<input required type="date" value={c.valid_from} onChange={e => change('valid_from', e.target.value)} /></label>
                      <label>Valid until<input required type="date" min={c.valid_from} value={c.valid_until} onChange={e => change('valid_until', e.target.value)} /></label>
                    </div>
                    <p className="lr-note">Validity dates use Qatar time. Only published rates within their validity period are offered to customers.</p>
                    {c.mode === 'TRUCK' && <details className="lr-advanced"><summary>Add a missing road destination<ChevronDown size={16} aria-hidden="true" /></summary><p className="lr-note">Check the directory first. Add a precise pickup or delivery location without leaving this rate.</p><div className="lr-grid"><label>Country<SearchComboBox label="Country" value={road.country} onChange={v => setRoad(p => ({ ...p, country: v }))} options={countries.map(x => ({ value: x.name, label: x.name }))} /></label><label>City / terminal / delivery location<input maxLength={180} value={road.name} onChange={e => setRoad(p => ({ ...p, name: e.target.value }))} /></label></div><button type="button" disabled={busy || !road.country || !road.name.trim()} onClick={addRoad}>Add location</button></details>}
                  </section>

                  <section className="lr-form-section" aria-labelledby="pricing-heading">
                    <h3 id="pricing-heading">Selling price</h3><p className="lr-muted">Enter the price your customer pays, before additional charges.</p>
                    <div className="lr-grid">
                      <label>Pricing model<select value={c.model} onChange={e => pricingModel(e.target.value)}>{pricingModels.map(v => <option key={v} value={v}>{v === 'CONTAINER' ? 'Per container' : labels[v]}</option>)}</select></label>
                      {select('currency', 'Rate currency', ['USD', 'QAR'])}
                      {container && <>{select('equipment', 'Container type', ['DRY', 'REEFER'], { DRY: 'Standard / Dry', REEFER: 'Reefer' })}{select('size', 'Container size', ['20', '40', '40HQ'], { '20': '20 FT', '40': '40 FT', '40HQ': '40 FT High Cube' })}</>}
                    </div>
                    {c.tiers.map((tier: any, i: number) => <div key={i} className={`lr-tier ${flat ? 'lr-tier-flat' : ''}`}>
                      {!flat && <label>Minimum {c.model === 'KG' ? 'weight (kg)' : c.model === 'CBM' ? 'volume (CBM)' : 'units'}<input type="number" min="0" step="any" required value={tier.minimum} onChange={e => change('tiers', c.tiers.map((t: any, j: number) => i === j ? { ...t, minimum: e.target.value } : t))} /></label>}
                      <label>Price ({c.currency}) {labels[c.model]}<input type="number" min="0.000001" step="any" required placeholder="0.00" value={tier.price} onChange={e => change('tiers', c.tiers.map((t: any, j: number) => i === j ? { ...t, price: e.target.value } : t))} /></label>
                      {!flat && c.tiers.length > 1 && <button className="lr-icon-button" aria-label={`Remove tier ${i + 1}`} type="button" onClick={() => change('tiers', c.tiers.filter((_: any, j: number) => j !== i))}><Trash2 size={16} /></button>}
                    </div>)}
                    {!flat && <><button className="lr-text-button" type="button" onClick={() => change('tiers', [...c.tiers, { minimum: '', price: '' }])}><Plus size={16} aria-hidden="true" /> Add price tier</button><p className="lr-note">Each minimum is inclusive. Its price applies until the next tier; below the first tier, a minimum or weight-break rule is needed.</p></>}
                    {c.model === 'KM' && <div className="lr-grid">{number('distance', 'Verified route distance (km)', true)}<label>Distance source<input required value={c.distance_source} onChange={e => change('distance_source', e.target.value)} /></label></div>}
                    <details className="lr-advanced">
                      <summary>Minimums & calculation rules<ChevronDown size={16} aria-hidden="true" /></summary>
                      <div className="lr-grid">
                        {!flat && number('minimum_units', `Minimum billable ${c.model}`)}{number('minimum_charge', `Minimum freight (${c.currency})`)}
                        {!flat && number('rounding_step', 'Round billable units up to step (0 = exact)')}{select('rounding', 'USD rounding', ['NEAREST', 'UP'], { NEAREST: 'Nearest cent', UP: 'Round up to cent' })}
                        {c.mode === 'AIR' && <>{number('divisor', 'Volumetric divisor (cm³/kg)', true)}<label className="lr-check"><input type="checkbox" checked={c.weight_break} onChange={e => change('weight_break', e.target.checked)} /> Use a higher weight break when its final total is cheaper</label></>}
                        {c.model === 'WM' && <>{number('wm_cbm', 'CBM per W/M unit', true)}{number('wm_tonne', 'Tonnes per W/M unit', true)}</>}
                        {number('capacity_kg', `Maximum kg ${['FCL', 'FTL'].includes(c.subtype) ? 'per container / truck' : 'per shipment'}`)}{number('capacity_cbm', `Maximum CBM ${['FCL', 'FTL'].includes(c.subtype) ? 'per container / truck' : 'per shipment'}`)}
                      </div><p className="lr-note">Set a capacity to 0 when no limit applies.</p>
                    </details>
                  </section>

                  <section className="lr-form-section" aria-labelledby="charges-heading">
                    <h3 id="charges-heading">Charges & conditions</h3><p className="lr-muted">Include every mandatory customer charge before publishing.</p>
                    {c.charges.map((ch: any, i: number) => {
                      const update = (key: string, value: string) => change('charges', c.charges.map((x: any, j: number) => i === j ? { ...x, [key]: value } : x));
                      return <div className="lr-charge" key={i}><div className="lr-heading"><h4>Charge {i + 1}</h4><button className="lr-icon-button" type="button" aria-label={`Remove charge ${i + 1}`} onClick={() => change('charges', c.charges.filter((_: any, j: number) => j !== i))}><Trash2 size={16} /></button></div><div className="lr-grid">
                        <label>Charge name<input required maxLength={100} value={ch.name} onChange={e => update('name', e.target.value)} /></label>
                        <label>Charge basis<select value={ch.basis} onChange={e => update('basis', e.target.value)}>{['SHIPMENT', 'PERCENT', ...(c.subtype === 'FCL' ? ['CONTAINER'] : ['KG', 'CBM', 'TONNE']), ...(c.mode === 'TRUCK' ? ['VEHICLE'] : [])].map(v => <option key={v}>{v}</option>)}</select></label>
                        <label>Amount {ch.basis === 'PERCENT' ? '(%)' : `(${c.currency})`}<input required type="number" min="0" step="any" value={ch.amount} onChange={e => update('amount', e.target.value)} /></label>
                        <label>Tax treatment<input required maxLength={120} value={ch.tax} onChange={e => update('tax', e.target.value)} /></label>
                      </div></div>;
                    })}
                    <button className="lr-text-button" type="button" onClick={() => change('charges', [...c.charges, { name: '', basis: 'SHIPMENT', amount: '', tax: 'No additional tax' }])}><Plus size={16} aria-hidden="true" /> Add charge</button>
                    {c.charges.length > 0 && <p className="lr-note">Percentages apply independently to base freight. Tax notes do not calculate tax; add a separate charge for it.</p>}
                    <div className="lr-grid"><label>Included charges / conditions<textarea required placeholder="One item per line" value={c.inclusions.join('\n')} onChange={e => change('inclusions', e.target.value.split('\n'))} /></label><label>Excluded charges / conditions<textarea placeholder="One item per line" value={c.exclusions.join('\n')} onChange={e => change('exclusions', e.target.value.split('\n'))} /></label></div>
                    <p className="lr-note">Only offers with matching service names and inclusion / exclusion lists are compared.</p>
                  </section>
                </div>

                <aside className="lr-preview" aria-labelledby="preview-heading">
                  <div className="lr-heading"><h3 id="preview-heading">Check & {canPublish ? 'publish' : 'submit'}</h3><Calculator size={18} aria-hidden="true" /></div>
                  <p className="lr-muted">Test a sample shipment to check the final customer price.</p>
                  <div className="lr-preview-route"><ModeIcon size={18} aria-hidden="true" /><span>{c.origin_id ? locationName(c.origin_id) : 'Select origin'}<ArrowRight size={14} aria-hidden="true" />{c.destination_id ? locationName(c.destination_id) : 'Select destination'}</span></div>
                  <div className="lr-grid">
                    <label>Total cargo (CBM)<input type="number" min="0.000001" step="any" value={volume} placeholder="e.g. 1" onChange={e => resetSample(() => setVolume(e.target.value))} /></label>
                    <label>Total weight (kg)<input type="number" min="0.000001" step="any" value={weight} placeholder="e.g. 100" onChange={e => resetSample(() => setWeight(e.target.value))} /></label>
                    {['FCL', 'FTL'].includes(c.subtype) && <label className="lr-full">Container / truck quantity<input type="number" min="1" step="1" value={quantity} onChange={e => resetSample(() => setQuantity(e.target.value))} /></label>}
                  </div>
                  {c.subtype === 'FCL' && <p className="lr-note">Cargo volume and weight are optional for container pricing unless capacity limits apply.</p>}
                  <button className="lr-wide" type="button" onClick={previewRate}>{busy ? 'Working…' : 'Calculate preview'}</button>
                  {preview ? preview.unavailable ? <p role="status" className="lr-preview-warning">No price is available. Check tier minimums and capacity limits.</p> : <div className="lr-preview-result" role="status"><span>Customer estimate</span><strong><small>USD</small> {preview.total}</strong><dl><div><dt>Base freight</dt><dd>USD {preview.base}</dd></div>{preview.charges.map((ch: any, i: number) => <div key={i}><dt>{ch.name}</dt><dd>USD {ch.amount}</dd></div>)}</dl><p className="lr-note">Billable: {preview.pricing_units} {preview.basis}{preview.divisor ? ` · Divisor ${preview.divisor}` : ''}</p></div> : <p className="lr-preview-hint">Complete the rate and calculate a preview to enable {canPublish ? 'publishing' : 'submission'}.</p>}
                  <div className="lr-save-actions"><button type="button" className="lr-primary lr-wide" disabled={!preview || preview.unavailable} onClick={() => save(true)}>{canPublish ? 'Save & publish' : 'Save & submit for approval'}<ArrowRight size={16} aria-hidden="true" /></button><button type="submit" className="lr-wide">Save draft</button></div>
                  <p className="lr-note">Drafts stay private. Editing a published rate removes it from new estimates until it is published again.</p>
                  <p className="lr-note">Customer estimates use USD.<br />Conversion: 3.65 QAR = 1 USD.</p>
                </aside>
              </fieldset>
            </form>
            {compare.length > 0 && <section className="lr-comparison"><h3>Comparable offers</h3><p className="lr-muted">Same route, service and conditions. Pending offers are not public.</p><div className="lr-scroll" tabIndex={0} role="region" aria-label="Comparable offers"><table><thead><tr><th>Created by</th><th>Status</th><th>Total USD</th><th>Difference</th></tr></thead><tbody>{compare.map((r: any, i: number) => <tr key={r.id}><td>{r.operator_name}{i === 0 && <span className="lr-lowest">Lowest</span>}</td><td>{statusBadge(r.status)}</td><td>{r.result.total}</td><td>{r.difference}</td></tr>)}</tbody></table></div></section>}
          </> : <>
            <section className="lr-rates" aria-labelledby="rates-heading">
              <div className="lr-heading lr-list-heading"><div><h2 id="rates-heading">{canPublish ? 'All freight rates' : 'My freight rates'}</h2><p className="lr-muted">{canPublish ? 'Review, update and publish your customer tariffs.' : 'Prepare customer tariffs and submit them for approval.'}</p></div><span className="lr-count">{total} {total === 1 ? 'rate' : 'rates'}{search || status ? ' matching' : ''}</span></div>
              <div className="lr-toolbar">
                <label className="lr-search"><span className="sr-only">Search rates</span><Search size={17} aria-hidden="true" /><input type="search" placeholder="Search route, carrier or creator…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
                <label className="lr-filter"><span className="sr-only">Filter by status</span><select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
                <button disabled={busy || loading} onClick={() => run(async () => { await options(); await refresh(); })}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
              </div>
              <div className="lr-status-tabs" role="group" aria-label="Quick status filters">{[['', 'All rates'], ['pending', 'Pending approval'], ['approved', 'Published'], ['draft', 'Drafts']].map(([value, title]) => <button key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>{title}</button>)}</div>
              {listError ? <div role="alert" className="lr-empty"><AlertCircle size={26} aria-hidden="true" /><h3>Rates could not be loaded</h3><p>{listError}</p><button onClick={refresh}>Try again</button></div> : loading ? <div className="lr-loading" role="status"><span className="sr-only">Loading freight rates</span>{[1, 2, 3].map(i => <div key={i}><span /><span /><span /></div>)}</div> : !rows.length ? <div className="lr-empty"><Search size={28} aria-hidden="true" /><h3>{search || status ? 'No rates match these filters' : 'Add your first freight rate'}</h3><p>{search || status ? 'Try another route or carrier, or clear your filters.' : 'Start with a route and selling price. Save a draft, then preview it before publishing.'}</p>{search || status ? <button onClick={() => { setSearch(''); setStatus(''); setPage(1); }}>Clear filters</button> : <button className="lr-primary" onClick={() => open(null)}><Plus size={16} /> Add rate</button>}</div> : <>
                <div className="lr-table-heading" aria-hidden="true"><span>Route & service</span><span>Base rate</span><span>Validity</span><span>Status</span><span>Actions</span></div>
                <div className="lr-list">{rows.map(r => {
                  const Icon = r.config.mode === 'SEA' ? Ship : r.config.mode === 'TRUCK' ? Truck : Plane;
                  return <article key={r.id} className="lr-rate-row" aria-label={`${locationName(r.config.origin_id)} to ${locationName(r.config.destination_id)}, ${r.config.carrier}`}>
                    <div className="lr-route-cell"><div className="lr-mode-label"><Icon size={15} aria-hidden="true" /><span>{r.config.mode === 'TRUCK' ? 'ROAD' : r.config.mode}{r.config.mode !== 'AIR' ? ` · ${r.config.subtype}` : ''}{r.config.subtype === 'FCL' ? ` · ${r.config.size} ${r.config.equipment}` : ''}{r.config.mode === 'TRUCK' ? ` · ${r.config.truck}` : ''}</span></div><h3 title={`${label(r.config.origin_id)} → ${label(r.config.destination_id)}`}>{locationName(r.config.origin_id)}<ArrowRight size={15} aria-hidden="true" />{locationName(r.config.destination_id)}</h3><p>{r.config.carrier} · {r.config.service}</p></div>
                    <div className="lr-price-cell"><span className="lr-mobile-label">Base rate</span><strong>{priceLabel(r.config)}</strong><small>{labels[r.config.model]}</small></div>
                    <div className="lr-validity-cell"><span className="lr-mobile-label">Validity</span><span>{dateLabel(r.config.valid_from)}</span><small>to {dateLabel(r.config.valid_until)}</small></div>
                    <div className="lr-state-cell">{statusBadge(r.status)}<small>Rev. {r.version}{canPublish ? ` · ${r.operator_name}` : ''}</small></div>
                    <div className="lr-row-buttons"><button disabled={busy} onClick={() => open(r)}>Edit rate</button><button disabled={busy} className="lr-text-button" aria-expanded={expandedId === r.id} aria-controls={`actions-${r.id}`} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>Actions<ChevronDown size={14} /></button></div>
                    {expandedId === r.id && <div className="lr-row-actions" id={`actions-${r.id}`}>
                      {canPublish && r.status === 'pending' && <><button className="lr-primary" disabled={busy} onClick={() => action(r, 'approve')}><Check size={15} /> Approve & publish</button><button disabled={busy} onClick={() => action(r, 'reject')}>Reject</button></>}
                      {['draft', 'rejected'].includes(r.status) && <button disabled={busy} onClick={() => action(r, 'submit')}>Submit for approval</button>}
                      <button disabled={busy} onClick={() => action(r, 'duplicate')}><Copy size={15} /> Duplicate</button><button disabled={busy} onClick={() => showHistory(r)}><History size={15} /> View history</button>
                      {['approved', 'pending', 'draft', 'rejected'].includes(r.status) && <button disabled={busy} onClick={() => action(r, 'inactive')}><Ban size={15} /> Disable</button>}
                      {r.status !== 'archived' && <button disabled={busy} onClick={() => action(r, 'archive')}><Archive size={15} /> Archive</button>}
                    </div>}
                  </article>;
                })}</div>
              </>}
              <div className="lr-pagination"><span>{total ? `${(page - 1) * 30 + 1}–${Math.min(page * 30, total)} of ${total}` : '0 rates'}</span><div><button disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}><ArrowLeft size={15} /> Previous</button><span>Page {page}</span><button disabled={loading || page * 30 >= total} onClick={() => setPage(p => p + 1)}>Next <ArrowRight size={15} /></button></div></div>
            </section>

            {history && <section className="lr-history"><div className="lr-heading"><h2 ref={historyHeading} tabIndex={-1}>Rate history</h2><button onClick={() => setHistory(null)}><X size={16} /> Close history</button></div><p className="lr-muted">{label(history.rate.config.origin_id)} → {label(history.rate.config.destination_id)}</p><h3>Activity</h3>{history.events.length ? <ol className="lr-timeline">{history.events.map((event: any, i: number) => <li key={i}><span>{event.action.replaceAll('-', ' ')} · revision {event.version}</span><time>{event.created_at} UTC</time>{event.detail.reason && <p>{event.detail.reason}</p>}</li>)}</ol> : <p className="lr-muted">No activity recorded yet.</p>}<h3>Saved revisions</h3>{history.versions.map((v: any) => <details key={v.version} className="lr-advanced"><summary>Revision {v.version} · {v.created_at} UTC<ChevronDown size={16} /></summary><p>{v.config.carrier} · {v.config.service}</p><p>{priceLabel(v.config)} {labels[v.config.model]}</p><p>{dateLabel(v.config.valid_from)} – {dateLabel(v.config.valid_until)}</p><dl className="lr-revision-details">{Object.entries(v.config).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{Array.isArray(value) ? value.map((item, i) => <div key={i}>{typeof item === 'object' ? Object.entries(item).map(([k, val]) => `${k.replaceAll('_', ' ')}: ${val}`).join(' · ') : String(item)}</div>) : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value || '—')}</dd></div>)}</dl></details>)}<h3>Latest 100 quotation snapshots</h3>{history.quotes.length ? history.quotes.map((q: any) => <details className="lr-advanced" key={q.id}><summary>{q.created_at} UTC · USD {q.result.estimate?.total || 'Unavailable'}<ChevronDown size={16} /></summary><p>Reference: {q.id}</p><p>{q.result.origin} → {q.result.destination}</p><p>Expires: {q.expires_at} UTC</p><pre>{JSON.stringify(q.result, null, 2)}</pre></details>) : <p className="lr-muted">No customer estimates recorded for this rate.</p>}</section>}
            <details className="lr-road-location"><summary><Plus size={17} aria-hidden="true" /><span>Add a road destination<small>Missing a city, terminal or delivery location?</small></span><ChevronDown size={16} aria-hidden="true" /></summary><p className="lr-muted">Check the directory first to avoid duplicates. Use a precise pickup or delivery location.</p><div className="lr-grid"><label>Country<SearchComboBox label="Country" value={road.country} onChange={v => setRoad(p => ({ ...p, country: v }))} options={countries.map(x => ({ value: x.name, label: x.name }))} /></label><label>City / terminal / delivery location<input maxLength={180} value={road.name} onChange={e => setRoad(p => ({ ...p, name: e.target.value }))} /></label></div><button disabled={busy || !road.country || !road.name.trim()} onClick={addRoad}>Add location</button></details>
            <p className="lr-footnote">Drafts and pending rates stay private. Published estimates use USD at 3.65 QAR per USD. Validity uses Qatar time.</p>
          </>}
        </>}
      </div>
    </AppLayout>;
}
