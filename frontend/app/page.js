"use client";

import { useState } from "react";

export default function LandingPage() {
  const [email, setEmail] = useState("");

  return (
    <>
      {/* ============ NAVBAR ============ */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-brand-icon">✦</div>
          Eternia
        </div>
        <ul className="navbar-links">
          <li><a href="#features">How It Works</a></li>
          <li><a href="#privacy">Privacy</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>
        <div className="navbar-actions">
          <a href="/auth/login" className="btn btn-ghost">Sign In</a>
          <a href="/auth/signup" className="btn btn-primary">Get Started</a>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
        <div className="hero-content">
          <div className="hero-badge">
            ✨ AI-Powered Memory Preservation
          </div>
          <h1 className="hero-title">
            Preserve the Ones{" "}
            <span className="text-gradient">You Love</span>
          </h1>
          <p className="hero-subtitle">
            Upload photos, voice recordings, and memories to create an AI
            companion that looks, sounds, and remembers — just like them.
          </p>
          <div className="hero-actions">
            <a href="/auth/signup" className="btn btn-primary btn-lg">
              Begin Preserving Memories
            </a>
            <a href="#features" className="btn btn-secondary btn-lg">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="features" id="features">
        <div className="container">
          <div className="features-header">
            <h2>
              More Than a Chatbot.{" "}
              <span className="text-gradient">A Living Memory.</span>
            </h2>
            <p>
              Every conversation is grounded in real memories — never
              fabricated, always authentic.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h3>Their Face</h3>
              <p>
                Upload a single photo and see your loved one come to life with
                natural expressions, head movements, and lip-synced speech.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎤</div>
              <h3>Their Voice</h3>
              <p>
                From just 5 seconds of audio — a voicemail, a video, a voice
                note — hear them speak again with their exact tone and cadence.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📖</div>
              <h3>Their Memories</h3>
              <p>
                Share stories, upload journals, import chat histories. The AI
                remembers what you tell it — and never invents what it
                doesn&apos;t know.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>Your Privacy</h3>
              <p>
                Military-grade encryption. You own your data. Export or delete
                anytime. We&apos;ll never sell, share, or train on your
                memories.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💛</div>
              <h3>Emotionally Safe</h3>
              <p>
                Built with grief counselors. Crisis detection, session limits,
                and one-click access to professional support when you need it.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>Family Sharing</h3>
              <p>
                Share the experience with up to 5 family members. Everyone
                grieves differently — everyone deserves access.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section
        style={{
          padding: "var(--space-24) var(--space-6)",
          background: "var(--bg-primary)",
        }}
      >
        <div className="container">
          <div className="features-header">
            <h2>
              Three Steps to{" "}
              <span className="text-gradient">Reconnect</span>
            </h2>
            <p>No technical knowledge needed. We guide you through every step.</p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "var(--space-8)",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            {[
              {
                step: "01",
                title: "Share Their Story",
                desc: "Upload photos, voice recordings, and memories. We guide you with gentle prompts — no overwhelming forms.",
              },
              {
                step: "02",
                title: "We Build Their Presence",
                desc: "Our AI learns their face, voice, and personality from your uploads. This takes just a few minutes.",
              },
              {
                step: "03",
                title: "Start Talking",
                desc: "Have a conversation grounded in real memories. Add more memories over time to deepen the connection.",
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  textAlign: "center",
                  padding: "var(--space-8) var(--space-4)",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--text-5xl)",
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    background: "var(--gradient-warm)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  {item.step}
                </div>
                <h3
                  style={{
                    fontSize: "var(--text-xl)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TRUST / PRIVACY ============ */}
      <section
        className="features"
        id="privacy"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="container">
          <div className="features-header">
            <h2>
              Built on{" "}
              <span className="text-gradient">Trust</span>
            </h2>
            <p>
              Your memories are sacred. Our security reflects that.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "var(--space-6)",
              maxWidth: "var(--container-max)",
              margin: "0 auto",
            }}
          >
            {[
              {
                icon: "🔒",
                title: "AES-256 Encryption",
                desc: "All data encrypted at rest and in transit. Your memories are unreadable without your keys.",
              },
              {
                icon: "📤",
                title: "Export Anytime",
                desc: "Download all your data as a ZIP file — photos, audio, memories, chat logs. You own everything.",
              },
              {
                icon: "🗑️",
                title: "Delete Anytime",
                desc: "Full data deletion within 24 hours. No questions asked. Consent audit logs retained for compliance only.",
              },
              {
                icon: "🚫",
                title: "Never Sold",
                desc: "Your data is never sold, shared, or used to train other models. Period.",
              },
            ].map((item) => (
              <div key={item.title} className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "var(--text-3xl)", marginBottom: "var(--space-3)" }}>
                  {item.icon}
                </div>
                <h4 style={{ marginBottom: "var(--space-2)" }}>{item.title}</h4>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section
        style={{
          padding: "var(--space-24) var(--space-6)",
          background: "var(--bg-primary)",
          textAlign: "center",
        }}
      >
        <div className="container" style={{ maxWidth: "600px" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-4xl)",
              marginBottom: "var(--space-4)",
            }}
          >
            Ready to{" "}
            <span className="text-gradient">Remember?</span>
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "var(--space-8)",
              fontSize: "var(--text-lg)",
            }}
          >
            Start with a free account. No credit card required.
            Your first 30 days include full access to voice conversations.
          </p>
          <a href="/auth/signup" className="btn btn-primary btn-lg">
            Begin Preserving Memories
          </a>
          <p
            style={{
              marginTop: "var(--space-6)",
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
            }}
          >
            Free forever plan available · No credit card required · Cancel anytime
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer
        style={{
          padding: "var(--space-12) var(--space-6)",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-4)",
          }}
        >
          <div className="navbar-brand">
            <div className="navbar-brand-icon">✦</div>
            Eternia
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            © {new Date().getFullYear()} Eternia. Built with care for those who remember.
          </p>
          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            <a
              href="/privacy"
              style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}
            >
              Privacy
            </a>
            <a
              href="/terms"
              style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}
            >
              Terms
            </a>
            <a
              href="/support"
              style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
