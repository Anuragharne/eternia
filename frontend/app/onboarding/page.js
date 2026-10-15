"use client";

import { useState } from "react";

const STEPS = [
  { id: "intent", label: "Who" },
  { id: "consent", label: "Consent" },
  { id: "photos", label: "Photos" },
  { id: "voice", label: "Voice" },
  { id: "memories", label: "Memories" },
  { id: "training", label: "Creating" },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    relationship: "",
    subjectType: "",
    bio: "",
    consentAI: false,
    consentData: false,
  });

  const step = STEPS[currentStep];

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <>
      <nav className="navbar">
        <a href="/" className="navbar-brand" style={{ color: "inherit" }}>
          <div className="navbar-brand-icon">✦</div>
          Eternia
        </a>
        <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          Step {currentStep + 1} of {STEPS.length}
        </span>
      </nav>

      <div className="onboarding">
        <div className="onboarding-card animate-fade-in">
          {/* Progress bar */}
          <div className="onboarding-progress">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`progress-step ${
                  i < currentStep ? "completed" : i === currentStep ? "active" : ""
                }`}
              />
            ))}
          </div>

          {/* Step 1: Intent */}
          {step.id === "intent" && (
            <>
              <div className="onboarding-header">
                <h2>Who would you like to remember?</h2>
                <p>Tell us about the person you want to preserve.</p>
              </div>
              <div className="onboarding-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Their Name</label>
                  <input
                    id="name"
                    className="input"
                    type="text"
                    placeholder="e.g., Amma, Dad, Grandpa Ravi"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="relationship">Your Relationship</label>
                  <select
                    id="relationship"
                    className="form-select"
                    value={formData.relationship}
                    onChange={(e) => updateField("relationship", e.target.value)}
                  >
                    <option value="">Select relationship...</option>
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="spouse">Spouse / Partner</option>
                    <option value="sibling">Sibling</option>
                    <option value="grandparent">Grandparent</option>
                    <option value="child">Child</option>
                    <option value="friend">Friend</option>
                    <option value="self">Myself (self-preservation)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Is this person...</label>
                  <div style={{ display: "flex", gap: "var(--space-3)" }}>
                    {[
                      { value: "living", label: "🌿 Living", desc: "They will create their own profile" },
                      { value: "deceased", label: "🕊️ No longer with us", desc: "You'll create it on their behalf" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        className={`card ${formData.subjectType === opt.value ? "" : ""}`}
                        style={{
                          flex: 1,
                          cursor: "pointer",
                          textAlign: "center",
                          border:
                            formData.subjectType === opt.value
                              ? "1px solid var(--brand-primary)"
                              : "1px solid var(--border-subtle)",
                          background:
                            formData.subjectType === opt.value
                              ? "rgba(139, 92, 246, 0.08)"
                              : "var(--bg-card)",
                        }}
                        onClick={() => updateField("subjectType", opt.value)}
                      >
                        <div style={{ fontSize: "var(--text-2xl)", marginBottom: "var(--space-2)" }}>
                          {opt.label.split(" ")[0]}
                        </div>
                        <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                          {opt.label.split(" ").slice(1).join(" ")}
                        </div>
                        <p style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--text-muted)",
                          marginTop: "var(--space-1)",
                        }}>
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Consent */}
          {step.id === "consent" && (
            <>
              <div className="onboarding-header">
                <h2>A Moment of Understanding</h2>
                <p>
                  Before we continue, we need to make sure everyone is on the same page.
                </p>
              </div>
              <div className="onboarding-form">
                {formData.subjectType === "living" && (
                  <div className="card" style={{ background: "rgba(96, 165, 250, 0.08)", border: "1px solid rgba(96, 165, 250, 0.2)" }}>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--color-info)" }}>
                      ℹ️ Since {formData.name || "this person"} is living, they will need to create
                      their own Eternia account and provide their data and consent directly.
                      We&apos;ll send them an invitation.
                    </p>
                  </div>
                )}
                <label
                  style={{
                    display: "flex",
                    gap: "var(--space-3)",
                    alignItems: "flex-start",
                    cursor: "pointer",
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.consentAI}
                    onChange={(e) => updateField("consentAI", e.target.checked)}
                    style={{ marginTop: 3, accentColor: "var(--brand-primary)" }}
                  />
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    I understand that this is an <strong style={{ color: "var(--text-primary)" }}>AI approximation</strong>,
                    not {formData.name || "the real person"}. It reflects uploaded memories and
                    may not perfectly represent them.
                  </span>
                </label>
                <label
                  style={{
                    display: "flex",
                    gap: "var(--space-3)",
                    alignItems: "flex-start",
                    cursor: "pointer",
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.consentData}
                    onChange={(e) => updateField("consentData", e.target.checked)}
                    style={{ marginTop: 3, accentColor: "var(--brand-primary)" }}
                  />
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    I understand how my data will be used: encrypted storage, never sold,
                    deletable at any time. I have read the{" "}
                    <a href="/privacy" style={{ color: "var(--brand-secondary)" }}>Privacy Policy</a>.
                  </span>
                </label>
                {formData.subjectType === "deceased" && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="proof">
                      Relationship Proof (optional)
                    </label>
                    <input
                      id="proof"
                      className="input"
                      type="text"
                      placeholder="Link to obituary, memorial page, or description"
                    />
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
                      This helps us verify your relationship. A simple description is fine.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 3: Photos */}
          {step.id === "photos" && (
            <>
              <div className="onboarding-header">
                <h2>Share a Photo of {formData.name || "Them"}</h2>
                <p>A clear, front-facing photo works best. You can add more later.</p>
              </div>
              <div className="upload-zone">
                <div className="upload-icon">📸</div>
                <h4>Drag & drop a photo here</h4>
                <p>or click to browse · JPEG, PNG, WebP</p>
                <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)" }}>
                  Minimum 1 photo · Recommended 5+ for better expressions
                </p>
              </div>
            </>
          )}

          {/* Step 4: Voice */}
          {step.id === "voice" && (
            <>
              <div className="onboarding-header">
                <h2>Their Voice</h2>
                <p>Even 5 seconds of audio helps us recreate their unique sound.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div className="upload-zone">
                  <div className="upload-icon">🎤</div>
                  <h4>Upload a Recording</h4>
                  <p>Voicemails, videos, voice notes · Any format</p>
                </div>

                {/* Voice Recovery Assistant */}
                <div
                  className="card"
                  style={{
                    background: "rgba(139, 92, 246, 0.06)",
                    border: "1px solid rgba(139, 92, 246, 0.15)",
                  }}
                >
                  <h4 style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-3)", color: "var(--brand-accent)" }}>
                    🔍 Voice Recovery Assistant
                  </h4>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
                    Can&apos;t find a recording? Most people have audio they&apos;ve forgotten about:
                  </p>
                  <ul style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}>
                    <li>📱 Check saved voicemails on your phone</li>
                    <li>💬 WhatsApp / Telegram voice notes</li>
                    <li>🎬 Videos where {formData.name || "they"} speak</li>
                    <li>☁️ Google Photos or iCloud video search</li>
                    <li>👨‍👩‍👧 Ask family — someone may have recordings</li>
                  </ul>
                </div>

                <button
                  className="btn btn-ghost"
                  onClick={nextStep}
                  style={{ alignSelf: "center" }}
                >
                  Skip for now — use a neutral voice
                </button>
              </div>
            </>
          )}

          {/* Step 5: Memories */}
          {step.id === "memories" && (
            <>
              <div className="onboarding-header">
                <h2>Share Your Memories</h2>
                <p>
                  The more you share, the richer the conversations will be.
                  You can always add more later.
                </p>
              </div>
              <div className="onboarding-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="memory1">
                    What&apos;s a favorite story {formData.name || "they"} loved to tell?
                  </label>
                  <textarea
                    id="memory1"
                    className="input"
                    rows={3}
                    placeholder="e.g., They always told the story about the time they..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="memory2">
                    What phrases did {formData.name || "they"} always say?
                  </label>
                  <textarea
                    id="memory2"
                    className="input"
                    rows={2}
                    placeholder='e.g., "Everything happens for a reason" or "Have you eaten?"'
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="memory3">
                    Describe a holiday or tradition you shared
                  </label>
                  <textarea
                    id="memory3"
                    className="input"
                    rows={3}
                    placeholder="e.g., Every Diwali we would..."
                  />
                </div>

                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-4)",
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
                    Have existing conversations or journals?
                  </p>
                  <button className="btn btn-secondary btn-sm">
                    📁 Import Chat Export or Journal
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 6: Training */}
          {step.id === "training" && (
            <div style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "var(--radius-full)",
                  background: "var(--gradient-brand)",
                  margin: "0 auto var(--space-6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--text-3xl)",
                  animation: "pulse-glow 2s ease-in-out infinite",
                }}
              >
                ✦
              </div>
              <h2 style={{ marginBottom: "var(--space-3)" }}>
                Building {formData.name || "Their"}&apos;s Presence...
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-8)" }}>
                We&apos;re processing your uploads and building the memory foundation.
                This usually takes 2–5 minutes.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                  maxWidth: 300,
                  margin: "0 auto",
                }}
              >
                {[
                  { label: "Processing photos", done: true },
                  { label: "Extracting memories", done: true },
                  { label: "Building personality model", done: false },
                  { label: "Preparing conversation engine", done: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      fontSize: "var(--text-sm)",
                      color: item.done ? "var(--color-success)" : "var(--text-muted)",
                    }}
                  >
                    <span>{item.done ? "✅" : "⏳"}</span>
                    {item.label}
                  </div>
                ))}
              </div>
              <a
                href="/chat"
                className="btn btn-primary btn-lg"
                style={{ marginTop: "var(--space-10)" }}
              >
                Meet {formData.name || "Them"} →
              </a>
            </div>
          )}

          {/* Navigation */}
          {step.id !== "training" && (
            <div className="onboarding-actions">
              <button
                className="btn btn-ghost"
                onClick={prevStep}
                disabled={currentStep === 0}
                style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={nextStep}
                disabled={
                  (step.id === "intent" &&
                    (!formData.name || !formData.relationship || !formData.subjectType)) ||
                  (step.id === "consent" &&
                    (!formData.consentAI || !formData.consentData))
                }
              >
                Continue →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
