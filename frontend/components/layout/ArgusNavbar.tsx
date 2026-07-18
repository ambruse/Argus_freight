"use client";

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, ChevronDown, Phone, Mail } from 'lucide-react';
import '../../app/argus-navbar.css';

import { usePathname } from 'next/navigation';

export default function ArgusNavbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default dark for FreightOS

  useEffect(() => {
    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
      setIsDarkMode(isDark);
    };
    
    // Check initial theme
    handleThemeChange();
    window.addEventListener('themeChanged', handleThemeChange);
    
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const htmlElement = document.documentElement;
      const isCurrentlyDark = htmlElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
      const nextDark = !isCurrentlyDark;
      if (nextDark) {
        htmlElement.classList.add('dark');
        htmlElement.classList.remove('light');
        localStorage.setItem('theme', 'dark');
      } else {
        htmlElement.classList.remove('dark');
        htmlElement.classList.add('light');
        localStorage.setItem('theme', 'light');
      }
      window.dispatchEvent(new Event('themeChanged'));
    }
  };

  if (pathname !== '/login' && pathname !== '/register') {
    return null;
  }

  const currentPath = pathname as string; // Next.js is only serving login/register public paths

  return (
    <>
      {/* Spacer to prevent content from hiding behind the fixed navbar */}
      <div style={{ height: '130px' }} />
      <div className="argus-navbar-vars">
        <header className={`navbar-wrapper ${isScrolled ? 'scrolled' : ''}`}>
          {/* Top Contact Bar */}
          <div className="navbar-top-bar">
            <div className="argus-container top-bar-container">
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

          <div className="argus-container">
            <nav className="argus-navbar">
              {/* Logo Brand */}
              <a href="/" className="logo-container" style={{ textDecoration: 'none' }}>
                <img 
                  src={isDarkMode ? "/images/light-logo.png" : "/images/logo.png"} 
                  alt="Argus Shipping WLL Logo" 
                  style={{ height: '48px', width: 'auto', display: 'block', transition: 'all 0.2s ease' }} 
                />
              </a>

              {/* Desktop Menu */}
              <ul className={`nav-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                <li className="nav-item">
                  <a href="/" className={`nav-link ${currentPath === '/' ? 'active' : ''}`}>
                    Home
                  </a>
                </li>
                
                <li className="nav-item">
                  <span className={`nav-link`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    About Us <ChevronDown size={14} />
                  </span>
                  <div className="dropdown-menu">
                    <a href="/about" className="dropdown-item">About Argus</a>
                    <a href="/chairman-message" className="dropdown-item">Chairman's Message</a>
                  </div>
                </li>

                <li className="nav-item">
                  <a href="/services" className={`nav-link ${currentPath === '/services' ? 'active' : ''}`}>
                    Services
                  </a>
                </li>

                <li className="nav-item">
                  <a href="/why-us" className={`nav-link ${currentPath === '/why-us' ? 'active' : ''}`}>
                    Why Us
                  </a>
                </li>

                <li className="nav-item">
                  <a href="/team" className={`nav-link ${currentPath === '/team' ? 'active' : ''}`}>
                    Our Team
                  </a>
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
                    <a href="http://fanartech.me/" target="_blank" rel="noopener noreferrer" className="dropdown-item">Fanar Tech Contracting</a>
                    <a href="http://www.thezippco.com/" target="_blank" rel="noopener noreferrer" className="dropdown-item">Zippco Trading WLL</a>
                    <a href="http://www.wemacglobal.com/" target="_blank" rel="noopener noreferrer" className="dropdown-item">Wemac Global Ltd Malaysia</a>
                    <a href="http://www.sourseglobal.com/" target="_blank" rel="noopener noreferrer" className="dropdown-item">Sourseco Global</a>
                  </div>
                </li>

                <li className="nav-item">
                  <a href="/contact" className={`nav-link ${currentPath === '/contact' ? 'active' : ''}`}>
                    Contact
                  </a>
                </li>

                <li className="nav-item">
                  <a href="/login" className={`nav-link ${currentPath === '/login' ? 'active' : ''}`}>
                    Login
                  </a>
                </li>

                {/* Theme Toggle — visible only inside mobile menu */}
                <li className="nav-item mobile-theme-toggle-item">
                  <button
                    className="nav-link mobile-theme-toggle-btn"
                    onClick={toggleTheme}
                    aria-label="Toggle Theme"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                  >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    <span>{isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                  </button>
                </li>
              </ul>

              {/* Action elements */}
              <div className="nav-actions">
                <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button className="mobile-nav-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
                </button>
              </div>
            </nav>
          </div>
        </header>
      </div>
    </>
  );
}
