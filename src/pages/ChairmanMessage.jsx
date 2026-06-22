import React from 'react';
import { User, Quote } from 'lucide-react';

export default function ChairmanMessage() {
  return (
    <div className="services-page-container">
      <section className="section-padding" style={{ paddingBottom: '3rem', textAlign: 'center', background: 'radial-gradient(circle at top, rgba(245, 176, 55, 0.07) 0%, transparent 60%)' }}>
        <div className="container">
          <span className="section-subtitle font-gold">Corporate Leadership</span>
          <h1 className="section-title" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>Chairman's Message</h1>
          <p style={{ maxWidth: '680px', margin: '0 auto', fontSize: '1.1rem' }}>
            Hassan Salem al Dosari outlines the foundational principles and vision of Argus Shipping WLL.
          </p>
        </div>
      </section>

      <section className="section-padding" style={{ paddingTop: '2rem', marginBottom: '6rem' }}>
        <div className="container">
          <div className="chairman-message-card" style={{ gridTemplateColumns: '0.8fr 1.2fr', margin: 0 }}>
            <div className="chairman-profile">
              <div className="chairman-avatar">
                HD
              </div>
              <h3 className="chairman-name">Hassan Salem al Dosari</h3>
              <span className="chairman-title">Chairman, Argus Shipping</span>
            </div>

            <div className="chairman-quote">
              <p style={{ marginBottom: '1rem', fontStyle: 'normal' }}>Dear Friends,</p>
              <p style={{ marginBottom: '1.25rem' }}>
                Since its inception, ARGUS SHIPPING WLL has grown into a highly multi-functional logistics organization. No business path is easy—that is why we concentrate on our team’s core capabilities, keeping them focused on the operational essentials.
              </p>
              <p style={{ marginBottom: '1.25rem' }}>
                For us, our core operational areas remain critical and important: cargo forwarding, warehousing, container transport, and border clearance. Excellence in these disciplines has been accomplished by the unwavering dedication of our staff and the support of our clients.
              </p>
              <p style={{ marginBottom: '1.5rem' }}>
                I extend my gratitude to everyone who has contributed to our journey of success. We welcome you to experience our logistical capability first-hand and communicate with us to explore how we can support your business growth.
              </p>
              <p style={{ fontWeight: 600, fontStyle: 'normal', color: 'var(--text-primary)' }}>
                Thanks and best regards, <br />
                <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>Hassan Salem al Dosari</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
