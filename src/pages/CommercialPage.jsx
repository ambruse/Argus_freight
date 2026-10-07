import { serviceById, tradePages } from '../seo/commercial-pages.mjs';
import './CommercialPage.css';

export default function CommercialPage({ page }) {
  const isRoute = page.group === 'shipping';
  return <article className="commercial-page">
    <header className="services-hero-section">
      <div className="container">
        <nav aria-label="Breadcrumb" className="commercial-breadcrumb"><ol>
          <li><a href="/">Home</a></li>
          <li><a href={isRoute ? '/shipping/' : '/services'}>{isRoute ? 'Shipping Routes' : 'Services'}</a></li>
          <li aria-current="page">{page.label}</li>
        </ol></nav>
        <span className="services-hero-tag font-gold">{isRoute ? 'International shipping' : 'Argus Shipping / Qatar'}</span>
        <h1 className="services-hero-title">{page.h1}</h1>
        <p className="services-hero-desc">{page.intro}</p>
        <a className="cta-button" href="/contact">Discuss Your Shipment</a>
      </div>
    </header>
    <div className="container commercial-content">
      {page.sections.map(section => <section key={section.heading}>
        <h2>{section.heading}</h2><p>{section.text}</p>
      </section>)}
      <section className="commercial-enquiry">
        <h2>Request {isRoute ? `a ${page.label} freight` : 'a tailored freight'} quote</h2>
        <p>Send the origin and destination, cargo description, package dimensions and weight, cargo-ready date and any delivery constraints. Argus Shipping’s Doha team can discuss the scope, available options and charges for your enquiry.</p>
        <p><a href="/contact" className="cta-button">Contact Our Logistics Team</a></p>
        <p><a href="mailto:info@argusshipping.co">info@argusshipping.co</a> · <a href="tel:+97444116544">+974 44116544</a></p>
      </section>
      <aside aria-label="Related freight services">
        <h2>Plan the connected services</h2>
        <ul className="commercial-related">{page.related.map(id => <li key={id}><a href={serviceById[id].path}>{serviceById[id].label}</a></li>)}</ul>
        {!isRoute && <p>Importing from a sourcing market? <a href="/shipping/">Explore our shipping routes to Qatar</a>.</p>}
      </aside>
    </div>
  </article>;
}

export function ShippingRoutes() {
  return <article className="commercial-page">
    <header className="services-hero-section"><div className="container">
      <nav aria-label="Breadcrumb" className="commercial-breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Shipping Routes</li></ol></nav>
      <h1 className="services-hero-title">International Shipping Routes to Qatar</h1>
      <p className="services-hero-desc">Explore freight coordination through Argus Shipping’s listed sourcing and regional network. Each route brings together origin collection, freight options and Qatar delivery planning.</p>
    </div></header>
    <div className="container commercial-content"><div className="commercial-route-grid">{tradePages.map(page => <section key={page.path}>
      <h2><a href={page.path}>{page.h1}</a></h2><p>{page.intro}</p>
    </section>)}</div><p><a href="/services">Explore freight and logistics services</a> or <a href="/contact">discuss your shipment</a>.</p></div>
  </article>;
}
