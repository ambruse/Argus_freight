import React, { useEffect, useRef, useState } from 'react';
import { Building2, ExternalLink, Home, LayoutDashboard, LogIn, Menu, MessageCircle, Moon, Navigation, PackageSearch, ShieldCheck, Sparkles, Sun, Users, X } from 'lucide-react';
import './VerticalBlobNav.css';

const primaryItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/about', label: 'About Us', icon: Building2, matches: ['/about', '/chairman-message'] },
  { href: '/services', label: 'Services', icon: PackageSearch },
  { href: '/tracking', label: 'Tracking', icon: Navigation },
  { href: '/why-us', label: 'Why Us', icon: ShieldCheck },
  { href: '/team', label: 'Our Team', icon: Users },
  { href: '/contact', label: 'Contact', icon: MessageCircle },
];

const groupCompanies = [
  ['Argus Middle East Doha', 'http://www.argusme.com/'],
  ['Argus Computers Doha', 'http://www.arguscomputers.net/'],
  ['Argus Shipping Bahrain', 'http://www.argusmeast.com/'],
  ['Argus Shipping Dubai', 'http://www.argus-me.com/'],
  ['Boxndoc.com', 'http://boxndoc.com/'],
  ['Sourseco Global', 'http://www.sourseglobal.com/'],
];

export default function Navbar({ currentPath, setCurrentPath, onOpenQuote, isDarkMode, setIsDarkMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const shellRef = useRef(null);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem('freight_token')));
  }, []);

  useEffect(() => setIsOpen(false), [currentPath]);

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') setIsOpen(false); };
    const closeOutside = (event) => {
      if (isOpen && shellRef.current && !shellRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [isOpen]);

  const isActive = (item) => (item.matches || [item.href]).includes(currentPath) || (item.href === '/services' && (currentPath.startsWith('/services/') || currentPath.startsWith('/shipping/')));
  const activeIndex = primaryItems.findIndex(isActive);

  const handleNavigate = (event, href) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.location.pathname !== href) window.history.pushState({}, '', href);
    setCurrentPath(href);
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePointerMove = (event) => {
    if (event.pointerType === 'touch' || !shellRef.current) return;
    const rect = shellRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 7;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 5;
    shellRef.current.style.setProperty('--blob-pull-x', `${x.toFixed(2)}px`);
    shellRef.current.style.setProperty('--blob-pull-y', `${y.toFixed(2)}px`);
  };

  const resetPointer = () => {
    setIsOpen(false);
    shellRef.current?.style.setProperty('--blob-pull-x', '0px');
    shellRef.current?.style.setProperty('--blob-pull-y', '0px');
  };

  return (
    <header className={`blob-nav-shell ${isOpen ? 'is-open' : ''}`} ref={shellRef} onPointerMove={handlePointerMove}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') resetPointer(); }}>
      <button className="blob-nav-trigger" type="button" aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isOpen} aria-controls="primary-blob-navigation" onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      <nav id="primary-blob-navigation" className="blob-nav" aria-label="Primary navigation">
        <div className="blob-nav-surface" aria-hidden="true"><span className="blob-nav-shine" /></div>

        <a className="blob-nav-brand" href="/" onClick={(event) => handleNavigate(event, '/')} aria-label="Argus Shipping home">
          <span className="blob-nav-brand-mark"><img src="/images/AR.png" alt="" width="32" height="29" /></span>
          <img className="blob-nav-full-logo" src="/images/argus_shipping_logo_hero.png" alt="" width="154" height="69" />
        </a>

        <div className="blob-nav-primary-wrap">
          {activeIndex >= 0 && <span className="blob-nav-active-indicator" style={{ '--active-index': activeIndex }} aria-hidden="true" />}
          <ul className="blob-nav-list">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <a className={`blob-nav-link ${active ? 'is-active' : ''}`} href={item.href} onClick={(event) => handleNavigate(event, item.href)} aria-current={active ? (currentPath === item.href ? 'page' : 'location') : undefined}>
                    <Icon className="blob-nav-icon" size={19} strokeWidth={1.8} aria-hidden="true" />
                    <span className="blob-nav-label">{item.label}</span>
                  </a>
                </li>
              );
            })}
            <li>
              <a className={`blob-nav-link ${currentPath === '/login' || currentPath === '/dashboard' ? 'is-active' : ''}`} href={isLoggedIn ? '/dashboard' : '/login'}>
                {isLoggedIn ? <LayoutDashboard className="blob-nav-icon" size={19} aria-hidden="true" /> : <LogIn className="blob-nav-icon" size={19} aria-hidden="true" />}
                <span className="blob-nav-label">{isLoggedIn ? 'Dashboard' : 'Login'}</span>
              </a>
            </li>
          </ul>
        </div>

        <div className="blob-nav-utilities">
          <details className="blob-nav-network">
            <summary><Sparkles size={16} aria-hidden="true" /><span>Argus network</span></summary>
            <div className="blob-nav-network-links">
              {groupCompanies.map(([label, href]) => <a href={href} target="_blank" rel="noopener noreferrer" key={href}>{label}<ExternalLink size={12} aria-hidden="true" /></a>)}
            </div>
          </details>
          <div className="blob-nav-actions">
            <button className="blob-nav-theme" type="button" onClick={() => setIsDarkMode((dark) => !dark)} aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}>
              {isDarkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <button className="blob-nav-quote" type="button" onClick={onOpenQuote}>Request quote</button>
          </div>
        </div>
      </nav>
    </header>
  );
}
