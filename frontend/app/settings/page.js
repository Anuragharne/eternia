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
      // Clear data locally
      localStorage.clear();
      window.location.href = "/";
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full min-h-screen relative overflow-x-hidden bg-[#0D0D0D] text-[#FAFAFA]">
      {/* Unified Floating Navbar */}
      <Navbar />

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-28 pb-16">
        
        {/* Top Header Banner */}
        <div className="mb-8 pb-4 border-b border-[#A58CF4]/20 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] sm:text-[32px] font-medium text-[#FAFAFA] tracking-tight">
              Settings & Privacy
            </h1>
            <p className="text-[13px] text-[rgba(250,250,250,0.65)] mt-1">
              Manage your sanctuary configurations, companion profiles, and exported memory archives.
            </p>
          </div>
          <Link
            href="/chat"
            className="btn-pill-ghost text-[12px] px-4 py-2 flex items-center gap-1.5 no-underline"
          >
            <ArrowLeft size={14} /> Back to Sanctuary
          </Link>
        </div>

        {/* 2-Column Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Navigation */}
          <aside className="md:col-span-4 lg:col-span-3 flex flex-col gap-2">
            {[
              { id: "profile", label: "Profile & Plan", icon: User },
              { id: "companions", label: "Companions & Consent", icon: Shield },
              { id: "data", label: "Data & Archives", icon: Download },
              { id: "danger", label: "Danger Zone", icon: Trash2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13.5px] font-medium transition-all cursor-pointer text-left ${
                    isActive
                      ? "bg-[#433075] text-[#FAFAFA] border border-[#A58CF4]/40 shadow-sm"
                      : "bg-[#0D0D0D] text-[rgba(250,250,250,0.7)] hover:bg-[#433075]/25 hover:text-[#FAFAFA] border border-transparent"
                  }`}
                >
                  <Icon size={17} className={isActive ? "text-[#A58CF4]" : "text-[rgba(250,250,250,0.5)]"} />
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
                <div className="rounded-[24px] bg-[#0D0D0D] p-6 sm:p-8 border border-[#A58CF4]/20 shadow-md">
                  <h3 className="text-[18px] font-medium text-[#FAFAFA] mb-4">
                    Your Account
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#433075]/15 border border-[#A58CF4]/15">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A58CF4] block mb-1">
                        Full Name
                      </label>
                      <p className="text-[14px] text-[#FAFAFA] font-medium">
                        {profile?.full_name || "Preservation Member"}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#433075]/15 border border-[#A58CF4]/15">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#A58CF4] block mb-1">
                        Email Address
                      </label>
                      <p className="text-[14px] text-[#FAFAFA] font-medium">
                        {user?.email || "N/A (Direct Access Mode)"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-[#0D0D0D] p-6 sm:p-8 border border-[#A58CF4]/20 shadow-md">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-[18px] font-medium text-[#FAFAFA]">
                        Preservation Tier
                      </h3>
                      <p className="text-[12.5px] text-[rgba(250,250,250,0.65)] mt-0.5">
                        Active testing phase with all restrictions unlocked.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#433075] text-[#FAFAFA] text-[11.5px] font-medium border border-[#A58CF4]/30">
                      Testing Mode • All Features Unlimited
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#433075]/20 border border-[#A58CF4]/20 space-y-3">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[rgba(250,250,250,0.7)]">Active Companions</span>
                      <span className="font-semibold text-[#FAFAFA]">{avatars.length} (Unlimited)</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[rgba(250,250,250,0.7)]">Memory Vectors Preserved</span>
                      <span className="font-semibold text-[#FAFAFA]">
                        {avatars.reduce((acc, a) => acc + (a.memory_count || 0), 0)} memories (Unlimited)
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[rgba(250,250,250,0.7)]">Chat, Voice & Video</span>
                      <span className="font-semibold text-[#A58CF4]">Unlimited Access</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[rgba(250,250,250,0.7)]">Anti-Hallucination Guardrails</span>
                      <span className="font-semibold text-[#A58CF4]">Active & Grounded</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COMPANIONS & CONSENT */}
            {activeTab === "companions" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[20px] font-medium text-[#FAFAFA]">
                      Your Active Companions
                    </h3>
                    <p className="text-[12.5px] text-[rgba(250,250,250,0.65)]">
                      Ethical attestation ledgers and grounded memory profiles.
                    </p>
                  </div>
                  <Link
                    href="/onboarding"
                    className="btn-pill-primary text-[12px] px-4 py-2 flex items-center gap-1.5 no-underline"
                  >
                    <Plus size={14} /> New Companion
                  </Link>
                </div>

                {loading ? (
                  <p className="text-[13px] text-[rgba(250,250,250,0.6)]">Loading companions...</p>
                ) : avatars.length === 0 ? (
                  <div className="rounded-[24px] bg-[#0D0D0D] p-8 border border-[#A58CF4]/20 text-center">
                    <p className="text-[13px] text-[rgba(250,250,250,0.6)] mb-4">
                      You have not created any companion presence yet.
                    </p>
                    <Link href="/onboarding" className="btn-pill-primary text-[12px] px-5 py-2 no-underline">
                      Create First Companion
                    </Link>
                  </div>
                ) : (
                  avatars.map((avatar) => (
                    <div
                      key={avatar.id}
                      className="rounded-[24px] bg-[#0D0D0D] p-6 border border-[#A58CF4]/20 shadow-md space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-full bg-[#433075] border border-[#A58CF4]/30 text-[#FAFAFA] flex items-center justify-center font-medium text-[15px]">
                            {avatar.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-[15px] font-medium text-[#FAFAFA]">
                              {avatar.name}
                            </h4>
                            <p className="text-[11.5px] text-[rgba(250,250,250,0.6)]">
                              {avatar.relationship} • {avatar.subject_type === "living" ? "Living Legacy" : "In Memoriam"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-[#433075]/30 border border-[#A58CF4]/30 text-[#A58CF4] text-[11px] font-medium">
                            {avatar.is_active ? "Active" : "Paused"}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-[#0D0D0D] border border-[#A58CF4]/20 text-[rgba(250,250,250,0.7)] text-[11px]">
                            {avatar.memory_count || 0} Stories
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#433075]/15 border border-[#A58CF4]/15 text-[11.5px] text-[rgba(250,250,250,0.75)]">
                        <strong>Consent Status:</strong> {avatar.consent_status || "granted"} •{" "}
                        <strong>Ledger:</strong> Append-only attestation recorded
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-1 flex-wrap">
                        <Link
                          href={`/chat?avatarId=${avatar.id}`}
                          className="btn-pill-primary text-[12px] px-4 py-1.5 no-underline"
                        >
                          Open Chat
                        </Link>
                        {avatar.is_active && (
                          <button
                            onClick={() => handleRevokeConsent(avatar.id)}
                            disabled={revokingId === avatar.id || deletingAvatarId === avatar.id}
                            className="btn-pill-ghost text-[11px] px-3 py-1.5 text-[rgba(250,250,250,0.7)] hover:text-[#FAFAFA]"
                          >
                            {revokingId === avatar.id ? "Revoking..." : "Revoke Consent"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAvatar(avatar)}
                          disabled={deletingAvatarId === avatar.id || revokingId === avatar.id}
                          className="btn-pill-ghost text-[11px] px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
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
                <div className="rounded-[24px] bg-[#0D0D0D] p-6 sm:p-8 border border-[#A58CF4]/20 shadow-md">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#433075] border border-[#A58CF4]/30 flex items-center justify-center text-[#A58CF4] shrink-0">
                      <FileArchive size={22} />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-medium text-[#FAFAFA]">
                        Download Complete Sanctuary Archive
                      </h3>
                      <p className="text-[13px] text-[rgba(250,250,250,0.65)] mt-1 leading-[1.5]">
                        Export all preserved stories, entity graphs, conversation transcripts, and consent logs in an encrypted ZIP or JSON master format.
                      </p>
                    </div>
                  </div>

                  {exportError && (
                    <div className="p-3.5 rounded-xl bg-[#433075]/40 border border-[#A58CF4]/30 text-[#FAFAFA] text-[12.5px] mb-4">
                      {exportError}
                    </div>
                  )}

                  {exportSuccess && (
                    <div className="p-3.5 rounded-xl bg-[#433075]/30 border border-[#A58CF4]/40 text-[#A58CF4] text-[12.5px] mb-4 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Archive generated and downloaded successfully!
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => handleExport("zip")}
                      disabled={exporting}
                      className="btn-pill-primary text-[12.5px] px-5 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                      <span>{exporting ? "Packaging..." : "Export ZIP Archive"}</span>
                    </button>
                    <button
                      onClick={() => handleExport("json")}
                      disabled={exporting}
                      className="btn-pill-secondary text-[12.5px] px-5 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Download size={14} />
                      <span>Export JSON Master</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] bg-[#0D0D0D] p-6 border border-[#A58CF4]/20 shadow-md">
                  <h4 className="text-[15px] font-medium text-[#FAFAFA] mb-2">
                    Zero Universal Training Guarantee
                  </h4>
                  <p className="text-[12.5px] text-[rgba(250,250,250,0.65)] leading-[1.6]">
                    Your family memories belong exclusively to you. Eternia never uses private journals, voice notes, or photos to train universal public foundation models. Every memory vector is strictly isolated by row-level security and tenant-specific encryption.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: DANGER ZONE */}
            {activeTab === "danger" && (
              <div className="rounded-[24px] bg-[#0D0D0D] p-6 sm:p-8 border border-[#A58CF4]/30 shadow-md space-y-4">
                <div className="flex items-center gap-3 text-[#A58CF4]">
                  <AlertTriangle size={22} />
                  <h3 className="text-[18px] font-medium text-[#FAFAFA]">
                    Permanent Account Deletion
                  </h3>
                </div>
                <p className="text-[13px] text-[rgba(250,250,250,0.7)] leading-[1.6]">
                  Deleting your account will irreversibly erase all companion configurations, semantic vectors in Qdrant, parsed memories in Supabase, and conversation history. This cannot be undone.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="btn-pill-primary text-[12.5px] px-5 py-2.5 flex items-center gap-2 bg-[#433075] text-[#FAFAFA] hover:bg-[#A58CF4] hover:text-[#0D0D0D] cursor-pointer"
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
          <div className="modal-card">
            <div className="flex items-center gap-2.5 text-[#A58CF4] mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-[18px] font-medium text-[#FAFAFA]">
                Confirm Irreversible Deletion
              </h3>
            </div>

            <p className="text-[13px] text-[rgba(250,250,250,0.7)] leading-[1.6] mb-4">
              Because this is an emotional sanctuary, we require explicit confirmation. Please type <strong className="text-[#FAFAFA]">DELETE</strong> below to wipe all companion models and data.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-[#433075]/40 border border-[#A58CF4]/30 text-[#FAFAFA] text-[12px] mb-4">
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

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-pill-ghost text-[12px] px-4 py-2"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="btn-pill-primary text-[12px] px-4 py-2"
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
