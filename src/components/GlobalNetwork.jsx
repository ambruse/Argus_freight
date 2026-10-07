import { useEffect, useRef } from 'react';
import { commercialPages } from '../seo/commercial-pages.mjs';
import './GlobalNetwork.css';

export const markets = [
  { id: 'qatar', name: 'Qatar', detail: 'Doha · Headquarters' },
  { id: 'uae', name: 'UAE', detail: 'Dubai · Regional connections' },
  { id: 'china', name: 'China', detail: 'Guangzhou & Yiwu · Consolidation' },
  { id: 'india', name: 'India', detail: 'Tuticorin & Nilambur · Local contacts' },
  { id: 'turkey', name: 'Turkey', detail: 'Istanbul · Consolidation network' },
  { id: 'bahrain', name: 'Bahrain', detail: 'Busaiteen · Office' },
].map(market => ({ ...market, href: `/locations/${market.id}/` }));

export function CountryLinks({ currentPath = '', selected = markets, compact = false }) {
  return <ul className={`network-countries ${compact ? 'network-compact' : ''}`}>
    {selected.map(market => <li key={market.id}><a href={market.href} aria-current={currentPath === market.href ? 'page' : undefined}>
      <span><strong>{market.name}</strong>{!compact && <small>{market.detail}</small>}</span>
      <span aria-hidden="true">{currentPath === market.href ? '●' : '↗'}</span>
    </a></li>)}
  </ul>;
}

export function GlobalNetworkMenu({ currentPath }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.open = false; }, [currentPath]);
  useEffect(() => {
    const close = event => {
      if (!ref.current?.open) return;
      if (event.type === 'keydown' && event.key === 'Escape') {
        ref.current.open = false; ref.current.querySelector('summary').focus();
      } else if (event.type === 'pointerdown' && !ref.current.contains(event.target)) ref.current.open = false;
    };
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', close); };
  }, []);
  const current = markets.find(market => market.href === currentPath);
  return <nav className="global-network-access" aria-label="Global Network">
    <details ref={ref}>
      <summary><span aria-hidden="true">◎</span> Global Network {current && <span className="network-current">/ {current.name}</span>}<span className="network-chevron" aria-hidden="true">⌄</span></summary>
      <div className="network-panel"><p className="network-eyebrow">Choose your market</p>
        <CountryLinks currentPath={currentPath} />
        <a className="network-view-all" href="/locations/">View all locations <span aria-hidden="true">→</span></a>
      </div>
    </details>
  </nav>;
}

export function GlobalNetworkSection() {
  return <section className="section-padding network-section" aria-labelledby="global-network-title"><div className="container">
    <div className="network-heading"><div><span className="section-subtitle">Connected markets</span><h2 className="section-title" id="global-network-title">Our Global Network</h2></div><a href="/locations/">View all locations →</a></div>
    <p className="network-intro">Explore Argus Shipping’s offices, local contacts and consolidation network across the Middle East, Asia and Turkey. Choose a market to plan your freight and connected routes.</p>
    <CountryLinks />
  </div></section>;
}

export function NetworkContext({ page }) {
  const isCountry = page.group === 'locations';
  const isLane = page.group === 'trade-lanes';
  if (!isCountry && !isLane && page.group !== 'services') return null;
  const id = page.path.split('/')[2];
  const serviceMarkets = {
    'road-freight': ['qatar', 'uae', 'bahrain'],
    'customs-clearance': ['qatar', 'uae', 'bahrain'],
    'warehousing': ['qatar', 'uae', 'china', 'india'],
    '3pl-logistics': ['qatar', 'uae', 'india'],
    'project-cargo': ['qatar', 'china', 'uae'],
    'vehicle-logistics': ['qatar', 'uae'],
    'door-to-door-cargo': ['china', 'india', 'turkey', 'qatar', 'uae', 'bahrain'],
  };
  const selected = isCountry ? markets.filter(m => m.id !== id) : isLane ? markets.filter(m => id.split('-to-').includes(m.id)) : markets.filter(m => !serviceMarkets[id] || serviceMarkets[id].includes(m.id));
  const lanes = isCountry ? commercialPages.filter(p => p.group === 'trade-lanes' && p.path.split('/')[2].split('-to-').includes(id)) : [];
  return <section className="network-context" aria-label="Connected markets">
    <h2>{isCountry ? 'Explore Our Global Network' : isLane ? 'Meet the connected markets' : `${page.label} Across Our Network`}</h2>
    <p>{isCountry ? 'Connect this market with our wider network and plan the services required at each end of your shipment.' : 'Explore the relevant market contacts and freight coordination before discussing your shipment scope.'}</p>
    <CountryLinks selected={selected} compact />
    {lanes.length > 0 && <><h3>Key Trade Lanes</h3><ul className="network-route-links">{lanes.map(lane => <li key={lane.path}><a href={lane.path}>{lane.label} <span aria-hidden="true">→</span></a></li>)}</ul></>}
    <a className="network-view-all" href="/locations/">View the full Global Network →</a>
  </section>;
}

export function GlobalNetworkPage() {
  return <article className="commercial-page"><header className="services-hero-section"><div className="container">
    <nav className="commercial-breadcrumb" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Global Network</li></ol></nav>
    <h1 className="services-hero-title">Our Global Logistics Network</h1>
    <p className="services-hero-desc">Choose a market to explore Argus Shipping’s offices, contacts, consolidation network and connected freight routes.</p>
  </div></header><div className="container network-hub"><CountryLinks />
    <section><h2>Plan a connected shipment</h2><p>Start with the origin and destination markets, then discuss collection, international freight, documentation and delivery with our team. Office and receiving locations serve different roles; confirm cargo handover instructions before dispatch.</p>
      <p><a href="/trade-lanes/">Explore trade lanes</a> · <a href="/services">Explore freight services</a></p></section>
    <section><h2>Contact the logistics team</h2><p><a href="mailto:info@argusshipping.co">info@argusshipping.co</a> · <a href="tel:+97444116544">+974 44116544</a></p><a className="cta-button" href="/contact">Discuss Your Shipment</a></section>
  </div></article>;
}
