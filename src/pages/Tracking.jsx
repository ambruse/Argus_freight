import ShipmentTracker from '../components/ShipmentTracker';
import { Package, ShieldCheck, Clock, Globe } from 'lucide-react';

export default function Tracking() {
  return (
    <div className="tracking-page">
      {/* Tracking Hero Header */}
      <section className="hero-section tracking-page-intro">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <span className="hero-subtitle" style={{ justifyContent: 'center' }}>
              <Globe size={16} /> Shipment progress, clearly reported
            </span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.75rem 0', color: 'var(--text-primary)' }}>
              Track Your Confirmed Shipment
            </h1>
            <p className="hero-description" style={{ margin: '0 auto 1.5rem auto' }}>
              Enter your shipment reference or Bill of Lading / AWB number to view the latest progress, recorded milestones and estimated arrival dates.
            </p>
          </div>
        </div>
      </section>

      {/* Main Tracker Container */}
      <section style={{ padding: '0 0 var(--section-space)' }}>
        <div className="container" style={{ maxWidth: '1050px' }}>
          <ShipmentTracker />

          {/* Benefits Feature Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginTop: 'var(--content-gap)'
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
                  Automatic Tracking Updates
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Your tracking view refreshes when our operations team saves new shipment information.
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
                  Recorded Shipment Milestones
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Follow dated updates shared by our team, including departure, customs clearance and delivery progress.
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
                  Clear Route and Schedule
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  See the recorded origin, destination and estimated schedule, with current location details when reported.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
