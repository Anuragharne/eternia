"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  MessageSquare,
  UserPlus,
  Settings,
  Menu,
  X,
  Sparkles,
  Video,
  Phone,
} from "lucide-react";

export function Navbar({ mode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredHref, setHoveredHref] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // Scroll shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isChatMode = mode === "vertical" || (mode === undefined && pathname === "/chat");

  const navLinks = [
    { label: "Home",          href: "/",           icon: Home },
    { label: "Chat",          href: "/chat",        icon: MessageSquare },
    { label: "Voice Talk",    href: "/voice",       icon: Phone },
    { label: "Video Call",    href: "/call",        icon: Video },
    { label: "New Companion", href: "/onboarding",  icon: UserPlus },
    { label: "Settings",      href: "/settings",    icon: Settings },
  ];

  const getIsActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const activeLink = navLinks.find((l) => getIsActive(l.href)) || navLinks[0];
  const currentTarget = hoveredHref ?? activeLink.href;

  // ─── Logo Mark with Sunglow & Wisteria ─────────────────────
  const LogoMark = ({ size = 28 }) => (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #210B2C 0%, #3B184C 50%, #BC96E6 100%)",
        border: "1px solid rgba(255, 209, 102, 0.5)",
        boxShadow: "0 0 16px rgba(255, 209, 102, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
        borderRadius: "50%",
      }}
    >
      <svg
        width={size * 0.52}
        height={size * 0.52}
        viewBox="0 0 24 24"
        fill="#FFD166"
        style={{ position: "relative", zIndex: 1, filter: "drop-shadow(0 0 4px rgba(255,209,102,0.6))" }}
      >
        <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
      </svg>
    </div>
  );

  // ─── VERTICAL SIDEBAR (Chat Mode) ──────────────────────────
  if (isChatMode) {
    return (
      <>
        {/* Desktop: Left-Docked Glass Rail */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onMouseLeave={() => setHoveredHref(null)}
          style={{
            background: "linear-gradient(to bottom, rgba(33, 11, 44, 0.96), rgba(20, 5, 27, 0.92))",
            backdropFilter: "saturate(180%) blur(24px)",
            WebkitBackdropFilter: "saturate(180%) blur(24px)",
            border: "1px solid rgba(188, 150, 230, 0.22)",
            boxShadow: "inset 0 1px 0 rgba(255, 209, 102, 0.15), 0 20px 50px rgba(18, 5, 24, 0.8)",
          }}
          className="hidden md:flex flex-col items-center justify-between w-[68px] h-full max-h-[96vh] my-auto py-5 rounded-[28px] shrink-0 z-30 select-none"
        >
          {/* Logo */}
          <Link href="/" title="Back to Home" className="group">
            <motion.div
              whileHover={{ rotate: 45, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <LogoMark size={32} />
            </motion.div>
          </Link>

          {/* Vertical Nav Icons */}
          <nav className="flex flex-col items-center gap-3 w-full px-2 relative">
            {navLinks.map((link) => {
              const isTargeted = currentTarget === link.href;
              const Icon = link.icon;
              return (
                <div key={link.label} className="relative w-full flex items-center justify-center">
                  <Link
                    href={link.href}
                    onMouseEnter={() => setHoveredHref(link.href)}
                    className="relative flex items-center justify-center w-11 h-11 rounded-full group"
                    title={link.label}
                    style={{ textDecoration: "none" }}
                  >
                    <AnimatePresence>
                      {isTargeted && (
                        <motion.div
                          layoutId="vertical-pill"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "9999px",
                            background: "rgba(255, 209, 102, 0.16)",
                            border: "1px solid rgba(255, 209, 102, 0.45)",
                            boxShadow: "0 0 16px rgba(255, 209, 102, 0.3)",
                          }}
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        />
                      )}
                    </AnimatePresence>
                    <Icon
                      size={18}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        color: isTargeted ? "#FFD166" : "rgba(216, 194, 242, 0.7)",
                        transition: "color 150ms",
                      }}
                    />
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Bottom Settings Link */}
          <Link
            href="/settings"
            title="Sanctuary Settings"
            className="flex items-center justify-center w-10 h-10 rounded-full transition-all"
            style={{
              color: pathname === "/settings" ? "#FFD166" : "#BC96E6",
              background: pathname === "/settings" ? "rgba(255, 209, 102, 0.15)" : "transparent",
            }}
          >
            <Settings size={17} />
          </Link>
        </motion.aside>

        {/* Mobile Header Bar (Chat Mode) */}
        <header className="md:hidden fixed top-0 left-0 right-0 z-50 p-3">
          <div
            style={{
              background: "linear-gradient(to bottom, rgba(33, 11, 44, 0.96), rgba(20, 5, 27, 0.92))",
              backdropFilter: "saturate(180%) blur(20px)",
              WebkitBackdropFilter: "saturate(180%) blur(20px)",
              border: "1px solid rgba(188, 150, 230, 0.2)",
              borderRadius: 9999,
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <LogoMark size={24} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#FAF6FF", fontFamily: "Outfit, sans-serif" }}>Eternia</span>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href="/onboarding"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#1A0824",
                  padding: "4px 12px",
                  borderRadius: 9999,
                  background: "linear-gradient(135deg, #FFD166, #FFBE3B)",
                  textDecoration: "none",
                }}
              >+ New</Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{ color: "#FAF6FF", padding: 4, background: "none", border: "none", cursor: "pointer" }}
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{
                  marginTop: 8,
                  background: "rgba(33, 11, 44, 0.98)",
                  backdropFilter: "blur(24px)",
                  border: "1px solid rgba(188, 150, 230, 0.25)",
                  borderRadius: 16,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      color: "#D3C1E8",
                      textDecoration: "none",
                      transition: "all 150ms",
                    }}
                    className="hover:bg-white/5 hover:text-[#FAF6FF]"
                  >
                    <link.icon size={15} color="#BC96E6" />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      </>
    );
  }

  // ─── HORIZONTAL FLOATING PILL (Homepage / all other pages) ──
  return (
    <header
      style={{
        position: "fixed",
        top: 16,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        padding: "0 16px",
      }}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          pointerEvents: "auto",
          maxWidth: "100%",
          position: "relative",
        }}
      >
        {/* Main Glass Pill */}
        <nav
          onMouseLeave={() => setHoveredHref(null)}
          style={{
            background: scrolled
              ? "linear-gradient(to bottom, rgba(33, 11, 44, 0.96), rgba(20, 5, 27, 0.94))"
              : "linear-gradient(to bottom, rgba(33, 11, 44, 0.88), rgba(20, 5, 27, 0.82))",
            backdropFilter: "saturate(180%) blur(24px)",
            WebkitBackdropFilter: "saturate(180%) blur(24px)",
            border: "1px solid rgba(188, 150, 230, 0.22)",
            borderRadius: 9999,
            padding: "5px 10px",
            display: "flex",
            alignItems: "center",
            gap: 2,
            boxShadow: scrolled
              ? "inset 0 1px 0 rgba(255, 209, 102, 0.15), 0 20px 60px rgba(18, 5, 24, 0.8), 0 0 0 0.5px rgba(188, 150, 230, 0.3)"
              : "inset 0 1px 0 rgba(255, 209, 102, 0.12), 0 12px 40px rgba(18, 5, 24, 0.6)",
            transition: "background 300ms, box-shadow 300ms",
            userSelect: "none",
          }}
        >
          {/* Brand */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 10px 5px 6px",
              borderRadius: 9999,
              textDecoration: "none",
              transition: "background 200ms",
              marginRight: 2,
            }}
            className="hover:bg-white/5"
          >
            <motion.div whileHover={{ rotate: 45 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
              <LogoMark size={26} />
            </motion.div>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "#FAF6FF", fontFamily: "Outfit, sans-serif", letterSpacing: "-0.01em" }}>
              Eternia
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-0.5 relative">
            {navLinks.map((link) => {
              const isTargeted = currentTarget === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onMouseEnter={() => setHoveredHref(link.href)}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 11px",
                    borderRadius: 9999,
                    fontSize: 12.5,
                    textDecoration: "none",
                    transition: "color 150ms",
                    color: isTargeted ? "#FAF6FF" : "rgba(211, 193, 232, 0.85)",
                    fontWeight: isTargeted ? 600 : 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  <AnimatePresence>
                    {isTargeted && (
                      <motion.div
                        layoutId="horizontal-pill"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 9999,
                          background: "rgba(255, 209, 102, 0.16)",
                          border: "1px solid rgba(255, 209, 102, 0.45)",
                          boxShadow: "inset 0 1px 0 rgba(255, 209, 102, 0.25), 0 0 12px rgba(255, 209, 102, 0.2)",
                        }}
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}
                  </AnimatePresence>
                  <Icon size={13.5} style={{ position: "relative", zIndex: 1, color: isTargeted ? "#FFD166" : "#BC96E6" }} />
                  <span style={{ position: "relative", zIndex: 1 }}>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center pr-1">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ padding: 6, color: "#FAF6FF", background: "none", border: "none", cursor: "pointer" }}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {/* Floating Chat / Sanctuary Button (Sunglow Accent) */}
        <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
          <Link
            href="/chat"
            title="Open Sanctuary Chat"
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #FFD166 0%, #FFBE3B 100%)",
              boxShadow: "0 0 18px rgba(255, 209, 102, 0.5), inset 0 1px 0 rgba(255,255,255,0.4)",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} color="#1A0824" />
          </Link>
        </motion.div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                left: 0,
                right: 0,
                width: "100%",
                maxWidth: 380,
                margin: "0 auto",
                background: "rgba(33, 11, 44, 0.98)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(188, 150, 230, 0.25)",
                borderRadius: 24,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                boxShadow: "0 20px 60px rgba(18, 5, 24, 0.85)",
                zIndex: 999,
              }}
              className="md:hidden"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: "#D3C1E8",
                    textDecoration: "none",
                    transition: "all 150ms",
                  }}
                  className="hover:bg-white/5 hover:text-[#FAF6FF]"
                >
                  <link.icon size={16} color="#BC96E6" />
                  <span>{link.label}</span>
                </Link>
              ))}
              <div style={{ paddingTop: 8, borderTop: "1px solid rgba(188, 150, 230, 0.15)", marginTop: 2 }}>
                <Link
                  href="/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px",
                    borderRadius: 9999,
                    background: "linear-gradient(135deg, #FFD166, #FFBE3B)",
                    color: "#1A0824",
                    fontSize: 13.5,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Open Sanctuary Chat
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
