"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, Sparkles, ArrowRight } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Chat", href: "/chat" },
    { label: "New Companion", href: "/onboarding" },
    { label: "How It Works", href: "/#features" },
    { label: "Use Cases", href: "/#use-cases" },
    { label: "Settings", href: "/settings" },
  ];

  return (
    <header className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-5xl">
      {/* Floating Glassmorphic Pill Capsule */}
      <nav className="w-full backdrop-blur-xl bg-[#0D0D0D]/85 border border-[#A58CF4]/25 shadow-[0_16px_50px_rgba(13,13,13,0.7)] rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all duration-300">
        
        {/* 1. Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group text-[#FAFAFA] no-underline">
          <div className="w-7 h-7 rounded-full bg-[#433075] border border-[#A58CF4]/40 flex items-center justify-center text-[#A58CF4] transition-transform duration-300 group-hover:rotate-45">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
            </svg>
          </div>
          <span className="font-medium text-[15px] tracking-tight text-[#FAFAFA]">
            Eternia
          </span>
        </Link>

        {/* 2. Centered Glassmorphic Text Links with Dot Dividers */}
        <div className="hidden md:flex items-center gap-5 lg:gap-6 text-[12.5px] font-normal text-[rgba(250,250,250,0.75)]">
          {navLinks.map((link, idx) => (
            <React.Fragment key={link.label}>
              <Link
                href={link.href}
                className="hover:text-[#FAFAFA] transition-colors duration-200 no-underline"
              >
                {link.label}
              </Link>
              {idx < navLinks.length - 1 && (
                <span className="text-[#A58CF4]/40 select-none text-[10px]">•</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 3. Right CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/chat"
            className="btn-pill-primary text-[12px] px-5 py-2 hover:shadow-md no-underline flex items-center gap-1.5"
          >
            <span>Chat</span>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-[#FAFAFA] hover:text-[#A58CF4] focus:outline-none"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile Floating Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 backdrop-blur-2xl bg-[#0D0D0D]/95 border border-[#A58CF4]/30 shadow-[0_20px_60px_rgba(13,13,13,0.9)] rounded-3xl p-5 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-[rgba(250,250,250,0.75)] hover:text-[#FAFAFA] text-[14px] font-medium py-2 px-3 rounded-xl hover:bg-[rgba(67,48,117,0.3)] transition-colors no-underline"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#A58CF4]/20">
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-pill-primary w-full text-center py-2.5 text-[13px] no-underline block"
            >
              Chat
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
