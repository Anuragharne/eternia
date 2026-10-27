"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Heart,
  Volume2,
  Lock,
  Cpu,
  Check,
  Star,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Navbar } from "../components/layout/Navbar";

// Dynamically import 3D Avatar Canvas
const AvatarCanvas = dynamic(
  () => import("../components/landing/AvatarCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] flex items-center justify-center">
        <div
          style={{
            width: 200,
            height: 260,
            borderRadius: 32,
            background: "rgba(33, 11, 44, 0.7)",
            border: "1px solid rgba(188, 150, 230, 0.25)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              border: "2.5px solid rgba(188, 150, 230, 0.3)",
              borderTopColor: "#FFD166",
              animation: "spin-slow 1s linear infinite",
            }}
          />
          <span style={{ fontSize: 11.5, color: "var(--wisteria)", fontWeight: 600 }}>
            Initializing Presence...
          </span>
        </div>
      </div>
    ),
  }
);

// ── Section entrance animation variant ───────────────────────
const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

// ── Feature data ──────────────────────────────────────────────
const features = [
  {
    icon: ShieldCheck,
    tag: "Memory Integrity",
    title: "Grounded in authentic memory",
    desc: "Every response is cross-referenced against your private vector memory archive. Zero fabrication.",
    colSpan: 6,
    accent: "#FFD166",
  },
  {
    icon: Volume2,
    tag: "Voice Presence",
    title: "Natural voice in 9 languages",
    desc: "ElevenLabs AI voices matched to your companion's relationship — mother, grandfather, partner.",
    colSpan: 3,
    accent: "#BC96E6",
  },
  {
    icon: Lock,
    tag: "Sovereignty",
    title: "100% private & yours",
    desc: "Encrypted vectors, full JSON export, zero universal model training — ever.",
    colSpan: 3,
    accent: "#D8C2F2",
  },
];

const useCases = {
  memorials: {
    title: "Family Memorials",
    content:
      "Preserve the likeness, voice, and stories of a loved one who has passed away. Step into a quiet conversation to hear their gentle wisdom whenever you need it.",
    link: "/chat",
    linkText: "Enter Sanctuary",
  },
  livingHistory: {
    title: "Living History",
    content:
      "Capture the memories of aging parents or grandparents before details fade. Build an enduring family archive future generations can converse with.",
    link: "/onboarding",
    linkText: "Preserve a Story",
  },
  journal: {
    title: "Personal Legacy",
    content:
      "An empathetic companion that remembers your daily thoughts, reflections, and milestones. Explore your own personal journey over time.",
    link: "/chat",
    linkText: "Start Conversation",
  },
};

// ── InView Section wrapper ────────────────────────────────────
function Section({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={sectionVariants}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("memorials");
  const currentCase = useCases[activeTab];
  const heroRef = useRef(null);

  return (
    <div style={{ background: "var(--void)", color: "var(--text-0)", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>

      {/* ── Aurora Animated Background ─────────────────────── */}
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
      </div>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <Navbar />

      {/* ── Main Content ───────────────────────────────────── */}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >

        {/* ────────────────────────────────────────────────────
            HERO SECTION
        ──────────────────────────────────────────────────── */}
        <section
          ref={heroRef}
          style={{
            paddingTop: 120,
            paddingBottom: 64,
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 48,
            alignItems: "center",
          }}
          className="lg:grid-cols-[7fr_5fr]"
        >

          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}
          >
            {/* Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 16px",
                borderRadius: 9999,
                background: "rgba(255, 209, 102, 0.14)",
                border: "1px solid rgba(255, 209, 102, 0.4)",
                boxShadow: "0 0 16px rgba(255, 209, 102, 0.2)",
                marginBottom: 24,
              }}
            >
              <Sparkles size={13} color="#FFD166" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#FFD166", letterSpacing: "0.06em" }}>
                EMPATHETIC AI COMPANION
              </span>
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: "clamp(2.5rem, 5.2vw, 4.0rem)",
                fontWeight: 700,
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                color: "#FAF6FF",
                marginBottom: 22,
                maxWidth: 580,
              }}
            >
              Where{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #FAF6FF 15%, #BC96E6 55%, #FFD166 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Memories
              </span>{" "}
              Live Forever
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.55 }}
              style={{
                fontSize: 16.5,
                lineHeight: 1.68,
                color: "var(--text-1)",
                maxWidth: 520,
                marginBottom: 32,
              }}
            >
              Create an empathetic conversational AI companion that looks, sounds, and
              remembers like your loved one — grounded in authentic life stories, built
              with sacred privacy and warm affection.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.5 }}
              style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 32 }}
            >
              <Link
                href="/chat"
                className="btn btn-primary btn-lg"
                style={{ gap: 8 }}
              >
                <span>Open Sanctuary</span>
                <ArrowRight size={17} />
              </Link>
              <Link href="/onboarding" className="btn btn-secondary btn-lg">
                Create Companion
              </Link>
            </motion.div>

            {/* Trust Marks */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.44, duration: 0.5 }}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px 20px",
                paddingTop: 20,
                borderTop: "1px solid rgba(188, 150, 230, 0.15)",
                maxWidth: 500,
              }}
            >
              {[
                "Authentic Memory Grounding",
                "Zero Universal Model Training",
                "100% Private & Encrypted",
              ].map((t) => (
                <span
                  key={t}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12.5,
                    color: "var(--text-1)",
                  }}
                >
                  <Check size={13} color="#FFD166" />
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: 3D Avatar */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", justifyContent: "center", position: "relative" }}
          >
            {/* Candlelight warm ambient glow behind avatar */}
            <div
              style={{
                position: "absolute",
                inset: -60,
                background: "radial-gradient(ellipse at center, rgba(255, 209, 102, 0.22) 0%, rgba(188, 150, 230, 0.2) 40%, transparent 70%)",
                pointerEvents: "none",
                zIndex: 0,
              }}
              aria-hidden
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <AvatarCanvas />
            </div>
          </motion.div>
        </section>

        {/* ────────────────────────────────────────────────────
            WHAT IS ETERNIA — Editorial Two-Column
        ──────────────────────────────────────────────────── */}
        <Section style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 32,
              marginBottom: 32,
            }}
            className="lg:grid-cols-2 lg:gap-20"
          >
            <motion.div variants={itemVariants}>
              <span className="label-tag" style={{ display: "block", marginBottom: 12, color: "var(--sunglow)" }}>
                ✦ Empathy &amp; Memory
              </span>
              <h2
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
                  fontWeight: 700,
                  color: "#FAF6FF",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.15,
                  marginBottom: 20,
                }}
              >
                What is Eternia?
              </h2>
              <div style={{ display: "flex", gap: 12 }}>
                <Link href="/chat" className="btn btn-primary">Explore Sanctuary</Link>
                <Link href="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "var(--wisteria)", textDecoration: "none", padding: "10px 16px" }}>
                  Create Companion <ChevronRight size={14} />
                </Link>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <p
                style={{
                  fontSize: "clamp(1.05rem, 1.5vw, 1.25rem)",
                  color: "rgba(250,246,255,0.85)",
                  lineHeight: 1.7,
                  letterSpacing: "-0.005em",
                }}
              >
                Eternia transforms voice recordings, photos, and journals into a living
                companion — grounded strictly in authentic family history. It is not
                hollow simulation. It is a warm, private sanctuary preserving human love.
              </p>
            </motion.div>
          </div>

          {/* Visual Showcase Card */}
          <motion.div
            variants={itemVariants}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              background: "var(--surface-0)",
              border: "1px solid var(--border-1)",
              display: "grid",
              gridTemplateColumns: "1fr",
            }}
            className="md:grid-cols-2"
          >
            <div
              style={{
                height: 280,
                overflow: "hidden",
                background: "var(--surface-0)",
              }}
            >
              <img
                src="/images/man_ai_mind.jpg"
                alt="Human reflecting with AI circuit mind profile"
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9, transition: "opacity 300ms" }}
                className="hover:opacity-100"
              />
            </div>
            <div
              style={{
                padding: "36px 40px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <span className="label-tag" style={{ marginBottom: 10, color: "var(--sunglow)" }}>Neural Memory Bank</span>
              <h3
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontSize: "1.35rem",
                  fontWeight: 600,
                  color: "#FAF6FF",
                  marginBottom: 12,
                  letterSpacing: "-0.015em",
                }}
              >
                A presence that feels genuinely familiar
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.65 }}>
                By mapping conversation nuance, speech cadences, and personal reflections
                into private vector memories, your companion communicates with genuine
                warmth and deep contextual memory.
              </p>
            </div>
          </motion.div>
        </Section>

        {/* ────────────────────────────────────────────────────
            BENTO FEATURE GRID
        ──────────────────────────────────────────────────── */}
        <Section style={{ paddingTop: 16, paddingBottom: 48 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: 14,
            }}
          >
            {/* Large Feature Card — spans 6 cols */}
            <motion.div
              variants={itemVariants}
              style={{
                gridColumn: "span 12",
                borderRadius: 24,
                background: "var(--surface-0)",
                border: "1px solid var(--border-1)",
                padding: "36px",
                position: "relative",
                overflow: "hidden",
                minHeight: 280,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "border-color 250ms, transform 250ms",
              }}
              whileHover={{ y: -3, borderColor: "rgba(255,209,102,0.4)" }}
              className="lg:col-span-6"
            >
              {/* Card inner glow */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: -80,
                  right: -80,
                  width: 240,
                  height: 240,
                  borderRadius: "50%",
                  background: "rgba(255, 209, 102, 0.12)",
                  filter: "blur(60px)",
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span className="label-tag" style={{ color: "var(--sunglow)" }}>Connection &amp; Trust</span>
                  <div className="glow-dot" style={{ width: 6, height: 6 }} />
                </div>
                <h3
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    fontSize: "1.45rem",
                    fontWeight: 600,
                    color: "#FAF6FF",
                    marginBottom: 10,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Memories that endure across generations
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.65, maxWidth: 440 }}>
                  Share heartfelt family stories, upload raw voice recordings, and import
                  letters. Every interaction is anchored in true lived experiences.
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  paddingTop: 20,
                  borderTop: "1px solid var(--border-0)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {[
                  { icon: ShieldCheck, label: "99.8% Recall Fidelity", desc: "Strict vector retrieval verification" },
                  { icon: Sparkles, label: "Multi-Modal Ingestion", desc: "Audio, journals, stories, letters" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    style={{
                      padding: "14px",
                      borderRadius: 16,
                      background: "rgba(188, 150, 230, 0.08)",
                      border: "1px solid rgba(188, 150, 230, 0.2)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--sunglow)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                      <Icon size={14} />
                      <span>{label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Medium Card 1 — spans 3 */}
            <motion.div
              variants={itemVariants}
              style={{
                gridColumn: "span 12",
                borderRadius: 24,
                background: "var(--surface-0)",
                border: "1px solid var(--border-1)",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 240,
                position: "relative",
                overflow: "hidden",
                transition: "border-color 250ms, transform 250ms",
              }}
              whileHover={{ y: -3, borderColor: "rgba(188,150,230,0.4)" }}
              className="md:col-span-6 lg:col-span-3"
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: -40,
                  left: -40,
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background: "rgba(188, 150, 230, 0.15)",
                  filter: "blur(50px)",
                }}
              />
              <div>
                <span className="label-tag" style={{ marginBottom: 12, display: "block", color: "var(--wisteria)" }}>Integrity</span>
                <h3
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    color: "#FAF6FF",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.3,
                  }}
                >
                  Always authentic,<br />always grounded
                </h3>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65, position: "relative", zIndex: 1 }}>
                Multi-tier anti-hallucination verification ensures the companion honors
                memory gaps rather than fabricating events.
              </p>
            </motion.div>

            {/* Medium Card 2 — spans 3 */}
            <motion.div
              variants={itemVariants}
              style={{
                gridColumn: "span 12",
                borderRadius: 24,
                background: "var(--surface-0)",
                border: "1px solid var(--border-1)",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 240,
                position: "relative",
                overflow: "hidden",
                transition: "border-color 250ms, transform 250ms",
              }}
              whileHover={{ y: -3, borderColor: "rgba(255,209,102,0.4)" }}
              className="md:col-span-6 lg:col-span-3"
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background: "rgba(255, 209, 102, 0.14)",
                  filter: "blur(50px)",
                }}
              />
              <div>
                <span className="label-tag" style={{ marginBottom: 12, display: "block", color: "var(--sunglow)" }}>Sovereignty</span>
                <h3
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    color: "#FAF6FF",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.3,
                  }}
                >
                  100%<br />private &amp; secure
                </h3>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65, position: "relative", zIndex: 1 }}>
                You own your memories. Encrypted vectors, one-click full archive export,
                zero training on public universal models.
              </p>
            </motion.div>
          </div>
        </Section>

        {/* ────────────────────────────────────────────────────
            TRUST BAR
        ──────────────────────────────────────────────────── */}
        <Section style={{ paddingBottom: 48 }}>
          <motion.div
            variants={itemVariants}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px 32px",
              paddingTop: 24,
              borderTop: "1px solid var(--border-0)",
            }}
          >
            <p style={{ fontSize: 12, color: "var(--text-2)", maxWidth: 240, lineHeight: 1.5 }}>
              Engineered with grief counselors, privacy ethicists, and neural vector security.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px 24px",
                opacity: 0.7,
                transition: "opacity 300ms",
              }}
              className="hover:opacity-100"
            >
              {["SUPABASE ENCLAVE", "QDRANT VECTOR CLOUD", "UPSTASH REDIS", "ELEVENLABS NEURAL", "AES-256 ENCRYPTION", "ETHICAL AI AUDITED"].map((t) => (
                <span key={t} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--wisteria)" }}>
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        </Section>

        {/* ────────────────────────────────────────────────────
            USE CASES
        ──────────────────────────────────────────────────── */}
        <Section style={{ paddingTop: 32, paddingBottom: 80 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 40,
              alignItems: "start",
            }}
            className="lg:grid-cols-2 lg:gap-20"
          >
            {/* Left */}
            <motion.div variants={itemVariants} style={{ paddingTop: 8 }}>
              <span className="label-tag" style={{ marginBottom: 12, display: "block", color: "var(--sunglow)" }}>✦ Sanctuary Stories</span>
              <h2
                style={{
                  fontFamily: "Outfit, sans-serif",
                  fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "#FAF6FF",
                  lineHeight: 1.15,
                  marginBottom: 16,
                }}
              >
                Preservation cases
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.65, marginBottom: 28 }}>
                Eternia provides an emotional sanctuary for families, historians, and
                individuals seeking authentic conversational memory preservation.
              </p>

              {/* Tab Buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {Object.entries({
                  memorials: "Family Memorials",
                  livingHistory: "Living History",
                  journal: "Personal Legacy",
                }).map(([id, name]) => (
                  <motion.button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      fontSize: 13,
                      fontWeight: activeTab === id ? 700 : 500,
                      padding: "9px 20px",
                      borderRadius: 9999,
                      border: activeTab === id ? "1px solid rgba(255, 209, 102, 0.55)" : "1px solid var(--border-1)",
                      background: activeTab === id ? "rgba(255, 209, 102, 0.16)" : "transparent",
                      color: activeTab === id ? "#FFD166" : "var(--text-1)",
                      cursor: "pointer",
                      transition: "all 200ms",
                    }}
                  >
                    {name}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Right: Case Card */}
            <motion.div variants={itemVariants}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    borderRadius: 24,
                    background: "var(--surface-0)",
                    border: "1px solid var(--border-1)",
                    overflow: "hidden",
                    boxShadow: "0 16px 40px rgba(18, 5, 24, 0.7)",
                  }}
                >
                  <div style={{ padding: "32px 32px 20px" }}>
                    <h3
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        color: "#FAF6FF",
                        letterSpacing: "-0.015em",
                        marginBottom: 12,
                      }}
                    >
                      {currentCase.title}
                    </h3>
                    <p style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.65, marginBottom: 20 }}>
                      {currentCase.content}
                    </p>
                    <Link
                      href={currentCase.link}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "var(--sunglow)",
                        textDecoration: "none",
                        transition: "color 150ms",
                      }}
                      className="hover:underline"
                    >
                      <ArrowRight size={15} />
                      {currentCase.linkText}
                    </Link>
                  </div>
                  <div style={{ padding: "0 20px 20px" }}>
                    <div
                      style={{
                        borderRadius: 18,
                        overflow: "hidden",
                        border: "1px solid var(--border-0)",
                        background: "var(--void)",
                      }}
                    >
                      <img
                        src="/images/ai_human_split.jpg"
                        alt="Neural circuit brain merging with human profile"
                        style={{
                          width: "100%",
                          maxHeight: 220,
                          objectFit: "contain",
                          opacity: 0.95,
                          transition: "opacity 300ms, transform 300ms",
                          display: "block",
                        }}
                        className="hover:opacity-100 hover:scale-105"
                      />
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </Section>

      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1280,
          margin: "0 auto",
          padding: "32px 24px 40px",
          borderTop: "1px solid var(--border-1)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #210B2C, #BC96E6)",
                border: "1px solid rgba(255, 209, 102, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFD166">
                <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
              </svg>
            </div>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "#FAF6FF", fontFamily: "Outfit, sans-serif" }}>Eternia</span>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>
              © {new Date().getFullYear()} Sacred memory sanctuary.
            </span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { href: "/chat", label: "Chat" },
              { href: "/voice", label: "Voice Talk" },
              { href: "/call", label: "Video Call" },
              { href: "/onboarding", label: "New Companion" },
              { href: "/settings", label: "Settings" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{ fontSize: 13, color: "var(--text-2)", textDecoration: "none", transition: "color 150ms" }}
                className="hover:text-[#FFD166]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
