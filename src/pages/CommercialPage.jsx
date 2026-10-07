import { serviceById, tradePages } from '../seo/commercial-pages.mjs';
import './CommercialPage.css';
import { NetworkContext } from '../components/GlobalNetwork';

export default function CommercialPage({ page }) {
  const isRoute = page.group === 'trade-lanes';
  const isCountry = page.group === 'locations';
  return <article className="commercial-page">
    <header className="services-hero-section">
      <div className="container">
        <nav aria-label="Breadcrumb" className="commercial-breadcrumb"><ol>
          <li><a href="/">Home</a></li>
          <li><a href={isCountry ? '/locations/' : isRoute ? '/trade-lanes/' : '/services'}>{isCountry ? 'Global Network' : isRoute ? 'Trade Lanes' : 'Services'}</a></li>
          <li aria-current="page">{page.label}</li>
        </ol></nav>
        <span className="services-hero-tag font-gold">{isCountry ? `Global Network / ${page.label}` : isRoute ? 'International shipping' : 'Argus Shipping'}</span>
        <h1 className="services-hero-title">{page.h1}</h1>
        <p className="services-hero-desc">{page.intro}</p>
        <a className="cta-button" href="/contact">Discuss Your Shipment</a>
      </div>
    </header>
    <div className="container commercial-content">
      {page.image && <img src={page.image} alt="Illustration of Argus dangerous goods cargo handling" width="556" height="469" loading="lazy" style={{ maxWidth: '100%', height: 'auto', borderRadius: 'var(--border-radius-md)', marginBottom: '2rem' }} />}
      {page.sections.map(section => <section key={section.heading}>
        <h2>{section.heading}</h2><p>{section.text}</p>
      </section>)}
      <section className="commercial-enquiry">
        <h2>Request {isRoute ? `a ${page.label} freight` : 'a tailored freight'} quote</h2>
        <p>Send the origin and destination, cargo description, package dimensions and weight, cargo-ready date and any delivery constraints. Argus Shipping’s Doha team can discuss the scope, available options and charges for your enquiry.</p>
        <p><a href="/contact" className="cta-button">Contact Our Logistics Team</a></p>
        <p><a href="mailto:info@argusshipping.co">info@argusshipping.co</a> · <a href="tel:+97444116544">+974 44116544</a></p>
      </section>
      <NetworkContext page={page} />
      {page.references && <section><h2>Transport guidance</h2><p>Shipment requirements must be checked against the current rules and the proposed carrier’s acceptance conditions.</p><ul className="commercial-related">{page.references.map(reference => <li key={reference.href}><a href={reference.href}>{reference.label}</a></li>)}</ul></section>}
      <aside aria-label="Related freight services">
        <h2>Plan the connected services</h2>
        <ul className="commercial-related">{page.related.map(id => <li key={id}><a href={serviceById[id].path}>{serviceById[id].label}</a></li>)}</ul>
        {!isRoute && <p>Importing from a sourcing market? <a href="/trade-lanes/">Explore our trade lanes</a>.</p>}
      </aside>
    </div>
  </article>;
}

export function ShippingRoutes() {
  return <article className="commercial-page">
    <header className="services-hero-section"><div className="container">
      <nav aria-label="Breadcrumb" className="commercial-breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Shipping Routes</li></ol></nav>
      <h1 className="services-hero-title">International Shipping &amp; Trade Lanes</h1>
      <p className="services-hero-desc">Explore freight coordination through Argus Shipping’s sourcing and regional network. Each route brings together origin collection, freight options and destination delivery planning.</p>
    </div></header>
    <div className="container commercial-content"><div className="commercial-route-grid">{tradePages.map(page => <section key={page.path}>
      <h2><a href={page.path}>{page.h1}</a></h2><p>{page.intro}</p>
    </section>)}</div><p><a href="/services">Explore freight and logistics services</a> or <a href="/contact">discuss your shipment</a>.</p></div>
  </article>;
}
