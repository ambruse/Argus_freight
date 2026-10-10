import { useEffect, useId, useState } from 'react';
import './FreightRates.css';
import { groupPublicRoutes } from './freightRoutes.mjs';

export default function FreightRates({ fullPage = false }) {
  const id = useId();
  const [filters, setFilters] = useState({ origin: '', destination: '', container: '', date: '' });
  const [catalog, setCatalog] = useState({ locations: [], containers: [] });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [moreBusy, setMoreBusy] = useState(false);
  const [automaticDate, setAutomaticDate] = useState(true);
  const [selectedRates, setSelectedRates] = useState({});
  const Heading = fullPage ? 'h1' : 'h2';

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/freight-rates/catalog', { signal: controller.signal }).then(r => r.ok ? r.json() : Promise.reject())
      .then(setCatalog).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const refreshNow = () => setRefresh(n => n + 1);
    const timer = setInterval(refreshNow, 60000);
    const visible = () => { if (document.visibilityState === 'visible') refreshNow(); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true); setError(''); setResult(null);
      try {
        const params = new URLSearchParams({ ...filters, date: automaticDate ? '' : filters.date });
        const response = await fetch(`/api/freight-rates/public?${params}`, { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load rates.');
        setResult({ ...data, queryKey: params.toString() });
      } catch (e) { if (e.name !== 'AbortError') setError(e.message || 'Unable to load rates. Please try again.'); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [filters, refresh, automaticDate]);
  async function more() {
    setMoreBusy(true);
    const queryKey = result.queryKey;
    try {
      const params = new URLSearchParams({ ...filters, date: result.date, offset: result.nextOffset });
      const response = await fetch(`/api/freight-rates/public?${params}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setResult(old => old && old.queryKey === queryKey ? { ...data, queryKey, rates: [...old.rates, ...data.rates.filter(r => !old.rates.some(o => o.reference === r.reference))] } : old);
    } catch (e) { setResult(null); setError(e.message || 'Unable to load rates.'); }
    finally { setMoreBusy(false); }
  }
  const change = e => {
    if (e.target.name === 'date') setAutomaticDate(!e.target.value);
    setFilters(old => ({ ...old, [e.target.name]: e.target.value }));
  };
  const quoteLink = rate => {
    const [rateId,version] = rate.reference.split(':');
    return `/api/freight-rates/quote/${encodeURIComponent(rateId)}?` + new URLSearchParams({version,date:result.date,price:rate.price});
  };
  return <section className={`freight-rates-section ${fullPage ? 'freight-rates-page' : ''}`} aria-labelledby={`${id}-title`}>
    <div className="container">
      <div className="freight-heading">
        <div><span className="section-subtitle">PLAN YOUR NEXT SHIPMENT</span>
          <Heading id={`${id}-title`}>THIS WEEK&apos;S FREIGHT RATES</Heading>
          <p>Compare our latest freight rates across major international shipping routes.</p></div>
        {!fullPage && <a className="freight-link" href="/freight-rates">Explore all rates <span aria-hidden="true">↗</span></a>}
      </div>
      <div className="freight-panel">
        <div className="freight-filters">
          {['origin','destination'].map(field => <label key={field} htmlFor={`${id}-${field}`}>
            Search {field === 'origin' ? 'Origin' : 'Destination'}
            <input id={`${id}-${field}`} name={field} type="search" list={`${id}-locations`} value={filters[field]} onChange={change} placeholder={field === 'origin' ? 'Port or place of departure' : 'Port or place of arrival'} autoComplete="off" />
          </label>)}
          <datalist id={`${id}-locations`}>{catalog.locations.filter(l => l.active && l.mode !== 'AIR').map(l => <option key={l.id} value={l.name}>{l.mode === 'SEA' ? 'Seaport' : 'Location'} · {l.aliases.join(', ')}</option>)}</datalist>
          <label htmlFor={`${id}-container`}>Container
            <select id={`${id}-container`} name="container" value={filters.container} onChange={change}><option value="">All equipment</option>{catalog.containers.filter(c => c.active).map(c => <option key={c.code} value={c.code}>{c.code}</option>)}</select>
          </label>
          <label htmlFor={`${id}-date`}>Shipment date · Qatar
            <input id={`${id}-date`} type="date" name="date" value={automaticDate ? result?.today || '' : filters.date} min={result?.week.start} max={result?.week.end} onChange={change} />
          </label>
        </div>
        <p className="freight-week">{result ? `Monday–Sunday: ${result.week.start} to ${result.week.end} · Showing rates valid on ${result.date} (Asia/Qatar)` : 'Monday–Sunday calendar week · Asia/Qatar'}
          {!automaticDate && <button type="button" onClick={() => { setAutomaticDate(true); setFilters(f => ({ ...f, date: '' })); }}>Show today</button>}
        </p>
        <div className="freight-scroll" tabIndex={0} role="region" aria-label="Published freight rates, scroll for more routes" aria-busy={busy}>
          <table className="freight-table" role="table"><caption className="freight-sr-only">Best rates for the selected date, grouped by equipment, currency and equivalent terms</caption>
            <thead role="rowgroup"><tr role="row">{['Origin','Destination','Container','Best Rate','Valid Until','Action'].map(h => <th key={h} scope="col" role="columnheader">{h}</th>)}</tr></thead>
            <tbody role="rowgroup">{groupPublicRoutes(result?.rates).map(lane => {
              const rate = lane.options.find(option => option.reference === selectedRates[lane.key]) || lane.options[0];
              return <tr key={lane.key} role="row">
              <td role="cell" data-label="Origin · POL">{rate.origin}</td><td role="cell" data-label="Destination · POD">{rate.destination}</td><td role="cell" data-label="Container"><span className="freight-equipment">{rate.container_type}</span>
                {lane.options.length > 1 && <label className="freight-options">{lane.options.length} rate options
                  <select aria-label={`Rate option for ${rate.origin} to ${rate.destination}`} value={rate.reference} onChange={e => setSelectedRates(old => ({...old,[lane.key]:e.target.value}))}>
                    {lane.options.map((option,index) => <option key={option.reference} value={option.reference}>{index+1}. {option.container_type} · {option.currency} {option.price} · {option.service} · {option.basis.replaceAll('_',' ')} · Includes: {option.inclusions.join(', ')} · Excludes: {option.exclusions.join(', ') || 'None declared'}</option>)}
                  </select>
                </label>}
              </td>
              <td role="cell" data-label="Best rate"><strong className="freight-price">{rate.currency} {Number(rate.price).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>per {rate.container_type} container</small>
                <details><summary>Price conditions</summary><p>{rate.service} · {rate.basis.replaceAll('_',' ')}<br />Includes: {rate.inclusions.join(', ')}<br />Excludes: {rate.exclusions.join(', ') || 'None declared'}<br />Valid from {rate.valid_from} to {rate.valid_until}</p></details>
              </td><td role="cell" data-label="Valid until">{rate.valid_until}</td><td role="cell" className="freight-action">{rate.whatsapp_available ? <a className="freight-quote" href={quoteLink(rate)} target="_blank" rel="noopener noreferrer" aria-label={`Request Quote on WhatsApp for ${rate.origin} to ${rate.destination}, ${rate.container_type}`}>Request Quote <span aria-hidden="true">↗</span></a> : <><button className="freight-quote" disabled>Request Quote</button><small>Operator WhatsApp not set</small></>}<small>{rate.whatsapp_available ? 'Opens WhatsApp' : ''}</small></td>
            </tr>; })}</tbody>
          </table>
          <div aria-live="polite">{busy && <p className="freight-state">Loading freight rates…</p>}
            {error && <p className="freight-state" role="alert">{error} <button onClick={() => setRefresh(n => n+1)}>Try again</button></p>}
            {!busy && !error && !result?.rates.length && <p className="freight-state">Rate currently unavailable — <a href="/customer/rfq/new">Request a Quote.</a></p>}
          </div>
          {result?.nextOffset != null && <button className="freight-load" disabled={moreBusy} onClick={more}>{moreBusy ? 'Loading…' : 'Load more routes'}</button>}
        </div>
        <div className="freight-footnote"><span>Freight rates are subject to availability and final confirmation.</span><span>Different currencies and price conditions are compared separately.</span></div>
      </div>
    </div>
  </section>;
}
