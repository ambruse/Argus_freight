import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import QuoteModal from './components/QuoteModal';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import WhyUs from './pages/WhyUs';
import Team from './pages/Team';
import Contact from './pages/Contact';
import Login from './pages/Login';
import ChairmanMessage from './pages/ChairmanMessage';
import { Mail, Phone, MapPin, Anchor } from 'lucide-react';

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname && window.location.pathname !== '/login' ? window.location.pathname : '/';
  });
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    // Default to dark mode (navy)
    return savedTheme !== 'light';
  });

  // Track hash fragment changes for in-page anchors
  useEffect(() => {
    const handleHashChange = () => {
      const Hash = window.location.hash;
      if (Hash) {
        // Simple hash-based navigation for /about#chairman or services
        if (Hash.startsWith('#chairman')) {
          setCurrentPath('/about');
          setTimeout(() => {
            document.getElementById('chairman')?.scrollIntoView({ behavior: 'smooth' });
          }, 300);
        } else if (Hash.startsWith('#')) {
          setCurrentPath('/services');
          setTimeout(() => {
            document.getElementById(Hash.substring(1))?.scrollIntoView({ behavior: 'smooth' });
          }, 300);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Trigger check on load
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update theme class on body element
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [isLoading, setIsLoading] = useState(false);

  // Scroll to top on page transition
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);

  const handleNavigate = (path) => {
    if (path === currentPath) return;
    setIsLoading(true);
    // Wait at least 350ms (minimum 250ms) to show loader
    setTimeout(() => {
      setCurrentPath(path);
      // Wait another 200ms for smooth rendering and fade-out
      setTimeout(() => {
        setIsLoading(false);
      }, 200);
    }, 350);
  };

  const handleOpenQuote = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("freight_token") : null;
    if (token) {
      window.location.href = '/customer/rfq/new';
    } else {
      setIsQuoteOpen(true);
    }
  };

  // Page Routing Switcher
  const renderPage = () => {
    switch (currentPath) {
      case '/':
        return <Home onNavigate={handleNavigate} onOpenQuote={handleOpenQuote} />;
      case '/about':
        return <About onNavigate={handleNavigate} />;
      case '/services':
        return <Services />;
      case '/why-us':
        return <WhyUs />;
      case '/team':
        return <Team />;
      case '/contact':
        return <Contact />;
      case '/chairman-message':
        return <ChairmanMessage />;
      case '/login':
        return <Login />;
      default:
        return <Home onNavigate={handleNavigate} onOpenQuote={handleOpenQuote} />;
    }
  };

  return (
    <div>
      {/* Page Loader Overlay */}
      <div className={`page-transition-loader ${isLoading ? 'active' : ''}`}>
        <div className="loader-content">
          <div className="loader-spinner">
            <div className="spinner-ring"></div>
            <img src="/images/light-logo.png" alt="Loading..." className="loader-logo" />
          </div>
          <span className="loader-text">Loading Supply Chain...</span>
        </div>
      </div>

      {/* Navbar Header */}
      <Navbar 
        currentPath={currentPath} 
        setCurrentPath={handleNavigate} 
        onOpenQuote={handleOpenQuote} 
        isDarkMode={isDarkMode} 
        setIsDarkMode={setIsDarkMode} 
      />

      {/* Main Page Area */}
      <main style={{ minHeight: '80vh' }}>
        {renderPage()}
      </main>

      {/* Floating request quote triggers */}
      <QuoteModal isOpen={isQuoteOpen} onClose={() => setIsQuoteOpen(false)} />

      {/* Global Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            {/* Brand column */}
            <div className="footer-brand">
              <div className="footer-logo" style={{ cursor: 'pointer' }} onClick={() => handleNavigate('/')}>
                <img 
                  src="/images/logo.png" 
                  alt="Argus Shipping WLL Logo" 
                  style={{ height: '42px', width: 'auto', display: 'block' }} 
                />
              </div>
              <p className="footer-desc">
                Leading freight management and logistics service provider. We offer global networks, tailored schedules, and border clearances to keep your supply chain running smoothly.
              </p>
            </div>

            {/* Quick links column */}
            <div>
              <h3 className="footer-title">Useful Links</h3>
              <ul className="footer-links-list">
                <li className="footer-link-item">
                  <span style={{ cursor: 'pointer' }} onClick={() => handleNavigate('/')}>Home</span>
                </li>
                <li className="footer-link-item">
                  <span style={{ cursor: 'pointer' }} onClick={() => handleNavigate('/about')}>About Corporate</span>
                </li>
                <li className="footer-link-item">
                  <span style={{ cursor: 'pointer' }} onClick={() => handleNavigate('/services')}>Logistics Services</span>
                </li>
                <li className="footer-link-item">
                  <span style={{ cursor: 'pointer' }} onClick={() => handleNavigate('/why-us')}>Why Argus</span>
                </li>
                <li className="footer-link-item">
                  <span style={{ cursor: 'pointer' }} onClick={() => handleNavigate('/team')}>Our Team</span>
                </li>
                <li className="footer-link-item">
                  <span style={{ cursor: 'pointer' }} onClick={() => handleNavigate('/contact')}>Contact Us</span>
                </li>
              </ul>
            </div>

            {/* Contact details column */}
            <div>
              <h3 className="footer-title">Contact Info</h3>
              <ul className="footer-contact-list">
                <li className="footer-contact-item">
                  <Mail size={18} />
                  <a href="mailto:info@argusshipping.co">info@argusshipping.co</a>
                </li>
                <li className="footer-contact-item">
                  <Phone size={18} />
                  <a href="tel:+97444116544">+974 44116544</a>
                </li>
                <li className="footer-contact-item">
                  <MapPin size={18} />
                  <span>Po Box 31861, Doha, Qatar</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom copyright segment */}
          <div className="footer-bottom">
            <div>
              <p>Copyright © {new Date().getFullYear()} Argus Shipping WLL. All rights reserved.</p>
            </div>
            <div className="footer-social-links">
              <a href="https://www.facebook.com/argusshipping" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Facebook">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="https://www.linkedin.com/company/argus-shipping" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
              <a href="https://www.instagram.com/argus_shipping/" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
