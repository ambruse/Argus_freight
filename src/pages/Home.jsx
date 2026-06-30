import React, { useState, useEffect } from 'react';
import { Plane, Truck, Ship, ShieldCheck, Globe, Clock, ArrowRight, PhoneCall, Mail, Anchor, Package, MapPin } from 'lucide-react';

const LOGISTICS_MODES = [
  {
    id: 'air',
    title: 'AIR FREIGHT',
    tagline: 'Time-Critical Air Shipments Worldwide',
    icon: Plane,
    description: 'We know that the main priority of clients requiring air freight services is getting their cargo delivered within a short time limit. Time-sensitive cargo demands FIATA and IATA-certified logistics specialists.'
  },
  {
    id: 'road',
    title: 'LAND FREIGHT',
    tagline: 'GCC-Wide Secure Road Transport network',
    icon: Truck,
    description: 'Our land transport solutions cover full truckloads (FTL) and less-than-truckloads (LTL) between GCC countries, backed by active customs coordination and border clearance expertise.'
  },
  {
    id: 'sea',
    title: 'SEA FREIGHT',
    tagline: 'Global Ocean Freight Solutions (FCL & LCL)',
    icon: Ship,
    description: 'We offer flexible ocean shipping services with optimized routes and competitive contracts. Specialized in both Full Container Load (FCL) and Less than Container Load (LCL) logistics.'
  },
  {
    id: 'warehouse',
    title: 'WAREHOUSING',
    tagline: 'Secure Storage & Advanced Inventory Control',
    icon: Package,
    description: 'Our modern warehousing facilities offer comprehensive cargo storage, consolidation, and inventory control. Equipped with 24/7 security monitoring, advanced sorting systems, and flexible retrieval plans.'
  },
  {
    id: 'doortodoor',
    title: 'DOOR-TO-DOOR',
    tagline: 'End-to-End Seamless Cargo Relocations',
    icon: MapPin,
    description: 'From your doorstep directly to the final destination, we manage the entire logistics chain. Includes professional packing, local customs clearance, global transport, and last-mile delivery.'
  }
];

const CLIENT_COMPANIES = [
  "Argus Middle East", "Argus Computers", "Argus Bahrain", 
  "Argus Dubai", "Shop N Freight", "Porters Trading", "Boxndoc.com", "Sourseco Global"
];

export default function Home({ onNavigate, onOpenQuote }) {
  const [activeModeIdx, setActiveModeIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate logistics modes in the hero graphic
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveModeIdx(prev => (prev + 1) % LOGISTICS_MODES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const ActiveIcon = LOGISTICS_MODES[activeModeIdx].icon;

  return (
    <div>
      {/* Advanced JSON-LD Schema (Structured Data Component) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: `
{
  "@context": "https://schema.org",
  "@type": "CargoShippingService",
  "name": "Argus Shipping W.L.L",
  "url": "https://argusshipping.co/",
  "logo": "https://argusshipping.co/images/logo.png",
  "description": "Premium international freight forwarding, ocean & air cargo, 3PL warehousing, and door-to-door console cargo consolidation services based in Doha, Qatar.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "P.O. Box 31861",
    "addressLocality": "Doha",
    "addressCountry": "QA"
  },
  "telephone": "+97444116544",
  "email": "info@argusshipping.co",
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Logistics Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Sea Freight FCL & LCL Consolidation"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "International Air Cargo Services"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Door to Door Console Shipments (Per-CBM/Per-Carton)"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "3PL Warehousing & Distribution Management"
        }
      }
    ]
  },
  "areaServed": [
    { "@type": "Country", "name": "Qatar" },
    { "@type": "Country", "name": "United Arab Emirates" },
    { "@type": "Country", "name": "Bahrain" },
    { "@type": "Country", "name": "India" }
  ]
}
          `
        }}
      />

      {/* Hero Banner Section */}
      <section className="hero-section">
        <div className="hero-blob-2" />
        <div className="container">
          <div className="hero-grid">
            <div style={{ animation: 'slideUp 0.8s ease', position: 'relative', zIndex: 5 }}>
              <span className="hero-subtitle">Premium Logistics Management</span>
              <div className="hero-logo-container">
                <img 
                  src="/images/argus_shipping_logo_hero.png" 
                  alt="ARGUS SHIPPING" 
                  className="hero-logo-img"
                />
              </div>
              <p className="hero-description">
                ARGUS SHIPPING WLL is a premier freight management and logistics service provider. We offer global network capabilities, tailored transport schedules, and border clearance expertise to keep your supply chain seamless.
              </p>
              <div className="hero-actions">
                <button className="cta-button" onClick={onOpenQuote}>
                  Request A Quote
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (onNavigate) {
                      onNavigate('/services');
                    } else {
                      window.location.pathname = '/services';
                    }
                  }}
                >
                  Our Services
                </button>
              </div>
              <div className="hero-stats">
                <div>
                  <div className="hero-stat-value">15+</div>
                  <div className="hero-stat-label">Years Active</div>
                </div>
                <div>
                  <div className="hero-stat-value">2k+</div>
                  <div className="hero-stat-label">Global Partners</div>
                </div>
                <div>
                  <div className="hero-stat-value">100%</div>
                  <div className="hero-stat-label">Delivery Rate</div>
                </div>
              </div>
            </div>

            {/* Circular Rotating Graphic */}
            <div 
              className="slider-graphics"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="slider-circle-bg">
                {LOGISTICS_MODES.map((mode, idx) => {
                  const Angle = (idx * 360) / LOGISTICS_MODES.length;
                  const ModeIcon = mode.icon;
                  const isActive = idx === activeModeIdx;
                  return (
                    <div 
                      key={mode.id} 
                      className={`slider-orbit-icon ${isActive ? 'active' : ''}`}
                      style={{
                        transform: `rotate(${Angle}deg) translate(200px) rotate(-${Angle}deg)`,
                      }}
                      onMouseEnter={() => setActiveModeIdx(idx)}
                      onClick={() => setActiveModeIdx(idx)}
                    >
                      <div className="slider-orbit-icon-gimbal">
                        <ModeIcon size={24} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="slider-inner-graphic">
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <ActiveIcon className="slider-icon-active" />
                  <h4 style={{ color: 'var(--accent)', marginTop: '1rem', letterSpacing: '0.05em' }}>
                    {LOGISTICS_MODES[activeModeIdx].title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {LOGISTICS_MODES[activeModeIdx].tagline}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Showcase */}
      <section className="section-padding">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">What We Do</span>
            <h2 className="section-title">Core Shipping Services</h2>
          </div>

          <div className="services-grid">
            {LOGISTICS_MODES.map((mode) => {
              const CardIcon = mode.icon;
              return (
                <div key={mode.id} className="service-card">
                  <div className="service-icon-container">
                    <CardIcon size={32} />
                  </div>
                  <h3 className="service-card-title">{mode.title}</h3>
                  <p className="service-card-desc">{mode.description}</p>
                  <span 
                    className="read-more-link" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (onNavigate) {
                        onNavigate('/services');
                      } else {
                        window.location.pathname = '/services';
                      }
                    }}
                  >
                    Explore Details <ArrowRight size={16} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Us Teaser Section */}
      <section className="section-padding section-bg-alt">
        <div className="container">
          <div className="about-grid">
            <div className="about-image-wrapper">
              <img src="/images/hero-cargo.png" alt="Global Supply Chain Operations" className="about-img-main" />
              <div className="about-img-overlay">
                <h4>15+ Years</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem' }}>
                  Providing seamless logistics management and domestic and international cargo services.
                </p>
              </div>
            </div>

            <div className="about-content">
              <span className="section-subtitle">Corporate Profile</span>
              <h2 className="section-title">About Argus Shipping</h2>
              <p>
                The existence of ARGUS SHIPPING WLL as a leading freight management and logistics service provider in the region, with a global presence of network partners, has set a new standard for this industry.
              </p>
              <p>
                With vast experience, we identify custom customer needs and deliver timely, effective solutions. We handle complex cargo, border clearances, free zone forwarding, and heavy lift setups.
              </p>

              <div className="about-stats">
                <div className="stat-item">
                  <div className="stat-number">2k+</div>
                  <div className="stat-label">Global Partners</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">100%</div>
                  <div className="stat-label">Delivery Rate</div>
                </div>
              </div>

              <button 
                className="cta-button" 
                style={{ alignSelf: 'flex-start', marginTop: '1.5rem' }} 
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigate) {
                    onNavigate('/about');
                  } else {
                    window.location.pathname = '/about';
                  }
                }}
              >
                Read Corporate Story
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Teaser */}
      <section className="section-padding">
        <div className="container">
          <div className="why-grid">
            <div className="about-content">
              <span className="section-subtitle">Our Competitive Advantage</span>
              <h2 className="section-title">Why Logistics Leaders Choose Argus WLL</h2>
              <p>
                All our logistics programs are custom-tailored to optimize time and budget constraint parameters. We combine robust freight capabilities with highly advanced warehousing nodes.
              </p>
              <div className="why-features" style={{ marginTop: '1.5rem' }}>
                <div className="why-feature-item">
                  <div className="why-feature-icon"><Globe size={24} /></div>
                  <div>
                    <h4 className="why-feature-title">Expansive Network Nodes</h4>
                    <p className="why-feature-desc">Alliances in primary import hubs including India, China, Turkey, and Europe.</p>
                  </div>
                </div>
                <div className="why-feature-item">
                  <div className="why-feature-icon"><ShieldCheck size={24} /></div>
                  <div>
                    <h4 className="why-feature-title">End-to-End Compliance</h4>
                    <p className="why-feature-desc">Strict compliance with environmental, Ministry of Standards, and dangerous goods guidelines.</p>
                  </div>
                </div>
                <div className="why-feature-item">
                  <div className="why-feature-icon"><Clock size={24} /></div>
                  <div>
                    <h4 className="why-feature-title">Time Sensitive Delivery</h4>
                    <p className="why-feature-desc">Dynamic route calculation and advanced monitoring for expedited dispatch programs.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="about-image-wrapper">
              <img src="/images/globe.png" alt="Integrated Global Network" className="about-img-main" />
            </div>
          </div>
        </div>
      </section>

      {/* International Warehouse Infrastructure Component */}
      <section id="global-infrastructure" className="seo-optimized-block">
        <div className="container">
          <h2>Our Global Consolidation Hubs & Logistics Infrastructure</h2>
          <p className="infra-description">To power our signature door-to-door multi-modal distribution models, we operate standardized international warehouses across strategic production cities:</p>
          
          <ul className="warehouse-network-list">
            <li><strong>Guangzhou & Yuwei Hubs (China):</strong> High-capacity consolidation centers optimizing export workflows from the Pearl River Delta.</li>
            <li><strong>Mumbai & Bangalore Hubs (India):</strong> Strategic inland container packing and port-forwarding terminals.</li>
            <li><strong>Istanbul Hub (Turkey):</strong> Eurasian multi-modal transshipment and cross-docking facilities.</li>
            <li><strong>Dubai & Bahrain Hubs (GCC):</strong> Central regional deep-water port access and ambient/temperature-controlled distribution centers.</li>
          </ul>
        </div>
      </section>

      {/* Group Companies Marquee */}
      <div className="marquee-container">
        <div className="marquee-content">
          {/* Double content to allow infinite scrolling effect */}
          {[...CLIENT_COMPANIES, ...CLIENT_COMPANIES].map((name, index) => (
            <div key={index} className="marquee-item">
              <Anchor size={18} style={{ color: 'var(--accent)' }} /> {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
