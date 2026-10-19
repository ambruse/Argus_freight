import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plane, Ship, Truck, X, Search } from 'lucide-react';
import CargoRows, { blankCargo } from './CargoRows';
import LocationSelect from './LocationSelect';
import phoneCountries from '../../../shared/phoneCountries.json';
import './live.css';
async function request(path, body) { const res = await fetch('/api/live-pricing' + path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); const data = await res.json(); if (!res.ok)
    throw new Error(data.message || 'Unable to load live pricing.'); return data; }
export default function LiveCalculator() {
    const [catalog, setCatalog] = useState({ locations: [], groups: [] }), [all, setAll] = useState([]), [custom, setCustom] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false), [result, setResult] = useState(null);
    const [catalogError, setCatalogError] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [step, setStep] = useState('contact'), [contactBusy, setContactBusy] = useState(false), [contactError, setContactError] = useState('');
    const [contact, setContact] = useState({ phone_country: 'Qatar', phone: '', email: '' });
    const enquiryAttempt = useRef(null), contactPending = useRef(false), contactSession = useRef(0);
    const dialogNode = useRef(null), searchNode = useRef(null), detailHeading = useRef(null);
    const [s, setS] = useState({ origin_id: '', destination_id: '', mode: '', subtype: '', size: '', equipment: '', truck: '', quantity: 1 }), [cargo, setCargo] = useState([blankCargo()]), [optional, setOptional] = useState(false), [profile, setProfile] = useState('');
    const revision = useRef(0), resultNode = useRef(null);
    const reset = () => { revision.current++; setResult(null); setError(''); setProfile(''); };
    const change = (key, value) => { reset(); setS(prev => ({ ...prev, [key]: value, ...(['origin_id', 'destination_id'].includes(key) ? { size: '', equipment: '', truck: '' } : {}), ...(key === 'size' ? { equipment: '' } : {}) })); };
    const load = async () => { setLoading(true); setCatalogError(''); reset(); try {
        const data = await request('/catalog');
        setCatalog(data);
        if (!data.groups.length) {
            const fallback = await request('/locations');
            setAll(fallback.locations);
            setCustom(true);
        }
    }
    catch (e) {
        setCatalogError(e.message);
        setCatalog({ locations: [], groups: [] });
        try {
            const fallback = await request('/locations');
            setAll(fallback.locations);
            setCustom(true);
        } catch {
            setAll([]);
        }
    }
    finally {
        setLoading(false);
    } };
    useEffect(() => { load(); }, []);
    useEffect(() => {
        if (!expanded) return;
        const dialog = dialogNode.current;
        const previousOverflow = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        detailHeading.current?.focus();
        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
            searchNode.current?.focus({ preventScroll: true });
        };
    }, [expanded]);
    useEffect(() => {
        if (!result?.available) return;
        const reference = result.reference;
        const expire = () => setResult(previous => previous?.reference === reference ? {...previous,available:false,estimate:null,stale:true} : previous);
        const timer = setTimeout(expire, Math.max(0, Date.parse(result.expires_at)-Date.now()));
        const refresh = setInterval(async()=>{
            try {
                const checked = await request('/quotes/'+reference);
                if (!checked.available) expire();
            } catch { /* The expiry timer remains authoritative if the connection drops. */ }
        },30000);
        return ()=>{clearTimeout(timer);clearInterval(refresh);};
    }, [result?.reference,result?.available,result?.expires_at]);
    const ls = custom ? all : catalog.locations;
    const origins = ls.filter(l => (!s.mode || l.kind === s.mode) && l.id !== s.destination_id);
    const destinations = ls.filter(l => l.id !== s.origin_id && (!s.mode || l.kind === s.mode) && (custom || !s.origin_id || catalog.groups.some(g => g.origin_id === s.origin_id && g.destination_id === l.id && (!s.mode || g.mode === s.mode))));
    const lane = catalog.groups.filter(g => g.origin_id === s.origin_id && g.destination_id === s.destination_id && g.mode === s.mode && g.subtype === s.subtype);
    const groups = lane.filter(g => (s.subtype !== 'FCL' || (g.size === s.size && g.equipment === s.equipment)) && (s.mode !== 'TRUCK' || g.truck === s.truck));
    const group = groups.find(g => g.id === profile) || (groups.length === 1 ? groups[0] : null);
    const mode = value => { const incompatible = [s.origin_id, s.destination_id].some(id => id && ls.find(l => l.id === id)?.kind !== value); if (incompatible && !window.confirm('This mode uses different locations. Clear the route and keep your cargo details?'))
        return; reset(); setS(prev => ({ ...prev, mode: value, subtype: value === 'AIR' ? 'AIR' : value === 'TRUCK' ? 'LTL' : '', size: '', equipment: '', truck: '', quantity: 1, ...(incompatible ? { origin_id: '', destination_id: '' } : {}) })); };
    const submit = async (e) => { e.preventDefault(); setError(''); if (!s.origin_id || !s.destination_id) {
        setError('Select both origin and destination from the suggestions.');
        return;
    } if (groups.length > 1 && !group) {
        setError('Choose the service conditions to compare.');
        return;
    } setBusy(true); const current = revision.current; try {
        const data = await request('/quotes', { group: group?.id, shipment: { ...s, cargo: s.subtype === 'FCL' && !optional ? [] : cargo } });
        if (current === revision.current) {
            setResult(data);
            setTimeout(() => resultNode.current?.focus(), 0);
        }
    }
    catch (err) {
        if (current === revision.current)
            setError(err.message);
    }
    finally {
        setBusy(false);
    } };
    const enquiry = result ? `/customer/rfq/new?live_quote=${encodeURIComponent(result.reference)}` : '/customer/rfq/new';
    const types = s.mode === 'SEA' ? ['LCL', 'FCL'] : s.mode === 'TRUCK' ? ['LTL', 'FTL'] : [];
    const options = (values) => [...new Set(values)].filter(Boolean);
    const continueToDetails = async e => {
        e.preventDefault();
        if (contactPending.current) return;
        setContactError('');
        const country = phoneCountries.find(c => c.country === contact.phone_country);
        if (!/^[\d ()-]{4,24}$/.test(contact.phone) || contact.phone.replace(/\D/g, '').length < 4 || (country.code + contact.phone.replace(/\D/g, '')).length > 16) {
            setContactError('Enter a valid phone number without the country code.');
            return;
        }
        const payload = { ...contact, country_code: country.code, origin_id: s.origin_id, destination_id: s.destination_id, mode: s.mode };
        const key = JSON.stringify(payload);
        if (enquiryAttempt.current?.key !== key) enquiryAttempt.current = { key, id: crypto.randomUUID() };
        contactPending.current = true;
        const session = contactSession.current;
        setContactBusy(true);
        try {
            const sent = await request('/enquiries', { ...payload, id: enquiryAttempt.current.id });
            if (sent.delivery !== 'sent') throw new Error('Your enquiry could not be sent. Please try again.');
            if (session === contactSession.current) {
                setStep('details');
                setTimeout(() => detailHeading.current?.focus(), 0);
            }
        } catch (err) { if (session === contactSession.current) setContactError(err.message); }
        finally { contactPending.current = false; setContactBusy(false); }
    };
    const openDetails = e => {
        e.preventDefault();
        if (!s.origin_id || !s.destination_id) {
            setError('Select both origin and destination from the suggestions.');
            return;
        }
        if (!s.mode) {
            setError('Select AIR, SEA or TRUCK to continue.');
            return;
        }
        setError('');
        setContactError('');
        contactSession.current++;
        setStep('contact');
        setExpanded(true);
    };
    const calculator = details => <section className={`live-calculator${details ? ' live-calculator-expanded' : ' live-calculator-compact'}`} aria-labelledby={details ? 'live-detail-title' : 'live-title'}><header><span className="live-eyebrow">ARGUS SHIPPING</span><h2 id={details ? 'live-detail-title' : 'live-title'} ref={details ? detailHeading : undefined} tabIndex={details ? -1 : undefined}>Live Freight Rates</h2><p>{details ? 'Complete your shipment details for a freight estimate.' : 'Choose your route and transport mode to get started.'}</p>{details && <button type="button" className="live-close" aria-label="Close calculator" onClick={() => setExpanded(false)}><X size={20}/></button>}</header>
    {loading ? <p role="status">Loading available routes…</p> : <form onSubmit={details ? submit : openDetails}><div className="live-route"><LocationSelect label="POL / Origin" locations={origins} value={s.origin_id} onChange={v => { reset(); setS(p => ({ ...p, origin_id: v, destination_id: '', size: '', equipment: '', truck: '' })); }}/><LocationSelect label="POD / Destination" locations={destinations} value={s.destination_id} onChange={v => change('destination_id', v)}/></div>
    {!custom && <button className="live-text-button" type="button" onClick={async () => { try {
            const data = await request('/locations');
            setAll(data.locations);
            setCustom(true);
        }
        catch (e) {
            setError(e.message);
        } }}>Can’t find your route? Request a custom quote</button>}
    {details && custom && <p className="live-note">Showing the full location directory for enquiries. Instant prices appear only when an approved rate is available.</p>}
    <div className="live-choice" role="group" aria-label="Transport mode">{[['AIR', Plane], ['SEA', Ship], ['TRUCK', Truck]].map(([v, Icon]) => <button type="button" key={v} aria-pressed={s.mode === v} onClick={() => mode(v)}><Icon size={20}/>{v}</button>)}</div>
    {!details && <button className="live-primary live-search" type="submit" ref={searchNode}><Search size={19}/>Search</button>}
    {details && types.length > 0 && <div className="live-choice" role="group" aria-label="Shipment type">{types.map(v => <button type="button" key={v} aria-pressed={s.subtype === v} onClick={() => change('subtype', v)}><span>{v}<small>{{ LCL: 'Less than container load', FCL: 'Full container load', LTL: 'Less than truck load', FTL: 'Full truck load' }[v]}</small></span></button>)}</div>}
    {details && s.mode && s.subtype && <><div className="live-fields">{s.subtype === 'FCL' && <><label>Container size<select required value={s.size} onChange={e => change('size', e.target.value)}><option value="">Select size</option>{(custom ? ['20', '40', '40HQ'] : options(lane.map(g => g.size))).map(v => <option key={v} value={v}>{v === '40HQ' ? '40 FT High Cube (HQ)' : v + ' FT'}</option>)}</select></label><label>Container type<select required value={s.equipment} onChange={e => change('equipment', e.target.value)}><option value="">Select type</option>{(custom ? ['DRY', 'REEFER'] : options(lane.filter(g => g.size === s.size).map(g => g.equipment))).map(v => <option key={v} value={v}>{v === 'DRY' ? 'Standard / Dry' : 'Reefer'}</option>)}</select></label></>}
    {s.mode === 'TRUCK' && <label>Truck / load class{custom ? <input required value={s.truck} onChange={e => change('truck', e.target.value)} placeholder="Required vehicle or load class"/> : <select required value={s.truck} onChange={e => change('truck', e.target.value)}><option value="">Select truck class</option>{options(lane.map(g => g.truck)).map(v => <option key={v}>{v}</option>)}</select>}</label>}
    {['FCL', 'FTL'].includes(s.subtype) && <label>Number of {s.subtype === 'FCL' ? 'containers' : 'trucks'}<input required type="number" min="1" max="10000" step="1" value={s.quantity} onChange={e => change('quantity', e.target.value)}/></label>}</div>
    {s.subtype === 'FCL' && <label className="live-check"><input type="checkbox" checked={optional} onChange={e => { reset(); setOptional(e.target.checked); }}/>Optional cargo information for capacity checks</label>}
    {(s.subtype !== 'FCL' || optional) && <CargoRows rows={cargo} onChange={rows => { reset(); setCargo(rows); }}/>}
    {s.subtype === 'FCL' && optional && <p className="live-note">Capacity checks use the selected tariff’s configured limits. Container loading, dimensions and payload require operational confirmation; volume alone does not guarantee fit.</p>}
    {groups.length > 1 && <label>Service conditions<select required value={profile} onChange={e => { setResult(null); revision.current++; setProfile(e.target.value); }}><option value="">Select an equivalent service</option>{groups.map(g => <option key={g.id} value={g.id}>{g.service} · Includes {g.inclusions.join(', ')} · Excludes {g.exclusions.join(', ') || 'none stated'}</option>)}</select></label>}
    {group && <p className="live-note">{group.service} · Includes: {group.inclusions.join(', ')}. Excludes: {group.exclusions.join(', ') || 'none stated'}.</p>}
    {s.mode === 'AIR' && <p className="live-note">Chargeable weight is the greater of actual and volumetric weight. The applicable carrier divisor, rounding and minimums are shown with the result.</p>}
    {['LCL', 'LTL', 'FTL'].includes(s.subtype) && <p className="live-note">Preview total: volume and weight above. Freight minimums and additional charges are included when you check the price.</p>}
    <button className="live-primary" disabled={busy} type="submit">{busy ? 'Calculating…' : 'Check Price'}</button></>}
    </form>}
    {(error || (details && catalogError)) && <div className="live-error" role="alert">{error || catalogError} <button type="button" onClick={load}>Retry loading routes</button> <a href={enquiry}>Request a custom quotation</a></div>}
    {!details && catalogError && !error && <p className="live-note" role="status">Instant pricing is temporarily unavailable. You can still enter your shipment details.</p>}
    {details && result && <div className="live-result" ref={resultNode} tabIndex={-1}><h3>{result.available ? 'Your freight estimate' : 'Custom quotation'}</h3><p>{result.origin} → {result.destination}</p><p>{s.mode} · {s.subtype}{s.subtype === 'FCL' ? ` · ${s.size} FT ${s.equipment} × ${s.quantity}` : ''}</p>{result.available ? <><div className="live-amount">USD {result.estimate.total}</div><dl><dt>Rate basis</dt><dd>{result.estimate.pricing_units.toLocaleString()} {result.estimate.basis} · {result.estimate.service}</dd><dt>Base freight</dt><dd>USD {result.estimate.base}</dd>{result.estimate.charges.map((c, i) => <div className="live-breakdown" key={i}><dt>{c.name}<small>{c.tax}</small></dt><dd>USD {c.amount}</dd></div>)}<dt>Total volume / actual weight</dt><dd>{result.estimate.cbm.toLocaleString()} m³ / {result.estimate.actual_kg.toLocaleString()} kg</dd>{s.mode === 'AIR' && <><dt>Volumetric / chargeable / billed weight</dt><dd>{result.estimate.volumetric_kg.toFixed(2)} / {result.estimate.chargeable_kg.toFixed(2)} / {result.estimate.billed_kg.toFixed(2)} kg<br />Divisor {result.estimate.divisor} cm³/kg</dd></>}<dt>Rate validity (Qatar)</dt><dd>{result.estimate.valid_from} – {result.estimate.valid_until}</dd></dl><p className="live-note">Includes: {result.estimate.inclusions.join(', ')}.<br />Excludes: {result.estimate.exclusions.join(', ') || 'none stated'}.<br />Estimate based on current published rates, subject to availability and final operational confirmation.</p></> : <p>Live pricing is currently unavailable for this shipment. Request a custom quotation.</p>}
    <p className="live-note">Reference: {result.reference}<br />Estimate expires: {new Date(result.expires_at).toLocaleString('en-GB', { timeZone: 'Asia/Qatar' })} (Qatar)</p><div className="live-choice"><a className="live-primary" href={enquiry}>{result.available ? 'Request Booking' : 'Request a custom quotation'}</a><a href={enquiry + '&intent=contact'}>Contact Our Team</a></div></div>}
  </section>;
    const contactForm = <section className="live-calculator live-calculator-expanded live-contact"><header><span className="live-eyebrow">ARGUS SHIPPING · STEP 1 OF 2</span><h2 id="live-detail-title" ref={detailHeading} tabIndex={-1}>How can we reach you?</h2><p>Enter your contact details to continue with your shipment.</p><button type="button" className="live-close" aria-label="Close calculator" onClick={() => setExpanded(false)}><X size={20}/></button></header>
        <form onSubmit={continueToDetails}>
            <fieldset disabled={contactBusy} className="live-contact-fields">
                <label>Country / calling code<select required autoComplete="country-name" value={contact.phone_country} onChange={e => setContact(c => ({ ...c, phone_country: e.target.value }))}>{phoneCountries.map(c => <option key={c.country} value={c.country}>{c.country} ({c.code})</option>)}</select></label>
                <label>Phone number<input required type="tel" autoComplete="tel-national" inputMode="tel" maxLength={24} value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} placeholder="Number without the country code"/></label>
                <label>Email address<input required type="email" autoComplete="email" maxLength={254} value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} placeholder="you@example.com"/></label>
            </fieldset>
            <p className="live-note">Continue sends your contact details and selected route to an Argus Shipping operator for this enquiry.</p>
            {contactError && <p className="live-error" role="alert">{contactError} <a href="/contact">Contact our team</a></p>}
            <button className="live-primary" type="submit" disabled={contactBusy}>{contactBusy ? 'Sending enquiry…' : 'Continue'}</button>
        </form>
    </section>;
    return <>{calculator(false)}{expanded && createPortal(<dialog ref={dialogNode} className={`live-modal${step === 'contact' ? ' live-modal-contact' : ''}`} aria-labelledby="live-detail-title" onCancel={() => setExpanded(false)} onClick={e => {
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) setExpanded(false);
    }}>{step === 'contact' ? contactForm : calculator(true)}</dialog>, document.body)}</>;
}
