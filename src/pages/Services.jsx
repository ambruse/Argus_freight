import React, { useState } from 'react';
import { Plane, Truck, Ship, Archive, ShieldCheck, Compass, Car, Package, Layers, Move, Globe } from 'lucide-react';

const DETAILED_SERVICES = [
  {
    id: 'sea',
    category: 'freight',
    title: 'Sea Freight Operations',
    shortTitle: 'Sea Freight',
    icon: Ship,
    imgSrc: '/Videos/generate_a_Sea_Freight_Operati.mp4',
    description: 'We provide highly competitive sea freight rates and optimized vessel schedules for international cargo shipments. Our capabilities cover both Full Container Loads (FCL) and Less than Container Loads (LCL) import/export schemes.',
    extended: [
      'Highly competitive import & export contracts with major global steamship lines.',
      'Specialized FCL/LCL trade lanes covering Far East, Middle East, Europe, and Americas.',
      'Ex-Works logistics operations supported by over 2,000 global partner networks.',
      'Comprehensive customs coordination and destination port delivery programs.'
    ]
  },
  {
    id: 'air',
    category: 'freight',
    title: 'Air Freight Operations',
    shortTitle: 'Air Freight',
    icon: Plane,
    imgSrc: '/Videos/generaeta_a_Air_Freight_Operat.mp4',
    description: 'For time-critical shipments demanding expedited delivery schedules. We provide specialized handling for dangerous goods, temperature-sensitive items, and urgent air cargo.',
    extended: [
      'FIATA, IATA, and DGR (Dangerous Goods) certified staff handling procedures.',
      'Active management of approvals from the Ministry of Environment, Ministry of Chemicals, and Ministry of Standards.',
      'Airport-to-door transportation support, loading ramps, and specialized vehicle dispatches.',
      'Dedicated export consolidation warehouses situated near primary cargo terminals.'
    ]
  },
  {
    id: 'road',
    category: 'freight',
    title: 'Land Freight Operations',
    shortTitle: 'Land Freight',
    icon: Truck,
    imgSrc: '/Videos/land_freight.mp4',
    description: 'Cross-border transport networks across GCC countries, offering complete door-to-port and factory-to-consignee road shipping solutions.',
    extended: [
      'GCC-wide trucking network covering Full Truck Load (FTL) and Less than Truck Load (LTL) services.',
      'Customs clearance support and active agents deployed at all border checkpoints.',
      'Highly competitive ground shipping rates and real-time route optimization.',
      'Comprehensive cargo security measures for industrial, retail, and manufactured goods.'
    ]
  },
  {
    id: 'door-to-door',
    category: 'freight',
    title: 'Door-to-Door Consolidation',
    shortTitle: 'Door-to-Door',
    icon: Compass,
    imgSrc: '/Videos/Door_to_Door.mp4',
    description: 'A client-friendly shipping model tailored for low-volume cargo. We handle the entire supply chain from collection at the factory doorstep to final delivery.',
    extended: [
      'Per-CARTON / Per-CBM console freight rates to optimize shipping costs.',
      'Mega consolidation hubs operating in Guangzhou, Yiwu, Mumbai, Bangalore, Istanbul, Dubai, and Bahrain.',
      'Multi-supplier collection services to consolidate multiple items into single containers.',
      'End-to-end processing: cargo pickup, customs document preparation, container loading, and doorstep delivery.'
    ]
  },
  {
    id: 'vehicle',
    category: 'specialized',
    title: 'Finished Vehicle Logistics',
    shortTitle: 'Vehicle Logistics',
    icon: Car,
    imgSrc: '/Videos/Car_shipment.mp4',
    description: 'Specialized vehicle import/export logistics for automakers, dealers, and private owners. We combine advanced software with trained handling experts.',
    extended: [
      'International Automobile Logistics Organization trained lashing specialists.',
      'Customized car warehouses offering secure storage and paint/body preservation.',
      'Fleet of modern car carrier trucks and trailers for domestic movements.',
      'Error-free documentation management for customs logbooks and export licenses.'
    ]
  },
  {
    id: 'courier',
    category: 'specialized',
    title: 'Courier & Parcel Express',
    shortTitle: 'Courier / Parcel',
    icon: Package,
    imgSrc: '/Videos/Express.mp4',
    description: 'Speedy, secure shipping of corporate documents, sensitive packets, and individual parcels to destinations worldwide.',
    extended: [
      'Worldwide courier network covering documents and non-document packages.',
      'Doorstep pickup and custom packaging support at your desired hour.',
      'Full package tracking from collection to recipient signature.',
      'Flexible options: overnight express, economy courier, and medical cargo dispatches.'
    ]
  },
  {
    id: 'warehousing',
    category: 'storage',
    title: 'Standardized Warehousing Solutions',
    shortTitle: 'Warehousing',
    icon: Archive,
    imgSrc: '/Videos/Warehouse.mp4',
    description: 'High-capacity, temperature-controlled, and ambient storage solutions incorporating modern tracking systems and logistics standards.',
    extended: [
      'Amazon/Walmart grade ERP inventory tracking systems with barcoding integration.',
      'Ambient, temperature-regulated, chemical-compliant, and deep freeze segments.',
      'Government and international certification agency approved storage systems.',
      'Ample staging frontage accommodating heavy 360-degree loaders and container cranes.'
    ]
  },
  {
    id: 'transportation',
    category: 'storage',
    title: 'Fleet Transportation & Distribution',
    shortTitle: 'Transportation',
    icon: ShieldCheck,
    imgSrc: '/images/Transportation.jpg',
    description: 'Advanced fleet logistics providing secure transport and delivery fulfillment for all commercial shipping scales.',
    extended: [
      'Diverse modern fleet including reefer trucks, flatbeds, and heavy haulers.',
      'Real-time fleet tracking and dynamic routing for reliable delivery timelines.',
      'Factory-to-warehouse and warehouse-to-market distribution chains.',
      'Highest safety benchmarks and regular maintenance audits for vehicle fleets.'
    ]
  },
  {
    id: '3pl',
    category: 'storage',
    title: 'Third-Party Logistics (3PL)',
    shortTitle: '3PL Logistics',
    icon: Layers,
    imgSrc: '/images/3PL.jpg',
    description: 'Total supply chain management for international entities. Expand your regional presence with zero capital investment in warehouses or local employees.',
    extended: [
      'Integrated inventory storage, order fulfillment, and regional distribution.',
      'Direct distribution setup to hypermarkets, retail networks, and commercial camps.',
      'COD (Cash on Delivery) collections, payment reconciliation, and customs processing.',
      'Scalable logistics models designed to support growing yearly volumes.'
    ]
  },
  {
    id: 'relocation',
    category: 'specialized',
    title: 'Office & Household Relocation',
    shortTitle: 'Relocation',
    icon: Move,
    imgSrc: '/images/hero-cargo.png',
    description: 'Professional relocation services managed by trained packaging crews and heavy equipment operators.',
    extended: [
      'Specially trained 15-employee team dedicated solely to packing and relocations.',
      'Custom packing materials, heavy lifts, and tail-gate trucks to handle fragile loads.',
      'Coordination with international relocation alliances for global destination unpacks.',
      'Office, villa, and industrial equipment relocations with zero downtime.'
    ]
  }
];

export default function Services() {
  const [activeTab, setActiveTab] = useState('all');

  const filteredServices = activeTab === 'all'
    ? DETAILED_SERVICES
    : DETAILED_SERVICES.filter(s => s.category === activeTab);

  const getTabClass = (tab) => `filter-tab-pill ${activeTab === tab ? 'active-pill' : ''}`;

  return (
    <div className="services-page-container">
      {/* Premium Hero Banner */}
      <section className="services-hero-section">
        <div className="hero-radial-glow" />
        <div className="container relative z-10">
          <span className="services-hero-tag font-gold">Global Network Solutions</span>
          <h1 className="services-hero-title">Our Operational Services</h1>
          <p className="services-hero-desc">
            We operate a fully integrated cargo, freight forwarding, and warehousing network engineered to keep global supply chains moving without friction.
          </p>
        </div>
      </section>

      {/* Modern Interactive Filter Tabs */}
      <div className="container relative z-10">
        <div className="services-tabs-pill-row">
          <button className={getTabClass('all')} onClick={() => setActiveTab('all')}>
            <Globe size={16} />
            <span>All Services</span>
          </button>
          <button className={getTabClass('freight')} onClick={() => setActiveTab('freight')}>
            <Ship size={16} />
            <span>Freight & Cargo</span>
          </button>
          <button className={getTabClass('storage')} onClick={() => setActiveTab('storage')}>
            <Layers size={16} />
            <span>Warehousing & 3PL</span>
          </button>
          <button className={getTabClass('specialized')} onClick={() => setActiveTab('specialized')}>
            <ShieldCheck size={16} />
            <span>Specialized Services</span>
          </button>
        </div>

        {/* Premium Grid Layout */}
        <div className="services-showcase-grid">
          {filteredServices.map((service, index) => {
            const ServiceIcon = service.icon;
            return (
              <div key={service.id} className="premium-service-card" id={service.id}>
                
                {/* Image and Floating Icon / Badge */}
                <div className="premium-service-media">
                  {service.imgSrc.endsWith('.mp4') ? (
                    <video 
                      src={service.imgSrc} 
                      className="premium-service-img" 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    />
                  ) : (
                    <img src={service.imgSrc} alt={service.title} className="premium-service-img" />
                  )}
                  <div className="premium-service-img-overlay" />
                  <div className="premium-service-icon-floating">
                    <ServiceIcon size={22} />
                  </div>
                  <span className="premium-service-badge">
                    {service.category === 'freight' ? 'Freight' : service.category === 'storage' ? 'Storage & 3PL' : 'Specialized'}
                  </span>
                </div>

                {/* Content Details */}
                <div className="premium-service-content">
                  <div className="premium-service-header">
                    <span className="premium-service-node">LOGISTICS NODE</span>
                    <h2 className="premium-service-title">{service.title}</h2>
                  </div>
                  
                  <p className="premium-service-desc">{service.description}</p>
                  
                  <div className="premium-service-divider" />
                  
                  <ul className="premium-service-feature-list">
                    {service.extended.map((bullet, idx) => (
                      <li key={idx}>
                        <span className="feature-check-icon">✓</span>
                        <span className="feature-text">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
