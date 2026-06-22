import React, { useState, useEffect } from 'react';
import { X, Check, Send } from 'lucide-react';

export default function QuoteModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', service: '', message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess,    setIsSuccess]    = useState(false);
  const [isLoggedIn,   setIsLoggedIn]   = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      window.addEventListener('keydown', handler);
      // Check session
      const token = localStorage.getItem("freight_token");
      setIsLoggedIn(!!token);
    }
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFormData({ name: '', email: '', phone: '', service: '', message: '' });
    }, 1500);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {!isLoggedIn ? (
          <>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Account Required</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Create an account or log in to request a quote
                </p>
              </div>
              <button className="modal-close" onClick={onClose} title="Close">×</button>
            </div>

            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60,
                borderRadius: '16px',
                background: 'rgba(245,176,55,0.08)',
                border: '1px solid rgba(245,176,55,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
                color: '#F5B037',
                fontSize: '1.8rem',
                boxShadow: '0 0 15px rgba(245,176,55,0.1)'
              }}>
                ✦
              </div>
              <h4 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                Account Required to Request a Quote
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                To submit this quote request and securely connect with our team, please log in to your account. If you are new to our platform, registration only takes a moment.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="cta-button" onClick={() => window.location.href = '/login'} style={{ minWidth: '120px', justifyContent: 'center' }}>
                  Log in
                </button>
                <button className="btn-secondary" onClick={() => window.location.href = '/register?role=customer'} style={{ minWidth: '120px', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '0.88rem', fontWeight: 600, border: '1px solid var(--glass-border)', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(245,176,55,0.06)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Register
                </button>
              </div>
            </div>
          </>
        ) : isSuccess ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{
              width: 72, height: 72,
              borderRadius: '50%',
              background: 'rgba(16,185,129,0.10)',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#10B981',
            }}>
              <Check size={36} />
            </div>
            <h3 className="modal-title" style={{ marginBottom: '0.75rem' }}>Quote Requested!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: 320, margin: '0 auto 2rem' }}>
              Thank you for choosing Argus Shipping. Our logistics representative will contact you within 24 hours.
            </p>
            <button className="cta-button" onClick={() => { setIsSuccess(false); onClose(); }}>
              Close Window
            </button>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Request a Quote</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Powered by our global logistics network
                </p>
              </div>
              <button className="modal-close" onClick={onClose} title="Close">×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="quote-name">Full Name</label>
                <input id="quote-name" type="text" name="name" className="form-input"
                  placeholder="John Doe" required value={formData.name} onChange={handleChange} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="quote-email">Email</label>
                  <input id="quote-email" type="email" name="email" className="form-input"
                    placeholder="john@example.com" required value={formData.email} onChange={handleChange} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="quote-phone">Phone</label>
                  <input id="quote-phone" type="tel" name="phone" className="form-input"
                    placeholder="+974 5541 2345" required value={formData.phone} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="quote-service">Service Required</label>
                <select id="quote-service" name="service" className="form-input"
                  required value={formData.service} onChange={handleChange}
                  style={{ appearance: 'none' }}
                >
                  <option value="" disabled>Select a logistics service...</option>
                  <option value="Sea Freight">Sea Freight (FCL / LCL)</option>
                  <option value="Air Freight">Air Freight</option>
                  <option value="Land Freight">Land Freight (GCC Roadways)</option>
                  <option value="Door to Door Console">Door-to-Door Console Shipments</option>
                  <option value="Vehicle Logistics">Vehicle Export / Import Logistics</option>
                  <option value="Warehousing">Ambient &amp; Cold Storage Warehousing</option>
                  <option value="Transportation">Local Fleet &amp; Delivery Fleet</option>
                  <option value="3PL Services">Third-Party Logistics (3PL)</option>
                  <option value="Relocation">Relocation Services</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="quote-message">Shipment Details</label>
                <textarea id="quote-message" name="message" className="form-textarea"
                  placeholder="Describe cargo volume, weight, dimensions, origin, and destination..."
                  required value={formData.message} onChange={handleChange}
                  style={{ minHeight: '110px' }}
                />
              </div>

              <button type="submit" className="cta-button" disabled={isSubmitting}
                style={{ justifyContent: 'center', marginTop: '0.5rem' }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  <><Send size={16} /> Submit Quote Request</>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        .spin { animation: spinAnim 0.8s linear infinite; }
        @keyframes spinAnim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
