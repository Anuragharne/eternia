"use client";

import { useState } from "react";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Integrate with Supabase Auth
    window.location.href = "/onboarding";
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
            <h2>Create Your Account</h2>
            <p>Begin preserving the memories that matter most.</p>
          </div>

          <form className="onboarding-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                className="input"
                type="text"
                placeholder="Your name"
                value={formData.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                required
              />
            </div>
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
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "var(--space-4)" }}
            >
              Create Account
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
            Already have an account?{" "}
            <a href="/auth/login" style={{ color: "var(--brand-secondary)" }}>
              Sign in
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
