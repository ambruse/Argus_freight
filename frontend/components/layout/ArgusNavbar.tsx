"use client";

import React, { useEffect, useRef, useState } from "react";
import { Building2, Home, LogIn, Menu, MessageCircle, Moon, PackageSearch, ShieldCheck, Sun, Users, X } from "lucide-react";
import { usePathname } from "next/navigation";
import "../../app/argus-navbar.css";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/about", label: "About Us", icon: Building2 },
  { href: "/services", label: "Services", icon: PackageSearch },
  { href: "/why-us", label: "Why Us", icon: ShieldCheck },
  { href: "/team", label: "Our Team", icon: Users },
  { href: "/contact", label: "Contact", icon: MessageCircle },
  { href: "/login", label: "Login", icon: LogIn },
];

export default function ArgusNavbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const shellRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const syncTheme = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    syncTheme();
    window.addEventListener("themeChanged", syncTheme);
    return () => window.removeEventListener("themeChanged", syncTheme);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    const onPointerDown = (event: PointerEvent) => {
      if (isOpen && shellRef.current && !shellRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  if (pathname !== "/login" && pathname !== "/register") return null;

  const toggleTheme = () => {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    document.documentElement.classList.toggle("light", !nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    window.dispatchEvent(new Event("themeChanged"));
  };

  const activeIndex = items.findIndex((item) => item.href === pathname);

  return (
    <header className={`argus-navbar-vars blob-nav-shell ${isOpen ? "is-open" : ""}`} ref={shellRef}>
      <button className="blob-nav-trigger" type="button" aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={isOpen} aria-controls="account-blob-navigation" onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      <nav id="account-blob-navigation" className="blob-nav" aria-label="Primary navigation">
        <div className="blob-nav-surface" aria-hidden="true"><span className="blob-nav-shine" /></div>
        <a className="blob-nav-brand" href="/" aria-label="Argus Shipping home">
          <span className="blob-nav-brand-mark"><img src="/images/AR.png" alt="" width="32" height="29" /></span>
          <img className="blob-nav-full-logo" src="/images/argus_shipping_logo_hero.png" alt="" width="154" height="69" />
        </a>
        <div className="blob-nav-primary-wrap">
          {activeIndex >= 0 && <span className="blob-nav-active-indicator" style={{ "--active-index": activeIndex } as React.CSSProperties} aria-hidden="true" />}
          <ul className="blob-nav-list">
            {items.map((item) => {
              const Icon = item.icon;
              const active = item.href === pathname;
              return (
                <li key={item.href}>
                  <a className={`blob-nav-link ${active ? "is-active" : ""}`} href={item.href} aria-current={active ? "page" : undefined}>
                    <Icon className="blob-nav-icon" size={19} strokeWidth={1.8} aria-hidden="true" />
                    <span className="blob-nav-label">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="blob-nav-actions">
          <button className="blob-nav-theme" type="button" onClick={toggleTheme} aria-label={`Switch to ${isDarkMode ? "light" : "dark"} theme`}>
            {isDarkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          <a className="blob-nav-quote" href="/register">Create account</a>
        </div>
      </nav>
    </header>
  );
}
