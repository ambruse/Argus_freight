import React, { useState } from 'react';
import { Lock, Mail, Anchor, UserCheck, ShieldCheck, Compass, Check, ArrowRight, Layers, FileText } from 'lucide-react';

const MOCK_SHIPMENTS = [
  { id: 'ARG-2026-098', origin: 'Ningbo, China', destination: 'Doha, Qatar', status: 'In Transit', ETA: '2026-07-02', mode: 'Sea Freight (FCL)' },
  { id: 'ARG-2026-104', origin: 'Mumbai, India', destination: 'Hamad Port, Qatar', status: 'Customs Clearance', ETA: '2026-06-22', mode: 'Sea Freight (LCL)' },
  { id: 'ARG-2026-112', origin: 'Istanbul, Turkey', destination: 'Doha Int Airport, Qatar', status: 'Departed Hub', ETA: '2026-06-21', mode: 'Air Freight' }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [portalType, setPortalType] = useState('client'); // 'client' or 'agent'

  const handleLogin = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate active portal verification
    setTimeout(() => {
      setIsSubmitting(false);
      setIsLoggedIn(true);
    }, 1200);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
  };

  if (isLoggedIn) {
    return (
      <div className="services-page-container">
        <section className="section-padding" style={{ paddingBottom: '6rem' }}>
          <div className="container">
            {/* Dashboard Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <span className="section-subtitle">Secure Portal</span>
                <h1 className="section-title" style={{ fontSize: '2.5rem' }}>
                  {portalType === 'client' ? 'Client Cargo Console' : 'Agent Operations Terminal'}
                </h1>
                <p style={{ marginTop: '0.25rem' }}>Welcome back, {email || 'operator@argusshipping.co'}</p>
              </div>
              <button className="btn-secondary" onClick={handleLogout}>
                Disconnect Session
              </button>
            </div>

            {/* Simulated Dashboard Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '3rem' }}>
              {/* Sidebar Quick Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="service-card" style={{ padding: '2rem' }}>
                  <h4 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Portal Summary</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Active Shipments:</span>
                      <strong className="logo-gold">3</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Unpaid Invoices:</span>
                      <strong className="logo-gold">0</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Warehouse Receipts:</span>
                      <strong>14</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Compliance Checks:</span>
                      <span style={{ color: '#27ae60', fontWeight: 600 }}>Passed</span>
                    </div>
                  </div>
                </div>

                <div className="service-card" style={{ padding: '2rem' }}>
                  <h4 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Operations Desk</h4>
                  <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Need immediate support regarding customs approvals or route changes?</p>
                  <a href="tel:+97444116544" className="cta-button" style={{ display: 'block', textAlign: 'center', fontSize: '0.85rem' }}>
                    Call Support Hotline
                  </a>
                </div>
              </div>

              {/* Main Console Shipments */}
              <div className="service-card" style={{ padding: '2.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Compass className="logo-gold" /> Active Freight Consignments
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {MOCK_SHIPMENTS.map((shipment) => (
                    <div key={shipment.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{shipment.id}</span>
                          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '50px', background: 'rgba(172, 132, 80, 0.15)', color: 'var(--accent)', fontWeight: 600 }}>
                            {shipment.mode}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                          {shipment.origin} <ArrowRight size={12} style={{ display: 'inline', margin: '0 0.25rem' }} /> {shipment.destination}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e67e22' }}>
                          {shipment.status}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Est. Arrival: {shipment.ETA}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Anchor size={48} className="logo-gold" />
          </div>
          <h2 className="login-title">Argus Console</h2>
          <p className="login-subtitle">Access your logistics tracker and warehouse cargo records</p>
        </div>

        {/* Portal Switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '50px', padding: '0.25rem', marginBottom: '2rem' }}>
          <button 
            className={`filter-tab ${portalType === 'client' ? 'active' : ''}`}
            onClick={() => setPortalType('client')}
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', border: 'none' }}
          >
            Client Portal
          </button>
          <button 
            className={`filter-tab ${portalType === 'agent' ? 'active' : ''}`}
            onClick={() => setPortalType('agent')}
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', border: 'none' }}
          >
            Operations Agent
          </button>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Portal Username</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-email"
                type="email"
                required
                className="form-input"
                placeholder="client@company.com"
                style={{ width: '100%' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Access Code / Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                style={{ width: '100%' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="login-options">
            <label className="remember-me">
              <input type="checkbox" style={{ accentColor: 'var(--accent)' }} /> Remember this device
            </label>
            <span style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 500 }}>
              Reset Access Code
            </span>
          </div>

          <button type="submit" className="btn-submit" style={{ marginTop: '0.5rem' }} disabled={isSubmitting}>
            {isSubmitting ? 'Verifying Credentials...' : 'Authenticate Credentials'}
          </button>
        </form>
      </div>
    </div>
  );
}
