import React from 'react';
import { Ship, Anchor, Users, Globe2 } from 'lucide-react';

export default function About({ onNavigate }) {
  return (
    <div className="services-page-container">
      {/* Banner */}
      <section className="section-padding" style={{ paddingBottom: '3rem', textAlign: 'center', background: 'radial-gradient(circle at top, rgba(245, 176, 55, 0.07) 0%, transparent 60%)' }}>
        <div className="container">
          <span className="section-subtitle font-gold">Corporate Overview</span>
          <h1 className="section-title" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>About Argus Shipping</h1>
          <p style={{ maxWidth: '680px', margin: '0 auto', fontSize: '1.1rem' }}>
            A leading force in global logistics, cargo relocation, and third-party freight management operations.
          </p>
        </div>
      </section>

      {/* Main Corporate Story */}
      <section className="section-padding" style={{ paddingTop: '3rem' }}>
        <div className="container">
          <div className="about-grid" style={{ gap: '4rem' }}>
            <div className="about-content">
              <h2 className="service-detailed-title" style={{ marginBottom: '1.5rem' }}>
                Leading Freight Management in the Region
              </h2>
              <p>
                The existence of **ARGUS SHIPPING WLL** as a leading freight management and logistics service provider in the region, with a global presence of network partners, has established a benchmark in this industry.
              </p>
              <p>
                With vast experience, we offer precisely what the international market requires. We are finely tuned to identify specific customer requirements and provide timely, effective solutions that guarantee customer satisfaction.
              </p>
              <p>
                Our logistical capabilities cover ocean cargo forwarding, air export/import coordination, border clearance, free zone distribution, relocation services, and customized heavy lift transport. Our experts advise customers on optimal configurations to achieve cost-effective or time-bound deliveries.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="service-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <Globe2 size={40} className="logo-gold" style={{ margin: '0 auto 1rem auto' }} />
                <h4>Global Presence</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Associated networks stretching across China, India, Turkey, UAE, and Bahrain.</p>
              </div>

              <div className="service-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <Users size={40} className="logo-gold" style={{ margin: '0 auto 1rem auto' }} />
                <h4>Specialist Teams</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>FIATA, IATA, and dangerous cargo certified teams managing freight nodes.</p>
              </div>

              <div className="service-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <Anchor size={40} className="logo-gold" style={{ margin: '0 auto 1rem auto' }} />
                <h4>Mega Facilities</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Standardized warehouses equipped with Amazon/Walmart grade ERP trackers.</p>
              </div>

              <div className="service-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <Ship size={40} className="logo-gold" style={{ margin: '0 auto 1rem auto' }} />
                <h4>Finished Logistics</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Automobile logistics and vehicle lashing managed by certified professionals.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chairman Message Teaser */}
      <section className="section-padding section-bg-alt">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">Leadership Perspective</span>
            <h2 className="section-title">Chairman's Message</h2>
          </div>

          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', background: 'var(--bg-card)', padding: '3.5rem', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
            <p style={{ fontSize: '1.25rem', fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: '2rem', lineHeight: '1.8' }}>
              "Since its inception, ARGUS SHIPPING WLL has grown into a multi-functional logistics organization. We always concentrate on our team’s capabilities and keep them focused on the essentials."
            </p>
            <h4 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Hassan Salem al Dosari</h4>
            <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2.5rem' }}>
              Chairman, Argus Shipping
            </p>
            <button className="cta-button" onClick={() => onNavigate('/chairman-message')}>
              Read Full Message
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
