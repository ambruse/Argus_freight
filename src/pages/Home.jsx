import LogisticsSlider from '../components/LogisticsSlider';
import FreightRates from '../components/FreightRates';
import { GlobalNetworkSection } from '../components/GlobalNetwork';
import { serviceLinks, tradePages } from '../seo/commercial-pages.mjs';
import { Plane, Truck, Ship, ShieldCheck, Globe, Clock, ArrowRight, Anchor, Package, MapPin, TriangleAlert } from 'lucide-react';
import ShipmentTracker from '../components/ShipmentTracker';
import ScrollFrameBackground from '../components/ScrollFrameBackground';

const LOGISTICS_MODES = [
  {
    id: 'air',
    title: 'AIR FREIGHT',
    tagline: 'Time-Critical Air Shipments Worldwide',
    icon: Plane,
    description: 'In high-stakes logistics, every minute counts. We understand that speed is your primary metric—which is why our FIATA and IATA-accredited specialists deliver rapid, reliable air freight solutions engineered for ultimate time-sensitivity."'
  },
  {
    id: 'road',
    title: 'LAND FREIGHT',
    tagline: 'GCC-Wide Secure Road Transport network',
    icon: Truck,
    description: 'Navigate regional logistics with confidence. From full truckloads (FTL) to less-than-truckloads (LTL) across the GCC, our land transport network is powered by hands-on customs coordination and rapid border clearance to keep your freight on schedule.'
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
  },
  {
    id: 'dangerous-goods',
    title: 'DANGEROUS GOODS',
    tagline: 'Specialist Cargo Coordination & Shipment Review',
    icon: TriangleAlert,
    description: 'Plan dangerous goods freight with cargo-specific documentation, handling and carrier acceptance coordination. Share your shipment details for a review of suitable transport options, origin requirements and destination delivery.'
  }
];

const CLIENT_COMPANIES = [
  "Argus Middle East", "Argus Computers", "Argus shipping Bahrain",
  "Argus Dubai", "Shop N Freight", "Porters Trading", "Boxndoc.com", "Sourseco Global", "Jadwal Trading"
];

export default function Home({ onNavigate, onOpenQuote }) {

  return (
    <div className="home-page-wrapper">
      <ScrollFrameBackground />
      {/* Hero Banner Section */}
      <section className="hero-section">
        <div className="hero-blob-2" />
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy" style={{ animation: 'slideUp 0.8s ease', position: 'relative', zIndex: 5 }}>
              <span className="hero-subtitle">Logistics Management</span>
              <div className="hero-logo-container hero-logo-container-home">
                <img 
                  src="/images/argus_shipping_logo_hero.png" 
                  alt="ARGUS SHIPPING" 
                  className="hero-logo-img"
                />
              </div>
              <h1 className="hero-primary-heading">International Freight Forwarding &amp; Logistics</h1>
              <p className="hero-description">
                ARGUS SHIPPING delivers end-to-end freight and logistics solutions designed for today’s fast-paced global market. By combining worldwide reach, flexible scheduling, and deep border-clearance proficiency, we take the friction out of your supply chain.
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

            <LogisticsSlider modes={LOGISTICS_MODES} />
          </div>
        </div>
      </section>

      {/* Real-Time Shipment Tracker Section */}
      <section style={{ padding: '2rem 0', position: 'relative', zIndex: 10 }}>
        <div className="container" style={{ maxWidth: '1100px' }}>
          <ShipmentTracker />
        </div>
      </section>

      {/* Services Showcase */}
      <GlobalNetworkSection />
      <FreightRates />
      <section className="section-padding">
        <div className="container">
          <div className="section-header">
            <span className="section-subtitle">What We Do</span>
            <h2 className="section-title">International Freight Forwarding Services</h2>
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
                  <a href={serviceLinks[mode.id]}
                    className="read-more-link" 
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                      e.preventDefault();
                      if (onNavigate) {
                        onNavigate(serviceLinks[mode.id]);
                      } else {
                        window.location.pathname = serviceLinks[mode.id];
                      }
                    }}
                  >
                    Explore Details <ArrowRight size={16} />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Us Teaser Section */}
      <section className="section-padding section-bg-alt home-about-section">
        <div className="container">
          <div className="about-grid">
            <div className="about-image-wrapper">
              <video 
                src="/Videos/OHR.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="about-img-main" 
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              />
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
                The existence of ARGUS SHIPPING as a leading freight management and logistics service provider in the region, with a global presence of network partners, has set a new standard for this industry.
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
      <section className="section-padding home-why-section">
        <div className="container">
          <div className="section-header" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <span className="section-subtitle">Our Competitive Advantage</span>
            <h2 className="section-title">Why Logistics Leaders Choose Argus Shipping</h2>
            <p style={{ maxWidth: '800px', marginTop: '0.5rem' }}>
              All our logistics programs are custom-tailored to optimize time and budget constraint parameters. We combine robust freight capabilities with highly advanced warehousing nodes.
            </p>
          </div>

          <div className="why-grid">
            <div className="why-features">
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

            <div className="about-image-wrapper">
              <img src="/images/globe.png" alt="Integrated Global Network" className="about-img-main" />
            </div>
          </div>
        </div>
      </section>

      {/* International Warehouse Infrastructure Component */}
      <section id="global-infrastructure" className="seo-optimized-block">
        <div className="container">
          <h2>International Shipping from Key Global Markets</h2>
          <p className="infra-description">To power our signature door-to-door multi-modal distribution models, we operate standardized international warehouses across strategic production cities:</p>
          
          <ul className="warehouse-network-list">
            <li><strong>Guangzhou & Yuwei Hubs (China):</strong> High-capacity consolidation centers optimizing export workflows from the Pearl River Delta.</li>
            <li><strong>Mumbai & Bangalore Hubs (India):</strong> Strategic inland container packing and port-forwarding terminals.</li>
            <li><strong>Istanbul Hub (Turkey):</strong> Eurasian multi-modal transshipment and cross-docking facilities.</li>
            <li><strong>Dubai & Bahrain Hubs (GCC):</strong> Central regional deep-water port access and ambient/temperature-controlled distribution centers.</li>
          </ul>
          <p>Plan a shipment from {tradePages.map((page, index) => <span key={page.path}>{index > 0 ? ' · ' : ''}<a href={page.path}>{page.label}</a></span>)}.</p>
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
