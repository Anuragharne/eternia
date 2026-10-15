"use client";

import { useState } from "react";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Integrate with Supabase Auth
    window.location.href = "/chat";
  };

  return (
    <>
      <nav className="navbar">
        <a href="/" className="navbar-brand" style={{ color: "inherit" }}>
          <div className="navbar-brand-icon">✦</div>
          Eternia
        </a>
      </nav>

      <div className="onboarding">
        <div className="onboarding-card animate-fade-in-up">
          <div className="onboarding-header">
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-xl)",
                background: "var(--gradient-brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--text-2xl)",
                margin: "0 auto var(--space-5)",
              }}
            >
              ✦
            </div>
            <h2>Welcome Back</h2>
            <p>Continue your conversations.</p>
          </div>

          <form className="onboarding-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                placeholder="Your password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "var(--space-4)" }}
            >
              Sign In
            </button>

            <div
              style={{
                textAlign: "center",
                padding: "var(--space-4) 0",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: 1,
                  background: "var(--border-subtle)",
                }}
              />
              <span
                style={{
                  position: "relative",
                  background: "var(--bg-secondary)",
                  padding: "0 var(--space-4)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                }}
              >
                or
              </span>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "100%" }}
            >
              Continue with Google
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              marginTop: "var(--space-6)",
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}
          >
            Don&apos;t have an account?{" "}
            <a href="/auth/signup" style={{ color: "var(--brand-secondary)" }}>
              Create one
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
