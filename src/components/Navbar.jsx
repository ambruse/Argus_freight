import React, { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, ChevronDown, Anchor, Phone, Mail } from 'lucide-react';

export default function Navbar({ currentPath, setCurrentPath, onOpenQuote, isDarkMode, setIsDarkMode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [showNavbarLogo, setShowNavbarLogo] = useState(true);

  // Monitor scrolling to add shadow/elevation and handle home page logo visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (currentPath === '/') {
        const heroLogo = document.querySelector('.hero-logo-container');
        if (heroLogo) {
          const rect = heroLogo.getBoundingClientRect();
          setShowNavbarLogo(rect.bottom <= 0);
        } else {
          setShowNavbarLogo(window.scrollY > 350);
        }
      } else {
        setShowNavbarLogo(true);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPath]);

  // Check login status once on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("freight_token") : null;
    setIsLoggedIn(!!token);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleNavigate = (path) => {
    setCurrentPath(path);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className={`navbar-wrapper ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-top-bar">
        <div className="container top-bar-container">
          <div className="top-bar-left">
            <div className="phone-dropdown-wrapper">
              <div className="top-bar-link phone-trigger">
                <Phone size={14} />
                <span>Phone</span>
                <ChevronDown size={12} className="chevron-icon" />
              </div>
              <div className="phone-dropdown-menu">
                <a href="tel:+97444116544" className="phone-dropdown-item">
                  <span className="country-name">Qatar</span>
                  <span className="phone-number">+974 44116544</span>
                </a>
                <a href="tel:+8613719125564" className="phone-dropdown-item">
                  <span className="country-name">China</span>
                  <span className="phone-number">+86 13719125564</span>
                </a>
                <a href="tel:+971564337699" className="phone-dropdown-item">
                  <span className="country-name">UAE</span>
                  <span className="phone-number">+971 564337699</span>
                </a>
                <a href="tel:97377034555" className="phone-dropdown-item">
                  <span className="country-name">Bahrain</span>
                  <span className="phone-number">+973 77034555</span>
                </a>
                <a href="tel:+9197423798388" className="phone-dropdown-item">
                  <span className="country-name">India</span>
                  <span className="phone-number">+91 9742379838</span>
                </a>
              </div>
            </div>
            
            <span className="top-bar-separator">|</span>
            
            <a href="mailto:info@argusshipping.co" className="top-bar-link">
              <Mail size={14} />
              <span>info@argusshipping.co</span>
            </a>
            
            <span className="top-bar-separator">|</span>
            
            <div className="top-bar-socials">
              <a href="https://www.instagram.com/argus_shipping/" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://www.linkedin.com/company/argus-shipping" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
              <a href="https://www.facebook.com/argusshipping" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="Facebook">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="https://api.whatsapp.com/send/?phone=97455411234&text&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>
          
          <div className="top-bar-right">
            <span className="top-bar-text">Reliable Freight & Logistics Solutions</span>
          </div>
        </div>
      </div>

      <div className="container">
        <nav className="navbar">
          {/* Logo Brand */}
          <div 
            className="logo-container" 
            onClick={() => handleNavigate('/')}
            style={{
              opacity: showNavbarLogo ? 1 : 0,
              visibility: showNavbarLogo ? 'visible' : 'hidden',
              pointerEvents: showNavbarLogo ? 'auto' : 'none',
              transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s'
            }}
          >
            <img 
              src={isDarkMode ? "/images/light-logo.png" : "/images/logo.png"} 
              alt="Argus Shipping WLL Logo" 
              className="navbar-logo"
            />
          </div>

          {/* Desktop Menu */}
          <ul className={`nav-menu ${isMobileMenuOpen ? 'open' : ''}`}>
            <li className="nav-item">
              <span 
                className={`nav-link ${currentPath === '/' ? 'active' : ''}`} 
                onClick={() => handleNavigate('/')}
              >
                Home
              </span>
            </li>
            
            <li className="nav-item">
              <span className={`nav-link ${currentPath === '/about' || currentPath === '/chairman-message' ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                About Us <ChevronDown size={14} />
              </span>
              <div className="dropdown-menu">
                <span className="dropdown-item" onClick={() => handleNavigate('/about')}>About Argus</span>
                <span className="dropdown-item" onClick={() => handleNavigate('/chairman-message')}>Chairman's Message</span>
              </div>
            </li>

            <li className="nav-item">
              <span 
                className={`nav-link ${currentPath === '/services' ? 'active' : ''}`} 
                onClick={() => handleNavigate('/services')}
              >
                Services
              </span>
            </li>

            <li className="nav-item">
              <span 
                className={`nav-link ${currentPath === '/why-us' ? 'active' : ''}`} 
                onClick={() => handleNavigate('/why-us')}
              >
                Why Us
              </span>
            </li>

            <li className="nav-item">
              <span 
                className={`nav-link ${currentPath === '/team' ? 'active' : ''}`} 
                onClick={() => handleNavigate('/team')}
              >
                Our Team
              </span>
            </li>

            <li className="nav-item">
              <span className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                Group Companies <ChevronDown size={14} />
              </span>
              <div className="dropdown-menu">
                <a href="http://www.argusme.com/" target="_blank" rel="noopener noreferrer" className="dropdown-item">Argus Middle East Doha</a>
                <a href="http://www.arguscomputers.net/" target="_blank" rel="noopener noreferrer" className="dropdown-item">Argus Computers Doha</a>
                <a href="http://www.argusmeast.com/" target="_blank" rel="noopener noreferrer" className="dropdown-item">Argus Bahrain</a>
                <a href="http://www.argus-me.com/" target="_blank" rel="noopener noreferrer" className="dropdown-item">Argus General Trading Dubai</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item">Shop N Freight</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item">Porters Trading</a>
                <a href="http://boxndoc.com/" target="_blank" rel="noopener noreferrer" className="dropdown-item">Boxndoc.com</a>
                <a href="http://www.sourseglobal.com/" target="_blank" rel="noopener noreferrer" className="dropdown-item">Sourseco Global</a>
              </div>
            </li>

            <li className="nav-item">
              <span 
                className={`nav-link ${currentPath === '/contact' ? 'active' : ''}`} 
                onClick={() => handleNavigate('/contact')}
              >
                Contact
              </span>
            </li>

            <li className="nav-item">
              <span 
                className={`nav-link ${currentPath === '/login' || currentPath === '/dashboard' ? 'active' : ''}`} 
                onClick={() => window.location.href = isLoggedIn ? '/dashboard' : '/login'}
              >
                {isLoggedIn ? 'Dashboard' : 'Login'}
              </span>
            </li>
          </ul>

          {/* Action elements (Theme Switcher, CTA & Hamburger) */}
          <div className="nav-actions">
            <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="cta-button" onClick={onOpenQuote}>
              Request Quote
            </button>
            <button className="mobile-nav-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
