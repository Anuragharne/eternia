"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  MessageSquare,
  UserPlus,
  Settings,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

export function Navbar({ mode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredHref, setHoveredHref] = useState(null);

  // Auto-detect chat mode unless explicitly overridden
  const isChatMode = mode === "vertical" || (mode === undefined && pathname === "/chat");

  // Streamlined 4-item navigation: Home, Chat, New Companion, Settings
  const navLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Chat", href: "/chat", icon: MessageSquare },
    { label: "New Companion", href: "/onboarding", icon: UserPlus },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const getIsActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const activeLink = navLinks.find((l) => getIsActive(l.href)) || navLinks[0];
  const currentTarget = hoveredHref ?? activeLink.href;

  // -------------------------------------------------------------
  // VERTICAL LEFT-DOCKED GLASS RAIL (for Chat Mode)
  // -------------------------------------------------------------
  if (isChatMode) {
    return (
      <>
        {/* Desktop Left-Docked Floating Glass Pill */}
        <aside
          onMouseLeave={() => setHoveredHref(null)}
          className="hidden md:flex flex-col items-center justify-between w-[68px] h-full max-h-[96vh] my-auto py-5 backdrop-blur-2xl bg-gradient-to-b from-[#A58CF4]/[0.16] via-[#433075]/[0.10] to-[#0D0D0D]/[0.78] border border-[#A58CF4]/35 shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.45),inset_0_-1px_1px_0_rgba(0,0,0,0.5),0_16px_45px_rgba(0,0,0,0.7)] rounded-[32px] shrink-0 z-30 select-none"
        >
          {/* Brand Spark Logo inside Glass Orb */}
          <Link href="/" className="group" title="Back to Home">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#433075] to-[#A58CF4]/60 border border-white/30 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_4px_12px_rgba(67,48,117,0.4)] flex items-center justify-center text-[#FAFAFA] transition-transform duration-300 group-hover:rotate-45 group-hover:scale-105">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
              </svg>
            </div>
          </Link>

          {/* Vertical Glass Action Icons with Sliding Capsule */}
          <div className="flex flex-col items-center gap-3 relative">
            {navLinks.map((link) => {
              const isTargeted = currentTarget === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onMouseEnter={() => setHoveredHref(link.href)}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center transition-colors duration-200 group relative no-underline select-none"
                >
                  {/* Sliding Frosted Glass Capsule */}
                  {isTargeted && (
                    <motion.div
                      layoutId="vertical-glass-pill"
                      className="absolute inset-0 rounded-2xl bg-white/[0.18] border border-white/35 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_4px_16px_rgba(67,48,117,0.4)] pointer-events-none"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                    />
                  )}

                  <Icon
                    size={18}
                    className={`relative z-10 transition-colors ${
                      isTargeted
                        ? "text-[#FAFAFA]"
                        : "text-[#A58CF4]/75 group-hover:text-[#FAFAFA]"
                    }`}
                  />

                  {/* Sleek Tooltip Flyout */}
                  <span className="absolute left-[58px] px-2.5 py-1 rounded-lg bg-[#0D0D0D]/95 border border-[#A58CF4]/30 shadow-xl text-[11px] font-medium text-[#FAFAFA] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Bottom Floating Glass Action */}
          <Link
            href="/onboarding"
            title="Create Companion"
            className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-2xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] text-[rgba(250,250,250,0.85)] hover:text-[#FAFAFA] hover:scale-105 transition-all no-underline"
          >
            <Sparkles size={16} className="text-[#A58CF4]" />
          </Link>
        </aside>

        {/* Mobile Top Header (only on screens < 768px in Chat mode) */}
        <header className="md:hidden w-full px-3 pt-2 pb-1 shrink-0 z-30">
          <div className="w-full backdrop-blur-2xl bg-gradient-to-b from-[#A58CF4]/[0.16] via-[#433075]/[0.10] to-[#0D0D0D]/[0.85] border border-[#A58CF4]/30 shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.4),0_8px_30px_rgba(0,0,0,0.6)] rounded-full px-4 py-2 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-[#FAFAFA] no-underline">
              <div className="w-6 h-6 rounded-full bg-[#433075] border border-white/30 flex items-center justify-center text-[#FAFAFA]">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
                </svg>
              </div>
              <span className="font-medium text-[13.5px] text-[#FAFAFA]">Eternia</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/onboarding"
                className="text-[11px] font-medium text-[#A58CF4] hover:text-[#FAFAFA] px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/15 no-underline"
              >
                + New
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1 text-[#FAFAFA]"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="mt-2 backdrop-blur-2xl bg-[#0D0D0D]/95 border border-[#A58CF4]/30 shadow-2xl rounded-2xl p-3 flex flex-col gap-1.5 animate-in fade-in duration-150">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[13px] text-[rgba(250,250,250,0.8)] hover:text-[#FAFAFA] py-2 px-3 rounded-xl hover:bg-white/[0.08] no-underline flex items-center gap-2.5"
                >
                  <link.icon size={15} className="text-[#A58CF4]" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          )}
        </header>
      </>
    );
  }

  // -------------------------------------------------------------
  // HORIZONTAL FLOATING GLASS DOCK (for Homepage, Onboarding, Settings, etc.)
  // -------------------------------------------------------------
  return (
    <header className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 sm:gap-3 w-auto max-w-[96vw]">
      {/* Main Frosted Liquid Glass Pill */}
      <nav
        onMouseLeave={() => setHoveredHref(null)}
        className="backdrop-blur-2xl bg-gradient-to-b from-[#A58CF4]/[0.16] via-[#433075]/[0.10] to-[#0D0D0D]/[0.80] border border-[#A58CF4]/35 shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.45),inset_0_-1px_1px_0_rgba(0,0,0,0.5),0_16px_45px_rgba(0,0,0,0.7)] rounded-full px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-1.5 transition-all select-none"
      >
        {/* Brand Logo & Name */}
        <Link
          href="/"
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors no-underline group mr-1"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#433075] to-[#A58CF4]/60 border border-white/30 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5)] flex items-center justify-center text-[#FAFAFA] transition-transform duration-300 group-hover:rotate-45">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
            </svg>
          </div>
          <span className="font-medium text-[14.5px] tracking-tight text-[#FAFAFA] hidden sm:inline">
            Eternia
          </span>
        </Link>

        {/* Desktop Nav Items with Sliding Liquid Glass Pill */}
        <div className="hidden md:flex items-center gap-1 relative">
          {navLinks.map((link) => {
            const isTargeted = currentTarget === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                onMouseEnter={() => setHoveredHref(link.href)}
                className="relative flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-full text-[12.5px] whitespace-nowrap transition-colors duration-200 no-underline select-none"
              >
                {/* Sliding Frosted Glass Capsule */}
                {isTargeted && (
                  <motion.div
                    layoutId="horizontal-glass-pill"
                    className="absolute inset-0 rounded-full bg-white/[0.18] border border-white/35 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_4px_16px_rgba(67,48,117,0.4)] pointer-events-none"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                    }}
                  />
                )}

                <Icon
                  size={14}
                  className={`relative z-10 transition-colors ${
                    isTargeted
                      ? "text-[#FAFAFA]"
                      : "text-[#A58CF4]/80 group-hover:text-[#FAFAFA]"
                  }`}
                />
                <span
                  className={`relative z-10 transition-colors ${
                    isTargeted
                      ? "text-[#FAFAFA] font-medium"
                      : "text-[rgba(250,250,250,0.72)] font-normal"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center pr-1">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-[#FAFAFA] hover:text-[#A58CF4] focus:outline-none"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Floating Circular Glass Action Button */}
      <Link
        href="/chat"
        title="Open Chat"
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center backdrop-blur-2xl bg-gradient-to-b from-[#A58CF4]/[0.20] via-[#433075]/[0.14] to-[#0D0D0D]/[0.80] border border-[#A58CF4]/40 shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.5),0_12px_32px_rgba(0,0,0,0.6)] text-[#FAFAFA] hover:scale-105 hover:bg-white/[0.16] hover:border-white/40 transition-all no-underline shrink-0 group"
      >
        <Sparkles size={16} className="text-[#A58CF4] group-hover:text-[#FAFAFA] transition-colors" />
      </Link>

      {/* Mobile Floating Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 w-full backdrop-blur-2xl bg-[#0D0D0D]/95 border border-[#A58CF4]/30 shadow-[0_20px_60px_rgba(13,13,13,0.9)] rounded-3xl p-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-[rgba(250,250,250,0.78)] hover:text-[#FAFAFA] text-[13.5px] font-medium py-2 px-3 rounded-xl hover:bg-white/[0.08] transition-colors no-underline flex items-center gap-2.5"
            >
              <link.icon size={15} className="text-[#A58CF4]" />
              <span>{link.label}</span>
            </Link>
          ))}
          <div className="pt-2 border-t border-[#A58CF4]/20">
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-pill-primary w-full text-center py-2.5 text-[13px] no-underline block"
            >
              Open Chat
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
