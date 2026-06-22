import React from 'react';
import { Compass, Cpu, DollarSign, ShieldAlert, Award, Star } from 'lucide-react';

export default function WhyUs() {
  return (
    <div className="services-page-container">
      {/* Banner */}
      <section className="section-padding" style={{ paddingBottom: '3rem', textAlign: 'center', background: 'radial-gradient(circle at top, rgba(245, 176, 55, 0.07) 0%, transparent 60%)' }}>
        <div className="container">
          <span className="section-subtitle font-gold">Operational Advantages</span>
          <h1 className="section-title" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>Why Choose Argus Shipping</h1>
          <p style={{ maxWidth: '680px', margin: '0 auto', fontSize: '1.1rem' }}>
            We combine regional insights with global logistics infrastructure to lower your freight costs and delivery cycles.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="section-padding" style={{ paddingTop: '3rem', marginBottom: '4rem' }}>
        <div className="container">
          <div className="services-grid">
            
            <div className="service-card">
              <div className="service-icon-container">
                <Compass size={32} />
              </div>
              <h3 className="service-card-title">Expansive Global Networks</h3>
              <p className="service-card-desc">
                We maintain active shipping alliances and associated offices across Guangzhou, Yiwu, Mumbai, Bangalore, Istanbul, Dubai, and Bahrain. This enables seamless factory collections, consolidation, and border handovers.
              </p>
            </div>

            <div className="service-card">
              <div className="service-icon-container">
                <Cpu size={32} />
              </div>
              <h3 className="service-card-title">Amazon & Walmart Grade ERP</h3>
              <p className="service-card-desc">
                Our warehouses run recognized supply-chain ERP software. Integrated barcoding, real-time tracking, and active laser security systems prevent inventory missing issues and delivery delays.
              </p>
            </div>

            <div className="service-card">
              <div className="service-icon-container">
                <DollarSign size={32} />
              </div>
              <h3 className="service-card-title">Extremely Competitive Tariffs</h3>
              <p className="service-card-desc">
                Due to our high contract volumes with major ocean carriers and air cargo operators, we pass direct wholesale pricing benefits and priority space allocations to our clients.
              </p>
            </div>

            <div className="service-card">
              <div className="service-icon-container">
                <ShieldAlert size={32} />
              </div>
              <h3 className="service-card-title">FIATA & IATA Certified</h3>
              <p className="service-card-desc">
                Our logistics engineers hold FIATA, IATA, and DGR certifications. We handle complex customs approvals from environmental and standards ministries, ensuring compliance.
              </p>
            </div>

            <div className="service-card">
              <div className="service-icon-container">
                <Award size={32} />
              </div>
              <h3 className="service-card-title">Mega Facility Infrastructures</h3>
              <p className="service-card-desc">
                We operate warehousing structures with wide frontages for large 360-degree loaders. We maintain separate rooms for chemical goods, temperature controlled foodstuffs, and deep freeze cargo.
              </p>
            </div>

            <div className="service-card">
              <div className="service-icon-container">
                <Star size={32} />
              </div>
              <h3 className="service-card-title">Customer First Mentality</h3>
              <p className="service-card-desc">
                We believe in building long-lasting partnerships based on ethics. Our staff is available 24/7, providing transparent communications and real-time updates from booking to delivery.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
