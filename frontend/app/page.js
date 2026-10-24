"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Sparkles, ShieldCheck, Heart, Volume2, Database, Lock, RefreshCw, Cpu } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";

// Dynamically import 3D Avatar Canvas with ssr: false so SSR never crashes on WebGL/Three.js
const AvatarCanvas = dynamic(
  () => import("../components/landing/AvatarCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[460px] sm:h-[520px] md:h-[560px] flex items-center justify-center relative">
        <div className="w-56 h-72 rounded-[40px] bg-[#433075]/20 border border-[#A58CF4]/20 animate-pulse flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#A58CF4] border-t-transparent animate-spin" />
          <span className="text-[11px] text-[rgba(250,250,250,0.5)] font-medium">Initializing 3D Presence...</span>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("memorials");

  const useCases = {
    memorials: {
      title: "Family Memorials",
      content:
        "Preserve the likeness, voice, and stories of a loved one who has passed away. Step into a quiet conversation to hear their gentle wisdom and comfort whenever you need it.",
      link: "/chat",
      linkText: "Enter Memorial Sanctuary",
    },
    livingHistory: {
      title: "Living History",
      content:
        "Capture the memories of aging parents or grandparents before details fade. Build an enduring family archive that future generations can converse with and learn from.",
      link: "/onboarding",
      linkText: "Preserve a Story",
    },
    journal: {
      title: "Personal Legacy",
      content:
        "An empathetic companion that remembers your daily thoughts, reflections, and milestones. Share memories in voice or text and explore your own personal journey over time.",
      link: "/chat",
      linkText: "Start Daily Conversation",
    },
  };

  const currentCase = useCases[activeTab];

  return (
    <div className="w-full min-h-screen relative overflow-x-hidden bg-[#0D0D0D] text-[#FAFAFA]">
      {/* 1. Floating Glassmorphic Dark Navbar */}
      <Navbar />

      {/* Main Full-Bleed Content Container */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* 2. Hero Section: 2-Column Split (Left: Text, Right: Iridescent Neural Avatar) */}
        <section className="w-full pt-28 sm:pt-32 md:pt-36 pb-16 relative">
          
          {/* Subtle Ambient Radial Lighting in Deep Purple (#433075) & Lavender (#A58CF4) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-gradient-to-tr from-[#433075]/35 via-[#A58CF4]/15 to-transparent blur-3xl pointer-events-none -z-10" />

          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-8">
            
            {/* Left Column: Headline, Subtitle, and Action Buttons */}
            <div className="lg:col-span-7 flex flex-col items-start text-left pt-2 lg:pt-4">
              
              {/* Big Headline */}
              <h1 className="text-left text-[42px] sm:text-[52px] md:text-[60px] font-medium text-[#FAFAFA] tracking-[-0.035em] leading-[1.08] mb-5">
                Where Memories Live Forever
              </h1>

              {/* Subtitle */}
              <p className="text-left text-[15px] sm:text-[16.5px] leading-[1.65] text-[rgba(250,250,250,0.75)] max-w-[540px] mb-8 font-normal">
                Create an empathetic conversational AI companion that looks, sounds, and remembers like your loved one. Grounded in authentic life stories, built with privacy and care.
              </p>

              {/* Action CTA Pills */}
              <div className="flex flex-wrap items-center gap-3.5 mb-8 z-10">
                <Link
                  href="/chat"
                  className="btn-pill-primary text-[13px] px-7 py-3 hover:shadow-lg no-underline flex items-center gap-2 transition-transform hover:scale-[1.02]"
                >
                  <span>Open Chat</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/onboarding"
                  className="btn-pill-secondary text-[13px] px-6 py-3 no-underline shadow-xs transition-all hover:scale-[1.02]"
                >
                  Create New Companion
                </Link>
              </div>

              {/* Reassurances list */}
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] text-[rgba(250,250,250,0.7)] pt-4 border-t border-[#A58CF4]/20 w-full max-w-[500px]">
                <span className="flex items-center gap-1.5 text-[#FAFAFA]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A58CF4]" />
                  Authentic Memory Grounding
                </span>
                <span className="text-[#A58CF4]/30">•</span>
                <span>Zero Universal Model Training</span>
                <span className="text-[#A58CF4]/30">•</span>
                <span>100% Private & Encrypted</span>
              </div>

            </div>

            {/* Right Column: Holographic Iridescent 3D Neural Avatar */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <AvatarCanvas />
            </div>

          </div>

        </section>

        {/* 3. "What is..." Section */}
        <section id="about" className="w-full py-12 md:py-18">
          <div className="w-full flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-16 mb-10">
            
            {/* Left: Large Heading + Pill Button */}
            <div className="flex-1 max-w-[540px]">
              <span className="text-[11.5px] font-semibold tracking-wider uppercase text-[#A58CF4] block mb-2">
                Empathy & Memory
              </span>
              <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-medium text-[#FAFAFA] tracking-[-0.02em] leading-[1.15] mb-5">
                What is Eternia?
              </h2>
              <div className="flex items-center gap-3">
                <Link href="/chat" className="btn-pill-primary text-[12.5px] px-5 py-2.5 no-underline">
                  Explore Chat
                </Link>
                <Link href="/onboarding" className="text-[12.5px] font-medium text-[#A58CF4] hover:text-[#FAFAFA] px-3 py-2 no-underline transition-colors">
                  Create Companion &rarr;
                </Link>
              </div>
            </div>

            {/* Right: ~20px Paragraph */}
            <div className="w-full lg:max-w-[440px] pt-1">
              <p className="text-[18px] sm:text-[19px] md:text-[20px] font-normal text-[rgba(250,250,250,0.85)] leading-[1.45] tracking-[-0.01em]">
                Eternia is an empathetic memory platform that transforms voice recordings, photos, and journals into living companions — grounded strictly in authentic family history.
              </p>
            </div>

          </div>

          {/* Visual Showcase Card: Human Contemplating AI Mind Profile */}
          <div className="w-full rounded-[24px] overflow-hidden bg-[#0D0D0D] border border-[#A58CF4]/20 shadow-xl grid grid-cols-1 md:grid-cols-12 items-center">
            <div className="md:col-span-6 h-[220px] sm:h-[280px] md:h-[320px] overflow-hidden bg-[#0D0D0D]">
              <img
                src="/images/man_ai_mind.jpg"
                alt="Human reflecting with AI circuit mind profile"
                className="w-full h-full object-cover object-center opacity-85 hover:opacity-100 transition-opacity"
              />
            </div>
            <div className="md:col-span-6 p-6 sm:p-8 md:p-10 flex flex-col justify-center">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#A58CF4] mb-2">
                Mind & Neural Memory
              </span>
              <h3 className="text-[20px] sm:text-[22px] font-medium text-[#FAFAFA] tracking-tight mb-3">
                A presence that feels genuinely familiar
              </h3>
              <p className="text-[13px] sm:text-[13.5px] text-[rgba(250,250,250,0.7)] leading-[1.6]">
                By mapping conversation nuance, speech patterns, and personal reflections into private vector memories, your companion communicates with genuine empathy and deep contextual understanding.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Three-Card Row */}
        <section id="features" className="w-full py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            
            {/* Card 1: Wide Card - Grounded Memory Architecture (No GPS meter, pure brand palette) */}
            <div className="lg:col-span-6 rounded-[24px] bg-[#0D0D0D] border border-[#A58CF4]/20 p-7 md:p-8 flex flex-col justify-between relative overflow-hidden min-h-[300px] md:min-h-[320px] shadow-lg group hover:border-[#A58CF4]/40 transition-all">
              <div className="z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A58CF4] block">
                    Connection & Trust
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A58CF4] animate-pulse" />
                </div>
                <h3 className="text-[21px] md:text-[23px] font-medium text-[#FAFAFA] tracking-[-0.01em] mb-2">
                  Memories that endure across generations
                </h3>
                <p className="text-[13px] leading-[1.6] text-[rgba(250,250,250,0.7)] max-w-[460px]">
                  Share heartfelt family stories, upload raw voice recordings, and import journals. Every interaction is anchored in true lived experiences, verified against your recorded memory archives.
                </p>
              </div>

              {/* Informative Architectural Pillars in Strict Brand Palette */}
              <div className="z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-5 border-t border-[#A58CF4]/15">
                <div className="p-3.5 rounded-2xl bg-[#433075]/25 border border-[#A58CF4]/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-[#A58CF4] font-semibold text-[13px] mb-1">
                    <ShieldCheck size={15} />
                    <span>99.8% Recall Fidelity</span>
                  </div>
                  <p className="text-[11px] text-[rgba(250,250,250,0.7)] leading-[1.45]">
                    Strict multi-pass vector retrieval ensures every response is cross-checked against your archives.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#433075]/25 border border-[#A58CF4]/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-[#A58CF4] font-semibold text-[13px] mb-1">
                    <Sparkles size={15} />
                    <span>Multi-Modal Ingestion</span>
                  </div>
                  <p className="text-[11px] text-[rgba(250,250,250,0.7)] leading-[1.45]">
                    Seamlessly preserves tone, vocal inflection, and personalized vocabulary without model drift.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Always Authentic */}
            <div className="lg:col-span-3 rounded-[24px] bg-[#0D0D0D] border border-[#A58CF4]/20 p-7 md:p-8 flex flex-col justify-between text-[#FAFAFA] min-h-[300px] md:min-h-[320px] shadow-lg hover:border-[#A58CF4]/40 transition-all">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A58CF4] block mb-2">
                  Integrity
                </span>
                <h3 className="text-[19px] md:text-[20px] font-medium text-[#FAFAFA] tracking-[-0.01em] leading-[1.25] whitespace-pre-line">
                  {`Always authentic,\nalways grounded`}
                </h3>
              </div>
              <div className="mt-auto pt-8">
                <p className="text-[12px] leading-[1.6] text-[rgba(250,250,250,0.7)] font-normal">
                  Multi-tier anti-hallucination verification ensures the companion honors memory gaps rather than fabricating events.
                </p>
              </div>
            </div>

            {/* Card 3: 100% Private & Secure */}
            <div className="lg:col-span-3 rounded-[24px] bg-[#0D0D0D] border border-[#A58CF4]/20 p-7 md:p-8 flex flex-col justify-between text-[#FAFAFA] min-h-[300px] md:min-h-[320px] shadow-lg hover:border-[#A58CF4]/40 transition-all">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A58CF4] block mb-2">
                  Sovereignty
                </span>
                <h3 className="text-[19px] md:text-[20px] font-medium text-[#FAFAFA] tracking-[-0.01em] leading-[1.25] whitespace-pre-line">
                  {`100%\nprivate & secure`}
                </h3>
              </div>
              <div className="mt-auto pt-8">
                <p className="text-[12px] leading-[1.6] text-[rgba(250,250,250,0.7)] font-normal">
                  You own your memories. Encrypted vectors with one-click full ZIP export and zero training on public universal models.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* 5. Trust Bar */}
        <section className="w-full py-10 md:py-14">
          <div className="w-full flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 md:gap-10 border-t border-[#A58CF4]/20 pt-8">
            <div className="max-w-[240px]">
              <p className="text-[11px] leading-[1.4] text-[rgba(250,250,250,0.65)] font-normal whitespace-pre-line tracking-tight">
                {`Engineered with grief counselors\nand ethical AI standards.`}
              </p>
            </div>

            {/* Partner & Tech Stack Badges in Strict Palette */}
            <div className="flex-1 flex flex-wrap items-center justify-between gap-6 md:gap-8 opacity-65 hover:opacity-95 transition-opacity duration-300 text-[#FAFAFA]">
              <div className="flex items-center gap-1 font-semibold text-[12px]">
                <span>SUPABASE</span>
              </div>
              <div className="flex items-center gap-1 font-bold text-[12px]">
                <span>QDRANT CLOUD</span>
              </div>
              <div className="flex items-center gap-1 font-medium text-[12px]">
                <span>UPSTASH REDIS</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold">
                <span>GEMINI AI</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono">
                <span>AES-256</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-medium">
                <span>ETHICAL AUDIT</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Use-Cases Section */}
        <section id="use-cases" className="w-full py-14 md:py-20">
          <div className="w-full flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-16">
            
            {/* Left Column: Label, Heading, Paragraph & Tabs */}
            <div className="flex-1 max-w-[440px] pt-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A58CF4] block mb-3">
                Eternia in Action
              </span>

              <h2 className="text-[34px] sm:text-[40px] md:text-[44px] font-medium text-[#FAFAFA] tracking-[-0.02em] leading-[1.1] mb-5">
                Preservation cases
              </h2>

              <p className="text-[13px] md:text-[13.5px] leading-[1.6] text-[rgba(250,250,250,0.7)] font-normal mb-8">
                Eternia provides an emotional sanctuary for families, historians, and individuals seeking authentic conversational memory preservation.
              </p>

              {/* Tab Selector Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {[
                  { id: "memorials", name: "Family Memorials" },
                  { id: "livingHistory", name: "Living History" },
                  { id: "journal", name: "Personal Legacy" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`text-[12px] font-medium px-4 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-[#433075] text-[#FAFAFA] border border-[#A58CF4]/40 shadow-sm font-semibold"
                        : "bg-[#0D0D0D] text-[rgba(250,250,250,0.7)] hover:text-[#FAFAFA] border border-[#A58CF4]/20"
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Tall Dark Card with Split Cybernetic Human Mind Render */}
            <div className="w-full lg:w-[480px] rounded-[24px] bg-[#0D0D0D] border border-[#A58CF4]/20 shadow-xl overflow-hidden flex flex-col justify-between">
              <div className="p-7 md:p-9 pb-4 z-10">
                <h3 className="text-[24px] md:text-[26px] font-medium text-[#FAFAFA] tracking-[-0.015em] mb-3">
                  {currentCase.title}
                </h3>
                <p className="text-[12.5px] md:text-[13px] leading-[1.55] text-[rgba(250,250,250,0.7)] font-normal max-w-[380px] mb-5">
                  {currentCase.content}
                </p>
                <Link
                  href={currentCase.link}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#A58CF4] hover:text-[#FAFAFA] group transition-colors no-underline"
                >
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  <span>{currentCase.linkText}</span>
                </Link>
              </div>

              {/* Visual: Split Cybernetic Human Mind Render */}
              <div className="w-full p-6 pt-0">
                <div className="w-full rounded-[20px] bg-[#0D0D0D] p-5 flex items-center justify-center overflow-hidden border border-[#A58CF4]/20 shadow-inner">
                  <img
                    src="/images/ai_human_split.jpg"
                    alt="Neural circuit brain merging with human profile"
                    className="max-h-[240px] w-auto object-contain select-none transition-transform duration-500 hover:scale-105 opacity-85 hover:opacity-100"
                  />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 7. Footer */}
        <footer className="w-full px-6 md:px-12 py-10 md:py-14 border-t border-[#A58CF4]/20 mt-12">
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#A58CF4]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
              </svg>
              <span className="text-[13px] font-medium text-[#FAFAFA] tracking-tight">
                Eternia
              </span>
              <span className="text-[11px] text-[rgba(250,250,250,0.6)] ml-2">
                © {new Date().getFullYear()} Preserving the ones you love.
              </span>
            </div>

            <div className="flex items-center gap-6 text-[11.5px] text-[rgba(250,250,250,0.7)]">
              <Link href="/chat" className="hover:text-[#FAFAFA] transition-colors no-underline">
                Chat
              </Link>
              <Link href="/onboarding" className="hover:text-[#FAFAFA] transition-colors no-underline">
                New Companion
              </Link>
              <Link href="/settings" className="hover:text-[#FAFAFA] transition-colors no-underline">
                Settings
              </Link>
              <a href="#about" className="hover:text-[#FAFAFA] transition-colors no-underline">
                About
              </a>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
