import ShipmentTracker from '../components/ShipmentTracker';
import { Package, ShieldCheck, Clock, Globe } from 'lucide-react';

export default function Tracking() {
  return (
    <div style={{ paddingTop: '5rem', minHeight: '80vh' }}>
      {/* Tracking Hero Header */}
      <section className="hero-section" style={{ padding: '3rem 0 2rem 0', minHeight: 'auto' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <span className="hero-subtitle" style={{ justifyContent: 'center' }}>
              <Globe size={16} /> Real-Time Freight Intelligence
            </span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.75rem 0', color: 'var(--text-primary)' }}>
              Track Cargo & RFQ Status
            </h1>
            <p className="hero-description" style={{ margin: '0 auto 1.5rem auto' }}>
              Enter your RFQ reference number or Bill of Lading to monitor real-time location, customs clearance updates, and estimated arrival times across Argus Shipping global routes.
            </p>
          </div>
        </div>
      </section>

      {/* Main Tracker Container */}
      <section style={{ padding: '1rem 0 4rem 0' }}>
        <div className="container" style={{ maxWidth: '1050px' }}>
          <ShipmentTracker />

          {/* Benefits Feature Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginTop: '3rem'
          }}>
            <div style={{
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}>
              <div style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                padding: '0.75rem',
                borderRadius: '12px'
              }}>
                <Clock size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-primary)', fontWeight: 700 }}>
                  24/7 Live Telematics
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Continuous GPS and port EDI telemetry updates directly synced from air carriers and container vessels.
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}>
              <div style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                padding: '0.75rem',
                borderRadius: '12px'
              }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Verified Customs Clearance
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Automated border inspection logs and digital clearance certificate tracking across GCC & international ports.
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}>
              <div style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                padding: '0.75rem',
                borderRadius: '12px'
              }}>
                <Package size={24} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Last-Mile Warehouse Transit
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  End-to-end visibility from bonded warehouse receipt to final consignee signature confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
