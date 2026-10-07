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
import Tracking from './pages/Tracking';
import CommercialPage, { ShippingRoutes } from './pages/CommercialPage';
import { byPath, normalizePath } from './seo/commercial-pages.mjs';
import { metadata as seoMetadata, schemaFor } from './seo/metadata.mjs';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function App({ initialPath }) {
  const [currentPath, setCurrentPath] = useState(() => {
    const requestedPath = normalizePath(initialPath || (typeof window !== 'undefined' ? window.location.pathname : '/'));
    if (requestedPath === '/services.html') return '/services';
    return requestedPath !== '/login' ? requestedPath : '/';
  });
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
    // Light is the public site's default; retain an explicit visitor preference.
    return savedTheme === 'dark';
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
        } else if (normalizePath(window.location.pathname) === '/services') {
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

  // Keep search and social metadata aligned with the currently rendered SPA route.
  useEffect(() => {
    const pageMetadata = seoMetadata;
    const metadataPath = pageMetadata[currentPath] ? currentPath : '/';
    const { title, description } = pageMetadata[metadataPath];
    if (currentPath === '/services' && window.location.pathname === '/services.html') {
      window.history.replaceState({}, '', '/services');
    }
    const canonicalUrl = `https://www.argusshipping.co${metadataPath === '/' ? '/' : metadataPath}`;
    document.title = title;

    const setMeta = (selector, attribute, value) => {
      let tag = document.head.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        const [name, key] = selector.match(/\[(name|property)="([^"]+)"\]/).slice(1);
        tag.setAttribute(name, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute(attribute, value);
    };
    const setCanonical = (href) => {
      let tag = document.head.querySelector('link[rel="canonical"]');
      if (!tag) {
        tag = document.createElement('link');
        tag.setAttribute('rel', 'canonical');
        document.head.appendChild(tag);
      }
      tag.setAttribute('href', href);
    };

    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:url"]', 'content', canonicalUrl);
    setCanonical(canonicalUrl);
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach(tag => tag.remove());
    const structuredData = document.createElement('script');
    structuredData.type = 'application/ld+json';
    structuredData.textContent = JSON.stringify(schemaFor(metadataPath));
    document.head.appendChild(structuredData);
  }, [currentPath]);

  // Keep browser back/forward navigation in sync with the lightweight page router.
  useEffect(() => {
    const handlePopState = () => setCurrentPath(normalizePath(window.location.pathname || '/'));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path) => {
    path = normalizePath(path);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
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
    if (byPath[currentPath]) return <CommercialPage page={byPath[currentPath]} />;
    if (currentPath === '/shipping/') return <ShippingRoutes />;
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
      case '/tracking':
        return <Tracking />;
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
            <img src="/images/logo.png" alt="Loading..." className="loader-logo" />
          </div>
          <span className="loader-text">Loading Supply Chain...</span>
        </div>
      </div>

      <Navbar
        currentPath={currentPath}
        setCurrentPath={handleNavigate}
        onOpenQuote={handleOpenQuote}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />

      {/* Main Page Area */}
      <main>
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
                  <a href="/">Home</a>
                </li>
                <li className="footer-link-item">
                  <a href="/about">About Corporate</a>
                </li>
                <li className="footer-link-item">
                  <a href="/services">Logistics Services</a>
                </li>
                <li className="footer-link-item">
                  <a href="/why-us">Why Argus</a>
                </li>
                <li className="footer-link-item">
                  <a href="/team">Our Team</a>
                </li>
                <li className="footer-link-item">
                  <a href="/contact">Contact Us</a>
                </li>
                <li className="footer-link-item"><a href="/shipping/">Shipping Routes</a></li>
              </ul>
            </div>

            {/* GCC & Global Offices for Local SEO Footprint */}
            <div className="footer-offices-col">
              <h3 className="footer-title">GCC & Global Offices</h3>
              <div className="footer-locations-grid">
                <div className="footer-location-card">
                  <h4 className="location-name">Argus Shipping W.L.L. (Doha HQ)</h4>
                  <div className="location-details-list">
                    <span className="location-detail-item">
                      <MapPin size={13} />
                      <a href="https://maps.app.goo.gl/DzzoydGjMrxuLGyTA">PO Box 31861, Doha, Qatar</a>
                    </span>
                    <span className="location-detail-item">
                      <Phone size={13} />
                      <a href="tel:+97444116544">+974 44116544</a>
                    </span>
                    <span className="location-detail-item">
                      <Mail size={13} />
                      <a href="mailto:info@argusshipping.co">info@argusshipping.co</a>
                    </span>
                  </div>
                </div>

                <div className="footer-location-card">
                  <h4 className="location-name">ARGUS SHIPPING LLC (Dubai Hub)</h4>
                  <div className="location-details-list">
                    <span className="location-detail-item">
                      <MapPin size={13} />
                      <a href="https://maps.app.goo.gl/s8U7472GjTtkFcwB7">Argus shipping LLC, Al Qusais industrial area 4, Warehouse no4, Dubai , UAE</a>
                    </span>
                    <span className="location-detail-item">
                      <Phone size={13} />
                      <a href="tel:+971564337699">+971 564337699</a>
                    </span>
                  </div>
                </div>

                <div className="footer-location-card">
                  <h4 className="location-name">ARGUS SHIPPING (China , Yiwu)</h4>
                  <div className="location-details-list">
                    <span className="location-detail-item">
                      <MapPin size={13} />
                      <a href="https://maps.app.goo.gl/Px3uwdUdALhsjQ8YA">Yiwu Xinalingke International Trade Co., Ltd. Room 1616, Jinmao Building, No. 699 Chouzhou North Road, Yiwu City, Zhejiang Province, China </a>
                    </span>
                    <span className="location-detail-item">
                      <Phone size={13} />
                      <a href="tel:+971564337699">+86579 85299672</a>
                    </span>
                  </div>
                </div>

                <div className="footer-location-card">
                  <h4 className="location-name">Argus shipping W.L.L Bahrain</h4>
                  <div className="location-details-list">
                    <span className="location-detail-item">
                      <MapPin size={13} />
                      <a href="https://maps.app.goo.gl/2uNuTu8JHas1GjwR8">Office 21, Building 2464, Road 2663, Block 226, Busaiteen , Bahrain</a>
                    </span>
                    <span className="location-detail-item">
                      <Phone size={13} />
                      <a href="tel:+97377034555">+97313641234</a>
                    </span>
                  </div>
                </div>

                <div className="footer-location-card">
                  <h4 className="location-name">ARGUS Shipping Guangzhou Hub (China)</h4>
                  <div className="location-details-list">
                    <span className="location-detail-item">
                      <MapPin size={13} />
                      <a href="https://maps.app.goo.gl/cbNtjkowDdjsaFGu6">Unit 101, Building C, No. 35 Dagang West Street, Baiyunhu Subdistrict, Baiyun District, Guangzhou</a>
                    </span>
                    <span className="location-detail-item">
                      <Phone size={13} />
                      <a href="tel:+8613719125564">+86 13719125564</a>
                    </span>
                  </div>
                </div>

                <div className="footer-location-card">
                  <h4 className="location-name">Tuticorin , INDIA</h4>
                  <div className="location-details-list">
                    <span className="location-detail-item">
                      <MapPin size={13} />
                      <a href="https://maps.app.goo.gl/ab6KFSwup9Y9szyn9">107/84/1E , Millerpuram, Tuticorin - 8,India</a>
                    </span>
                    <span className="location-detail-item">
                      <Phone size={13} />
                      <a href="tel:919095054575">+91 9095054575</a>
                    </span>
                  </div>
                </div>

                <div className="footer-location-card">
                  <h4 className="location-name">Nilambur , INDIA</h4>
                  <div className="location-details-list">
                    <span className="location-detail-item">
                      <MapPin size={13} />
                      <a href="https://maps.app.goo.gl/qUT9kmfmVcK9Nn9CA">Vk road,nilambur Opp - pg medical trust hospital Malappuram,India</a>
                    </span>
                    <span className="location-detail-item">
                      <Phone size={13} />
                      <a href="tel:919207062636">+91 9207062636</a>
                    </span>
                  </div>
                </div>
              </div>
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
