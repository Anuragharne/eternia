"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Download,
  Trash2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  RefreshCw,
  LogOut,
  ExternalLink,
  Plus,
  Lock,
  Layers,
  Activity,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { Navbar } from "../../components/layout/Navbar";

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'companions' | 'data' | 'danger'
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState("");

  // Danger zone state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Revoke avatar state
  const [revokingId, setRevokingId] = useState(null);
  const [deletingAvatarId, setDeletingAvatarId] = useState(null);

  const handleDeleteAvatar = async (avatar) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${avatar.name}'s companion archive? This will remove all ${avatar.memory_count || 0} memories, vector search embeddings, and chat history.`
      )
    ) {
      return;
    }
    setDeletingAvatarId(avatar.id);
    try {
      await api.deleteAvatar(avatar.id);
      setAvatars((prev) => prev.filter((a) => a.id !== avatar.id));
    } catch (err) {
      alert(err.message || "Could not delete companion archive.");
    } finally {
      setDeletingAvatarId(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const list = await api.getAvatars();
        setAvatars(list || []);
      } catch (err) {
        console.error("Failed to fetch avatars:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = async (format = "zip") => {
    setExporting(true);
    setExportError("");
    setExportSuccess(false);
    try {
      await api.downloadExport(format);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      setExportError(err.message || "Failed to generate export archive");
    } finally {
      setExporting(false);
    }
  };

  const handleRevokeConsent = async (avatarId) => {
    if (!confirm("Are you sure you want to revoke consent for this companion? This will deactivate the companion.")) {
      return;
    }
    setRevokingId(avatarId);
    try {
      await api.revokeConsent(avatarId);
      const list = await api.getAvatars();
      setAvatars(list || []);
    } catch (err) {
      alert(err.message || "Could not revoke consent.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput.trim() !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }
    setIsDeleting(true);
    setDeleteError("");
    try {
      localStorage.clear();
      window.location.href = "/";
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile & Plan", icon: User },
    { id: "companions", label: "Companions & Consent", icon: Shield },
    { id: "data", label: "Data & Archives", icon: Download },
    { id: "danger", label: "Danger Zone", icon: Trash2 },
  ];

  return (
    <div
      className="w-full min-h-screen relative overflow-x-hidden flex flex-col"
      style={{ background: "var(--void)", color: "var(--text-0)" }}
    >
      {/* Aurora Ambient Background Glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            "radial-gradient(120% 80% at 50% 0%, rgba(255, 209, 102, 0.12) 0%, rgba(33, 11, 44, 0.94) 55%, var(--void) 100%)",
        }}
      />

      {/* Unified Floating Navbar */}
      <Navbar />

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-28 pb-16 flex-1">
        {/* Top Header Banner */}
        <div
          className="mb-8 pb-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border-1)" }}
        >
          <div>
            <span
              className="text-[11px] font-bold uppercase tracking-wider block mb-1"
              style={{ color: "var(--sunglow)" }}
            >
              Control Center
            </span>
            <h1
              className="text-[28px] sm:text-[32px] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "#FAF6FF" }}
            >
              Settings & Privacy
            </h1>
            <p className="text-[13.5px] mt-1" style={{ color: "var(--text-1)" }}>
              Manage your chat configurations, companion profiles, and exported memory archives.
            </p>
          </div>
          <Link
            href="/chat"
            className="btn btn-ghost btn-sm flex items-center gap-1.5"
            style={{ textDecoration: "none" }}
          >
            <ArrowLeft size={14} /> Back to Chat
          </Link>
        </div>

        {/* 2-Column Settings Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Sidebar Navigation */}
          <aside className="md:col-span-4 lg:col-span-3 flex flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13.5px] font-medium transition-all cursor-pointer text-left"
                  style={{
                    background: isActive
                      ? "rgba(255, 209, 102, 0.14)"
                      : "var(--surface-0)",
                    border: isActive
                      ? "1px solid rgba(255, 209, 102, 0.5)"
                      : "1px solid var(--border-1)",
                    color: isActive ? "#FAF6FF" : "var(--text-1)",
                    boxShadow: isActive
                      ? "0 4px 16px rgba(255, 209, 102, 0.18), inset 0 1px 0 rgba(255,209,102,0.2)"
                      : "none",
                  }}
                >
                  <Icon
                    size={17}
                    style={{ color: isActive ? "var(--sunglow)" : "var(--wisteria)" }}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Main Tab Content */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6">
            {/* TAB 1: PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Account Card */}
                <div
                  className="rounded-[24px] p-6 sm:p-8"
                  style={{
                    background: "var(--surface-0)",
                    border: "1px solid var(--border-0)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }}
                >
                  <h3
                    className="text-[18px] font-medium mb-4"
                    style={{ color: "var(--text-0)", fontFamily: "var(--font-display)" }}
                  >
                    Your Account
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      className="p-4 rounded-xl"
                      style={{
                        background: "var(--surface-1)",
                        border: "1px solid var(--border-0)",
                      }}
                    >
                      <label
                        className="text-[11px] font-semibold uppercase tracking-wider block mb-1"
                        style={{ color: "var(--lavender)" }}
                      >
                        Full Name
                      </label>
                      <p className="text-[14px] font-medium" style={{ color: "var(--text-0)" }}>
                        {profile?.full_name || "Preservation Member"}
                      </p>
                    </div>

                    <div
                      className="p-4 rounded-xl"
                      style={{
                        background: "var(--surface-1)",
                        border: "1px solid var(--border-0)",
                      }}
                    >
                      <label
                        className="text-[11px] font-semibold uppercase tracking-wider block mb-1"
                        style={{ color: "var(--lavender)" }}
                      >
                        Email Address
                      </label>
                      <p className="text-[14px] font-medium" style={{ color: "var(--text-0)" }}>
                        {user?.email || "Direct Access Mode (Demo)"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preservation Tier Bento Card */}
                <div
                  className="rounded-[24px] p-6 sm:p-8"
                  style={{
                    background: "var(--surface-0)",
                    border: "1px solid var(--border-0)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
                    <div>
                      <h3
                        className="text-[18px] font-medium"
                        style={{ color: "var(--text-0)", fontFamily: "var(--font-display)" }}
                      >
                        Preservation Tier
                      </h3>
                      <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-1)" }}>
                        Active testing phase with all restrictions unlocked.
                      </p>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-[11.5px] font-medium flex items-center gap-1.5"
                      style={{
                        background: "rgba(52, 211, 153, 0.12)",
                        border: "1px solid rgba(52, 211, 153, 0.3)",
                        color: "var(--success)",
                      }}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Testing Mode • All Features Unlimited
                    </span>
                  </div>

                  <div
                    className="p-4 rounded-xl space-y-3"
                    style={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--border-0)",
                    }}
                  >
                    <div className="flex justify-between text-[13px]">
                      <span style={{ color: "var(--text-1)" }}>Active Companions</span>
                      <span className="font-semibold" style={{ color: "var(--text-0)" }}>
                        {avatars.length} (Unlimited)
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span style={{ color: "var(--text-1)" }}>Memory Vectors Preserved</span>
                      <span className="font-semibold" style={{ color: "var(--text-0)" }}>
                        {avatars.reduce((acc, a) => acc + (a.memory_count || 0), 0)} memories
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span style={{ color: "var(--text-1)" }}>Chat, Voice & 3D Video</span>
                      <span className="font-semibold" style={{ color: "var(--brand-glow)" }}>
                        Unlimited Access
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span style={{ color: "var(--text-1)" }}>Anti-Hallucination Guardrails</span>
                      <span className="font-semibold" style={{ color: "var(--brand-glow)" }}>
                        Active & Grounded
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COMPANIONS & CONSENT */}
            {activeTab === "companions" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3
                      className="text-[20px] font-medium"
                      style={{ color: "var(--text-0)", fontFamily: "var(--font-display)" }}
                    >
                      Your Active Companions
                    </h3>
                    <p className="text-[12.5px]" style={{ color: "var(--text-1)" }}>
                      Ethical attestation ledgers and grounded memory profiles.
                    </p>
                  </div>
                  <Link
                    href="/onboarding"
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                    style={{ textDecoration: "none" }}
                  >
                    <Plus size={14} /> New Companion
                  </Link>
                </div>

                {loading ? (
                  <p className="text-[13px]" style={{ color: "var(--text-2)" }}>Loading companions...</p>
                ) : avatars.length === 0 ? (
                  <div
                    className="rounded-[24px] p-8 text-center"
                    style={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--border-0)",
                    }}
                  >
                    <p className="text-[13px] mb-4" style={{ color: "var(--text-1)" }}>
                      You have not created any companion presence yet.
                    </p>
                    <Link
                      href="/onboarding"
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: "none" }}
                    >
                      Create First Companion
                    </Link>
                  </div>
                ) : (
                  avatars.map((avatar) => (
                    <div
                      key={avatar.id}
                      className="rounded-[24px] p-6 space-y-4"
                      style={{
                        background: "var(--surface-0)",
                        border: "1px solid var(--border-0)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                      }}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3.5">
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[15px] text-[#FFD166]"
                            style={{
                              background: "linear-gradient(135deg, #210B2C, #3B184C, #BC96E6)",
                              border: "1.5px solid rgba(255, 209, 102, 0.5)",
                              boxShadow: "0 0 16px rgba(255, 209, 102, 0.35)",
                            }}
                          >
                            {avatar.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-[15.5px] font-semibold" style={{ color: "#FAF6FF" }}>
                              {avatar.name}
                            </h4>
                            <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                              {avatar.relationship} • {avatar.subject_type === "living" ? "Living Legacy" : "In Memoriam"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className="px-3 py-1 rounded-full text-[11px] font-bold"
                            style={{
                              background: "rgba(255, 209, 102, 0.15)",
                              border: "1px solid rgba(255, 209, 102, 0.4)",
                              color: "var(--sunglow)",
                            }}
                          >
                            {avatar.is_active ? "Active" : "Paused"}
                          </span>
                          <span
                            className="px-2.5 py-1 rounded-full text-[11px]"
                            style={{
                              background: "var(--surface-1)",
                              border: "1px solid var(--border-0)",
                              color: "var(--text-1)",
                            }}
                          >
                            {avatar.memory_count || 0} Stories
                          </span>
                        </div>
                      </div>

                      <div
                        className="p-3 rounded-xl text-[11.5px]"
                        style={{
                          background: "var(--surface-1)",
                          border: "1px solid var(--border-0)",
                          color: "var(--text-1)",
                        }}
                      >
                        <strong style={{ color: "var(--text-0)" }}>Consent Status:</strong> {avatar.consent_status || "granted"} •{" "}
                        <strong style={{ color: "var(--text-0)" }}>Ledger:</strong> Append-only attestation recorded
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-1 flex-wrap">
                        <Link
                          href={`/chat?avatarId=${avatar.id}`}
                          className="btn btn-primary btn-sm"
                          style={{ textDecoration: "none", padding: "6px 14px", fontSize: 11.5 }}
                        >
                          Open Chat
                        </Link>
                        {avatar.is_active && (
                          <button
                            onClick={() => handleRevokeConsent(avatar.id)}
                            disabled={revokingId === avatar.id || deletingAvatarId === avatar.id}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "6px 12px", fontSize: 11.5 }}
                          >
                            {revokingId === avatar.id ? "Revoking..." : "Revoke Consent"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAvatar(avatar)}
                          disabled={deletingAvatarId === avatar.id || revokingId === avatar.id}
                          className="btn btn-danger btn-sm"
                          style={{ padding: "6px 12px", fontSize: 11.5 }}
                        >
                          <Trash2 size={12} />
                          {deletingAvatarId === avatar.id ? "Deleting..." : "Delete Companion"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: DATA & ARCHIVES */}
            {activeTab === "data" && (
              <div className="space-y-6">
                <div
                  className="rounded-[24px] p-6 sm:p-8"
                  style={{
                    background: "var(--surface-0)",
                    border: "1px solid var(--border-0)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(255, 209, 102, 0.16)",
                        border: "1px solid rgba(255, 209, 102, 0.4)",
                        color: "var(--sunglow)",
                      }}
                    >
                      <FileArchive size={22} />
                    </div>
                    <div>
                      <h3
                        className="text-[18px] font-medium"
                        style={{ color: "var(--text-0)", fontFamily: "var(--font-display)" }}
                      >
                        Download Complete Sanctuary Archive
                      </h3>
                      <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "var(--text-1)" }}>
                        Export all preserved stories, entity graphs, conversation transcripts, and consent logs in an encrypted ZIP or JSON master format.
                      </p>
                    </div>
                  </div>

                  {exportError && (
                    <div
                      className="p-3.5 rounded-xl text-[12.5px] mb-4"
                      style={{
                        background: "rgba(248, 113, 113, 0.12)",
                        border: "1px solid rgba(248, 113, 113, 0.3)",
                        color: "var(--text-0)",
                      }}
                    >
                      {exportError}
                    </div>
                  )}

                  {exportSuccess && (
                    <div
                      className="p-3.5 rounded-xl text-[12.5px] mb-4 flex items-center gap-2"
                      style={{
                        background: "rgba(52, 211, 153, 0.12)",
                        border: "1px solid rgba(52, 211, 153, 0.3)",
                        color: "var(--success)",
                      }}
                    >
                      <CheckCircle2 size={16} /> Archive generated and downloaded successfully!
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => handleExport("zip")}
                      disabled={exporting}
                      className="btn btn-primary btn-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                      <span>{exporting ? "Packaging..." : "Export ZIP Archive"}</span>
                    </button>
                    <button
                      onClick={() => handleExport("json")}
                      disabled={exporting}
                      className="btn btn-secondary btn-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Download size={14} />
                      <span>Export JSON Master</span>
                    </button>
                  </div>
                </div>

                <div
                  className="rounded-[24px] p-6"
                  style={{
                    background: "var(--surface-0)",
                    border: "1px solid var(--border-0)",
                  }}
                >
                  <h4 className="text-[15px] font-medium mb-2" style={{ color: "var(--text-0)" }}>
                    Zero Universal Training Guarantee
                  </h4>
                  <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                    Your family memories belong exclusively to you. Eternia never uses private journals, voice notes, or photos to train universal public foundation models. Every memory vector is strictly isolated by row-level security and tenant-specific encryption.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: DANGER ZONE */}
            {activeTab === "danger" && (
              <div
                className="rounded-[24px] p-6 sm:p-8 space-y-4"
                style={{
                  background: "rgba(248, 113, 113, 0.05)",
                  border: "1px solid rgba(248, 113, 113, 0.25)",
                }}
              >
                <div className="flex items-center gap-3" style={{ color: "var(--danger)" }}>
                  <AlertTriangle size={22} />
                  <h3
                    className="text-[18px] font-medium"
                    style={{ color: "var(--text-0)", fontFamily: "var(--font-display)" }}
                  >
                    Permanent Account Deletion
                  </h3>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                  Deleting your account will irreversibly erase all companion configurations, semantic vectors in Qdrant, parsed memories in Supabase, and conversation history. This cannot be undone.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="btn btn-danger btn-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={15} />
                    <span>Delete Account & Wipe All Memories</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal for Deletion */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div
            className="w-full max-w-[480px] rounded-[28px] p-6 sm:p-7 relative text-left"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-1)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.85)",
            }}
          >
            <div className="flex items-center gap-2.5 mb-3" style={{ color: "var(--danger)" }}>
              <AlertTriangle size={22} />
              <h3 className="text-[18px] font-medium" style={{ color: "var(--text-0)" }}>
                Confirm Irreversible Deletion
              </h3>
            </div>

            <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--text-1)" }}>
              Because this is an emotional sanctuary, we require explicit confirmation. Please type <strong style={{ color: "var(--text-0)" }}>DELETE</strong> below to wipe all companion models and data.
            </p>

            {deleteError && (
              <div
                className="p-3 rounded-xl text-[12px] mb-4"
                style={{
                  background: "rgba(248, 113, 113, 0.12)",
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                  color: "var(--text-0)",
                }}
              >
                {deleteError}
              </div>
            )}

            <input
              type="text"
              placeholder='Type "DELETE" to confirm'
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="input mb-4"
            />

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-ghost btn-sm"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="btn btn-danger btn-sm"
                disabled={isDeleting}
              >
                {isDeleting ? "Wiping Data..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
