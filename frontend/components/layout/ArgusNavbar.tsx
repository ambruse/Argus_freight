"use client";

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, ChevronDown } from 'lucide-react';
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
      <div style={{ height: '90px' }} />
      <div className="argus-navbar-vars">
        <header className={`navbar-wrapper ${isScrolled ? 'scrolled' : ''}`}>
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
            </ul>

            {/* Action elements */}
            <div className="nav-actions">
              <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button className="cta-button" onClick={() => window.location.href = '/?quote=true'}>
                Request Quote
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
