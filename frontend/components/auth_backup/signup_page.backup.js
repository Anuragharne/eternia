// Preserved for later re-enabling when requested by user
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";

export default function SignupPageBackup() {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState(false);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await signUpWithEmail(formData.email, formData.password, formData.fullName);
      // If email confirmation is required by Supabase project settings
      if (data?.session) {
        router.push("/onboarding");
      } else {
        setSuccessNotice(true);
        setTimeout(() => {
          router.push("/onboarding");
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Failed to create account. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand" style={{ color: "inherit", textDecoration: "none" }}>
          <div className="navbar-brand-icon">✦</div>
          Eternia
        </Link>
      </nav>

      <div className="onboarding">
        <div className="onboarding-card animate-fade-in-up" style={{ maxWidth: "460px" }}>
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
                margin: "0 auto var(--space-5)",
                boxShadow: "0 0 24px rgba(139, 92, 246, 0.3)",
              }}
            >
              <Sparkles size={28} color="#fff" />
            </div>
            <h2>Create Your Account</h2>
            <p>Begin preserving the memories that matter most.</p>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                borderRadius: "10px",
                background: "rgba(248, 113, 113, 0.12)",
                border: "1px solid rgba(248, 113, 113, 0.3)",
                color: "var(--color-error)",
                fontSize: "0.875rem",
                marginBottom: "20px",
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                borderRadius: "10px",
                background: "rgba(52, 211, 153, 0.12)",
                border: "1px solid rgba(52, 211, 153, 0.3)",
                color: "var(--color-success)",
                fontSize: "0.875rem",
                marginBottom: "20px",
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>Account created! Redirecting to companion onboarding...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Input
              label="Full Name"
              type="text"
              id="fullName"
              placeholder="Your name"
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              required
            />

            <Input
              label="Email"
              type="email"
              id="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              id="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={(e) => updateField("password", e.target.value)}
              required
            />

            <div style={{ marginTop: "12px" }}>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                style={{ width: "100%", height: "46px" }}
              >
                Create Account
              </Button>
            </div>
          </form>

          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Already have an account?{" "}
            <Link href="/auth/login" style={{ color: "var(--brand-secondary)", fontWeight: 500, textDecoration: "none" }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
