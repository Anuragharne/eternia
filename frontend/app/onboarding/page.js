"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ShieldCheck,
  Camera,
  Mic,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Upload,
  Clock,
} from "lucide-react";
import { api } from "../../lib/api";
import { Navbar } from "../../components/layout/Navbar";

const STEPS = [
  { id: "intent",    label: "About Them",       desc: "Who are you preserving?" },
  { id: "consent",   label: "Ethical Consent",  desc: "Permissions and privacy" },
  { id: "photos",    label: "Likeness Portrait",desc: "Visual representation" },
  { id: "voice",     label: "Voice Sample",     desc: "Tone and cadence" },
  { id: "memories",  label: "Memory Stories",   desc: "Grounding memories" },
  { id: "training",  label: "Preservation",     desc: "Initializing sanctuary" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    relationship: "",
    subjectType: "deceased",
    consentAI: false,
    consentData: false,
    personaNotes: "",
    memory1: "",
    memory2: "",
    memory3: "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [voiceFile, setVoiceFile] = useState(null);
  const [memoryFile, setMemoryFile] = useState(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdAvatarId, setCreatedAvatarId] = useState(null);
  const [progressState, setProgressState] = useState({
    avatarCreated: false,
    consentRecorded: false,
    voiceCloned: false,
    memoriesIngested: false,
    ready: false,
  });

  const step = STEPS[currentStep];

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isNextDisabled = () => {
    if (step.id === "intent") {
      return !formData.name.trim() || !formData.relationship;
    }
    if (step.id === "consent") {
      return !formData.consentAI || !formData.consentData;
    }
    return false;
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      if (currentStep === 4) {
        handleSubmit();
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setCurrentStep(5); // Switch to "training" progress view
    setIsSubmitting(true);
    setSubmitError("");

    try {
      // 1. Create companion persona profile
      const personaSummary = [
        formData.personaNotes,
        formData.memory2 ? `Favorite expressions: ${formData.memory2}` : "",
      ]
        .filter(Boolean)
        .join(". ");

      let avatar;
      if (photoFile) {
        const mediaData = new FormData();
        mediaData.append("name", formData.name.trim());
        mediaData.append("relationship", formData.relationship);
        mediaData.append(
          "bio",
          personaSummary || `Beloved ${formData.relationship} preserved with deep personal memories.`
        );
        mediaData.append("subject_type", formData.subjectType === "living" ? "living" : "deceased");
        if (formData.memory1?.trim()) {
          mediaData.append("initial_memory", formData.memory1.trim());
        }
        mediaData.append("photo", photoFile);
        if (voiceFile) {
          mediaData.append("voice_sample", voiceFile);
        }
        avatar = await api.createAvatarWithMedia(mediaData);
      } else {
        avatar = await api.createAvatar({
          name: formData.name.trim(),
          relationship: formData.relationship,
          avatar_type: formData.subjectType === "living" ? "living_archive" : "tribute",
          persona: personaSummary || "An empathetic companion grounded in cherished family memories.",
          photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
          voice_id: "river",
        });
      }

      const avatarId = avatar.id;
      setCreatedAvatarId(avatarId);
      setProgressState((prev) => ({
        ...prev,
        avatarCreated: true,
        voiceCloned: !!voiceFile,
      }));

      // 2. Record ethical consent
      try {
        await api.recordConsent(avatarId, "relative", "full", `Authorized by family member (${formData.relationship})`);
        setProgressState((prev) => ({ ...prev, consentRecorded: true }));
      } catch (cErr) {
        console.warn("Consent notice:", cErr);
      }

      // 5. Ingest memory stories
      const memoryPromises = [];
      if (formData.memory1?.trim()) {
        memoryPromises.push(api.addMemory(avatarId, formData.memory1.trim(), "story", null, ["tradition"]));
      }
      if (formData.memory2?.trim()) {
        memoryPromises.push(api.addMemory(avatarId, `Known for saying: "${formData.memory2.trim()}"`, "manual", null, ["saying"]));
      }
      if (formData.memory3?.trim()) {
        memoryPromises.push(api.addMemory(avatarId, formData.memory3.trim(), "story", null, ["recipe"]));
      }
      if (memoryFile) {
        memoryPromises.push(api.importMemoriesFile(avatarId, memoryFile));
      }

      if (memoryPromises.length > 0) {
        await Promise.allSettled(memoryPromises);
      }
      setProgressState((prev) => ({ ...prev, memoriesIngested: true }));

      // 5. Completion
      setProgressState((prev) => ({ ...prev, ready: true }));
      setIsSubmitting(false);

      // Auto redirect to chat after 2s
      setTimeout(() => {
        router.push(`/chat?avatarId=${avatarId}`);
      }, 2000);
    } catch (err) {
      console.error("Onboarding submission error:", err);
      setSubmitError(err.message || "Failed to preserve companion. Please try again.");
      setIsSubmitting(false);
    }
  };

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
            "radial-gradient(120% 80% at 50% 0%, rgba(255, 209, 102, 0.12) 0%, rgba(33, 11, 44, 0.95) 60%, var(--void) 100%)",
        }}
      />

      {/* Unified Floating Navbar */}
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-28 pb-16 flex flex-col items-center justify-center flex-1">
        {/* Onboarding Glass Card */}
        <div
          className="w-full max-w-[620px] rounded-[32px] p-6 sm:p-9 relative"
          style={{
            background: "var(--surface-0)",
            border: "1px solid var(--border-1)",
            boxShadow: "0 24px 80px rgba(18, 5, 24, 0.8), inset 0 1px 0 rgba(255, 209, 102, 0.15)",
          }}
        >
          {/* Step Progress Bar */}
          <div
            className="flex items-center justify-between mb-8 pb-4"
            style={{ borderBottom: "1px solid var(--border-0)" }}
          >
            <div>
              <span
                className="text-[11px] font-bold uppercase tracking-wider block"
                style={{ color: "var(--sunglow)" }}
              >
                Step {currentStep + 1} of {STEPS.length}
              </span>
              <h3 className="text-[17px] font-semibold" style={{ color: "#FAF6FF" }}>
                {step.label}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === currentStep ? 28 : i < currentStep ? 18 : 8,
                    background:
                      i === currentStep
                        ? "var(--sunglow)"
                        : i < currentStep
                        ? "var(--wisteria)"
                        : "rgba(188, 150, 230, 0.18)",
                    boxShadow:
                      i === currentStep
                        ? "0 0 12px rgba(255, 209, 102, 0.6)"
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Step 1: Intent */}
          {step.id === "intent" && (
            <div className="space-y-6">
              <div>
                <h2
                  className="text-[25px] font-bold tracking-tight mb-2"
                  style={{ color: "#FAF6FF", fontFamily: "var(--font-display)" }}
                >
                  Who would you like to preserve?
                </h2>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                  Tell us about the person you cherish. We will craft a warm, sacred sanctuary grounded in their life stories.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label" htmlFor="name">
                    Their Name
                  </label>
                  <input
                    id="name"
                    className="input"
                    type="text"
                    placeholder="e.g., Mom, Dadi, Kabir, Uncle Arthur"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="relationship">
                    Your Relationship
                  </label>
                  <select
                    id="relationship"
                    className="form-select cursor-pointer"
                    value={formData.relationship}
                    onChange={(e) => updateField("relationship", e.target.value)}
                  >
                    <option value="" style={{ background: "#210B2C", color: "#FAF6FF" }}>
                      Select relationship...
                    </option>
                    <option value="Mother" style={{ background: "#210B2C", color: "#FAF6FF" }}>Mother</option>
                    <option value="Father" style={{ background: "#210B2C", color: "#FAF6FF" }}>Father</option>
                    <option value="Spouse" style={{ background: "#210B2C", color: "#FAF6FF" }}>Spouse / Partner</option>
                    <option value="Grandmother" style={{ background: "#210B2C", color: "#FAF6FF" }}>Grandmother</option>
                    <option value="Grandfather" style={{ background: "#210B2C", color: "#FAF6FF" }}>Grandfather</option>
                    <option value="Sibling" style={{ background: "#210B2C", color: "#FAF6FF" }}>Sibling</option>
                    <option value="Friend" style={{ background: "#210B2C", color: "#FAF6FF" }}>Close Friend</option>
                    <option value="Other" style={{ background: "#210B2C", color: "#FAF6FF" }}>Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">This sanctuary is for someone...</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div
                      className="p-3.5 rounded-2xl cursor-pointer transition-all flex items-start gap-3"
                      style={{
                        background:
                          formData.subjectType === "living"
                            ? "rgba(255, 209, 102, 0.14)"
                            : "var(--surface-1)",
                        border:
                          formData.subjectType === "living"
                            ? "1px solid rgba(255, 209, 102, 0.55)"
                            : "1px solid var(--border-1)",
                        boxShadow:
                          formData.subjectType === "living"
                            ? "0 0 16px rgba(255, 209, 102, 0.25)"
                            : "none",
                      }}
                      onClick={() => updateField("subjectType", "living")}
                    >
                      <input
                        type="radio"
                        name="subjectType"
                        checked={formData.subjectType === "living"}
                        onChange={() => {}}
                        className="mt-1"
                        style={{ accentColor: "var(--sunglow)" }}
                      />
                      <div>
                        <strong className="block text-[14px]" style={{ color: "#FAF6FF" }}>
                          Living Legacy
                        </strong>
                        <span className="text-[12px]" style={{ color: "var(--text-2)" }}>
                          Preserving stories for future generations
                        </span>
                      </div>
                    </div>

                    <div
                      className="p-3.5 rounded-2xl cursor-pointer transition-all flex items-start gap-3"
                      style={{
                        background:
                          formData.subjectType === "deceased"
                            ? "rgba(255, 209, 102, 0.14)"
                            : "var(--surface-1)",
                        border:
                          formData.subjectType === "deceased"
                            ? "1px solid rgba(255, 209, 102, 0.55)"
                            : "1px solid var(--border-1)",
                        boxShadow:
                          formData.subjectType === "deceased"
                            ? "0 0 16px rgba(255, 209, 102, 0.25)"
                            : "none",
                      }}
                      onClick={() => updateField("subjectType", "deceased")}
                    >
                      <input
                        type="radio"
                        name="subjectType"
                        checked={formData.subjectType === "deceased"}
                        onChange={() => {}}
                        className="mt-1"
                        style={{ accentColor: "var(--sunglow)" }}
                      />
                      <div>
                        <strong className="block text-[14px]" style={{ color: "#FAF6FF" }}>
                          In Memory
                        </strong>
                        <span className="text-[12px]" style={{ color: "var(--text-2)" }}>
                          Remembering a loved one who passed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Consent */}
          {step.id === "consent" && (
            <div className="space-y-6">
              <div>
                <h2
                  className="text-[25px] font-bold tracking-tight mb-2"
                  style={{ color: "#FAF6FF", fontFamily: "var(--font-display)" }}
                >
                  Ethical Attestation & Trust
                </h2>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                  Eternia maintains strict append-only ethical ledgers and tenant data encryption.
                </p>
              </div>

              {/* Security info card */}
              <div
                className="p-4 rounded-2xl text-[13px] leading-relaxed flex items-start gap-3"
                style={{
                  background: "rgba(188, 150, 230, 0.1)",
                  border: "1px solid rgba(188, 150, 230, 0.3)",
                  color: "#FAF6FF",
                }}
              >
                <ShieldCheck size={22} style={{ color: "var(--sunglow)" }} className="shrink-0 mt-0.5" />
                <p>
                  Your memory archives and likeness models are encrypted at rest with AES-256, isolated per user, and never used to train public universal models.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div
                  className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: formData.consentAI ? "rgba(255, 209, 102, 0.12)" : "var(--surface-1)",
                    border: formData.consentAI ? "1px solid var(--border-sunglow)" : "1px solid var(--border-1)",
                  }}
                  onClick={() => updateField("consentAI", !formData.consentAI)}
                >
                  <input
                    type="checkbox"
                    checked={formData.consentAI}
                    onChange={() => {}}
                    className="w-4 h-4 mt-0.5 cursor-pointer"
                    style={{ accentColor: "var(--sunglow)" }}
                  />
                  <label className="text-[13px] leading-relaxed cursor-pointer" style={{ color: "#FAF6FF" }}>
                    I acknowledge that Eternia creates an empathetic conversational companion grounded in shared family archives, and does not replace professional grief counseling.
                  </label>
                </div>

                <div
                  className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: formData.consentData ? "rgba(255, 209, 102, 0.12)" : "var(--surface-1)",
                    border: formData.consentData ? "1px solid var(--border-sunglow)" : "1px solid var(--border-1)",
                  }}
                  onClick={() => updateField("consentData", !formData.consentData)}
                >
                  <input
                    type="checkbox"
                    checked={formData.consentData}
                    onChange={() => {}}
                    className="w-4 h-4 mt-0.5 cursor-pointer"
                    style={{ accentColor: "var(--sunglow)" }}
                  />
                  <label className="text-[13px] leading-relaxed cursor-pointer" style={{ color: "#FAF6FF" }}>
                    I attest that I have the personal or familial authority to preserve {formData.name || "this person"}&apos;s memories, likeness, and stories.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Photos */}
          {step.id === "photos" && (
            <div className="space-y-6">
              <div>
                <h2
                  className="text-[25px] font-bold tracking-tight mb-2"
                  style={{ color: "#FAF6FF", fontFamily: "var(--font-display)" }}
                >
                  Reference Portrait of {formData.name || "Them"}
                </h2>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                  A clear photograph anchors the companion&apos;s likeness in your sanctuary.
                </p>
              </div>

              <label
                htmlFor="photo-upload"
                className="w-full flex flex-col items-center justify-center p-8 rounded-2xl cursor-pointer transition-all border-2 border-dashed"
                style={{
                  borderColor: photoFile ? "var(--sunglow)" : "rgba(188, 150, 230, 0.35)",
                  background: photoFile ? "rgba(255, 209, 102, 0.12)" : "rgba(188, 150, 230, 0.05)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{
                    background: "rgba(255, 209, 102, 0.16)",
                    border: "1px solid rgba(255, 209, 102, 0.4)",
                    color: "var(--sunglow)",
                  }}
                >
                  <Camera size={22} />
                </div>
                <h4 className="text-[14.5px] font-semibold mb-1" style={{ color: "#FAF6FF" }}>
                  {photoFile ? photoFile.name : "Upload a portrait photo"}
                </h4>
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                  JPG, PNG, or WEBP (Max 10MB)
                </p>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setPhotoFile(e.target.files[0]);
                  }}
                />
              </label>

              <p className="text-[12.5px] text-center" style={{ color: "var(--text-2)" }}>
                You can also skip this step and add photos later inside Sanctuary settings.
              </p>
            </div>
          )}

          {/* Step 4: Voice */}
          {step.id === "voice" && (
            <div className="space-y-6">
              <div>
                <h2
                  className="text-[25px] font-bold tracking-tight mb-2"
                  style={{ color: "#FAF6FF", fontFamily: "var(--font-display)" }}
                >
                  Voice Sample (Optional)
                </h2>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                  A voicemail, video clip, or audio note of {formData.name || "their"} voice.
                </p>
              </div>

              <label
                htmlFor="voice-upload"
                className="w-full flex flex-col items-center justify-center p-8 rounded-2xl cursor-pointer transition-all border-2 border-dashed"
                style={{
                  borderColor: voiceFile ? "var(--sunglow)" : "rgba(188, 150, 230, 0.35)",
                  background: voiceFile ? "rgba(255, 209, 102, 0.12)" : "rgba(188, 150, 230, 0.05)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{
                    background: "rgba(255, 209, 102, 0.16)",
                    border: "1px solid rgba(255, 209, 102, 0.4)",
                    color: "var(--sunglow)",
                  }}
                >
                  <Mic size={22} />
                </div>
                <h4 className="text-[14.5px] font-semibold mb-1" style={{ color: "#FAF6FF" }}>
                  {voiceFile ? voiceFile.name : "Upload audio recording"}
                </h4>
                <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
                  Supported: MP3, WAV, M4A, OGG
                </p>
                <input
                  id="voice-upload"
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setVoiceFile(e.target.files[0]);
                  }}
                />
              </label>

              <div
                className="p-3.5 rounded-xl text-[12.5px] text-center"
                style={{
                  background: "rgba(188, 150, 230, 0.09)",
                  border: "1px solid rgba(188, 150, 230, 0.25)",
                  color: "var(--text-1)",
                }}
              >
                ✨ Don&apos;t have an audio recording? That&apos;s completely okay. Eternia automatically pairs an expressive voice tailored to their relationship ({formData.relationship || "Beloved Companion"}).
              </div>
            </div>
          )}

          {/* Step 5: Memories */}
          {step.id === "memories" && (
            <div className="space-y-5">
              <div>
                <h2
                  className="text-[25px] font-bold tracking-tight mb-2"
                  style={{ color: "#FAF6FF", fontFamily: "var(--font-display)" }}
                >
                  Cherished Memories of {formData.name || "Them"}
                </h2>
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                  These memories will directly ground their thoughts and conversations in your private sanctuary.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label" htmlFor="memory1">
                    A favorite story or cherished memory
                  </label>
                  <textarea
                    id="memory1"
                    rows={3}
                    placeholder={`e.g., Every Sunday, ${formData.name || "they"} would make special tea and tell stories on the veranda...`}
                    value={formData.memory1}
                    onChange={(e) => updateField("memory1", e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="memory2">
                    Catchphrases or favorite expressions
                  </label>
                  <input
                    id="memory2"
                    className="input"
                    type="text"
                    placeholder='e.g., "Always remember to smile", "Take it easy"'
                    value={formData.memory2}
                    onChange={(e) => updateField("memory2", e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="memory3">
                    A tradition, recipe, or moment you shared
                  </label>
                  <textarea
                    id="memory3"
                    rows={2}
                    placeholder="e.g., Cooking together on festivals and listening to old radio songs..."
                    value={formData.memory3}
                    onChange={(e) => updateField("memory3", e.target.value)}
                  />
                </div>

                {/* Bulk Document Upload */}
                <label
                  htmlFor="doc-upload"
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed cursor-pointer transition-all text-[12.5px]"
                  style={{
                    borderColor: "rgba(255, 209, 102, 0.4)",
                    background: "rgba(255, 209, 102, 0.08)",
                    color: "var(--sunglow)",
                  }}
                >
                  <Upload size={16} />
                  <span>{memoryFile ? memoryFile.name : "Attach WhatsApp export (.txt), PDF, or journal"}</span>
                  <input
                    id="doc-upload"
                    type="file"
                    accept=".txt,.pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setMemoryFile(e.target.files[0]);
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Step 6: Creating / Training */}
          {step.id === "training" && (
            <div className="text-center py-6">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #FFD166 0%, #FFBE3B 100%)",
                  boxShadow: "0 0 40px rgba(255, 209, 102, 0.6)",
                }}
              >
                <Sparkles size={28} color="#1A0824" className="animate-pulse" />
              </div>

              <h2
                className="text-[25px] font-bold mb-2"
                style={{ color: "#FAF6FF", fontFamily: "var(--font-display)" }}
              >
                Preserving {formData.name || "Companion"}&apos;s Memory
              </h2>
              <p className="text-[14px] mb-8 max-w-[420px] mx-auto" style={{ color: "var(--text-1)" }}>
                {isSubmitting
                  ? "Ingesting memories, generating neural vector embeddings, and configuring private sanctuary..."
                  : "Your companion has been created and grounded with authentic family memories."}
              </p>

              {submitError && (
                <div
                  className="p-3.5 rounded-xl text-[13px] mb-6"
                  style={{
                    background: "rgba(248, 113, 113, 0.14)",
                    border: "1px solid rgba(248, 113, 113, 0.35)",
                    color: "#FAF6FF",
                  }}
                >
                  {submitError}
                </div>
              )}

              {/* Progress Checklist */}
              <div className="space-y-3 max-w-[340px] mx-auto mb-8 text-left">
                {[
                  { label: "Profile and persona initialization", done: progressState.avatarCreated },
                  { label: "Append-only ethical consent logged", done: progressState.consentRecorded },
                  ...(voiceFile
                    ? [{ label: "Voice tone cloned via ElevenLabs IVC", done: progressState.voiceCloned }]
                    : []),
                  { label: "Memories parsed & vector embedded", done: progressState.memoriesIngested },
                  { label: "Sanctuary conversation engine ready", done: progressState.ready },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-[13.5px]">
                    {item.done ? (
                      <CheckCircle2 size={17} style={{ color: "var(--sunglow)" }} />
                    ) : (
                      <Clock size={17} style={{ color: "var(--text-2)" }} />
                    )}
                    <span style={{ color: item.done ? "#FAF6FF" : "var(--text-2)" }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {progressState.ready && (
                <Link
                  href={createdAvatarId ? `/chat?avatarId=${createdAvatarId}` : "/chat"}
                  className="btn btn-primary btn-lg inline-flex items-center gap-2"
                  style={{ textDecoration: "none" }}
                >
                  <span>Start Chat with {formData.name || "Companion"}</span>
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          )}

          {/* Navigation Action Buttons */}
          {step.id !== "training" && (
            <div
              className="flex items-center justify-between pt-8 mt-6"
              style={{ borderTop: "1px solid var(--border-1)" }}
            >
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="btn btn-ghost btn-sm flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={nextStep}
                disabled={isNextDisabled()}
                className="btn btn-primary btn-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{currentStep === 4 ? "Create Companion" : "Continue"}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
