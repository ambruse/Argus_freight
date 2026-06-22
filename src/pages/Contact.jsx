import React, { useState } from 'react';
import { Phone, Mail, MapPin, Check, Send } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API dispatch
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 1500);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="services-page-container">
      {/* Banner */}
      <section className="section-padding" style={{ paddingBottom: '3rem', textAlign: 'center', background: 'radial-gradient(circle at top, rgba(245, 176, 55, 0.07) 0%, transparent 60%)' }}>
        <div className="container">
          <span className="section-subtitle font-gold">Global Inquiry</span>
          <h1 className="section-title" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>Contact Us</h1>
          <p style={{ maxWidth: '680px', margin: '0 auto', fontSize: '1.1rem' }}>
            Have questions about shipping routes, rates, or custom clearances? Get in touch with our operations desk.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="section-padding" style={{ paddingTop: '3rem', marginBottom: '6rem' }}>
        <div className="container">
          <div className="contact-grid">
            
            {/* Contact Details */}
            <div className="contact-info-card" style={{ justifyContent: 'center' }}>
              <div className="contact-detail-item">
                <div className="contact-icon">
                  <Phone size={24} />
                </div>
                <div>
                  <h4 className="contact-label-text">Phone Operations</h4>
                  <p className="contact-sub-text">
                    <a href="tel:+97444116544" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      +974 44116544
                    </a>
                  </p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Sunday to Thursday, 8:00 AM - 5:00 PM (AST)</p>
                </div>
              </div>

              <div className="contact-detail-item">
                <div className="contact-icon">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="contact-label-text">Email Correspondence</h4>
                  <p className="contact-sub-text">
                    <a href="mailto:info@argusshipping.co" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      info@argusshipping.co
                    </a>
                  </p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>We aim to respond to all email inquiries within 3 hours.</p>
                </div>
              </div>

              <div className="contact-detail-item">
                <div className="contact-icon">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="contact-label-text">Headquarters Address</h4>
                  <p className="contact-sub-text" style={{ fontWeight: 600 }}>
                    Po Box 31861, Doha, Qatar
                  </p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Industrial Area Main Branch, Logistics Zone 4</p>
                </div>
              </div>
            </div>

            {/* Contact Form Card */}
            <div>
              {isSuccess ? (
                <div className="contact-form-card" style={{ textAlign: 'center', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                  <div className="success-icon">
                    <Check size={48} />
                  </div>
                  <h2 className="section-title" style={{ fontSize: '1.75rem', marginTop: '1rem' }}>Message Transmitted</h2>
                  <p style={{ margin: '1rem 0 2rem 0', maxWidth: '320px' }}>
                    Thank you. Your message has been logged in our tracking queue. An officer will reply shortly.
                  </p>
                  <button className="cta-button" onClick={() => setIsSuccess(false)}>
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form-card">
                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-name">Full Name</label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      className="form-input"
                      placeholder="Jane Doe"
                      required
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-email">Email Address</label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      className="form-input"
                      placeholder="jane@company.com"
                      required
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-subject">Inquiry Subject</label>
                    <input
                      id="contact-subject"
                      type="text"
                      name="subject"
                      className="form-input"
                      placeholder="e.g., Sea Freight Tariffs to Shanghai"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="contact-message">Detailed Message</label>
                    <textarea
                      id="contact-message"
                      name="message"
                      className="form-textarea"
                      placeholder="Provide all specific dimensions, destinations, or services of interest..."
                      required
                      value={formData.message}
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  <button type="submit" className="cta-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={isSubmitting}>
                    {isSubmitting ? 'Transmitting Message...' : (
                      <>
                        <Send size={18} /> Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
