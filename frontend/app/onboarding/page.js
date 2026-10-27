"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, Clock, Upload, ArrowLeft, ArrowRight, Camera, Mic } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { Navbar } from "../../components/layout/Navbar";

const STEPS = [
  { id: "intent", label: "Who" },
  { id: "consent", label: "Consent" },
  { id: "photos", label: "Photos" },
  { id: "voice", label: "Voice" },
  { id: "memories", label: "Memories" },
  { id: "training", label: "Creating" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    relationship: "",
    subjectType: "deceased",
    bio: "",
    consentAI: false,
    consentData: false,
    memory1: "",
    memory2: "",
    memory3: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [voiceFile, setVoiceFile] = useState(null);
  const [memoryFile, setMemoryFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdAvatarId, setCreatedAvatarId] = useState(null);
  const [progressState, setProgressState] = useState({
    avatarCreated: false,
    consentRecorded: false,
    memoriesIngested: false,
    ready: false,
  });

  const step = STEPS[currentStep];

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCompanion = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      // 1. Create avatar in backend
      const catchphrases = formData.memory2 ? [formData.memory2] : [];
      const avatar = await api.createAvatar({
        name: formData.name,
        relationship: formData.relationship,
        subject_type: formData.subjectType,
        bio: formData.bio || `Beloved ${formData.relationship}`,
        personality_traits: ["caring", "gentle"],
        catchphrases,
      });

      setCreatedAvatarId(avatar.id);
      setProgressState((p) => ({ ...p, avatarCreated: true }));

      // 2. Record append-only ethical consent
      await api.recordConsent(
        avatar.id,
        formData.subjectType === "living" ? "self" : "family_attestation",
        "text",
        `Confirmed relationship: ${formData.relationship}`
      );
      setProgressState((p) => ({ ...p, consentRecorded: true }));

      // 3. Ingest initial memories
      const memoriesToAdd = [];
      if (formData.memory1) {
        memoriesToAdd.push({ content: formData.memory1, source: "journal" });
      }
      if (formData.memory2) {
        memoriesToAdd.push({ content: `Favorite saying: "${formData.memory2}"`, source: "manual" });
      }
      if (formData.memory3) {
        memoriesToAdd.push({ content: `Shared tradition: ${formData.memory3}`, source: "journal" });
      }

      for (const m of memoriesToAdd) {
        await api.addMemory(avatar.id, m.content, m.source);
      }

      // If user attached document
      if (memoryFile) {
        await api.importMemoriesFile(avatar.id, memoryFile);
      }

      // If user uploaded reference portrait photo, upload for D-ID talking avatar and auto-generate intro video
      if (photoFile) {
        try {
          await api.uploadAvatarPhoto(avatar.id, photoFile, true);
        } catch (photoErr) {
          console.warn("Could not upload onboarding avatar photo:", photoErr);
        }
      }

      setProgressState((p) => ({ ...p, memoriesIngested: true, ready: true }));
    } catch (err) {
      console.error("Error creating companion:", err);
      setSubmitError(err.message || "Could not complete companion creation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 4) {
      setCurrentStep(5);
      handleCreateCompanion();
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0 && currentStep !== 5) {
      setCurrentStep((prev) => prev - 1);
    }
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

  return (
    <div className="w-full min-h-screen relative overflow-x-hidden bg-[#0D0D0D] text-[#FAFAFA]">
      {/* Unified Floating Navbar */}
      <Navbar />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-28 pb-16 flex flex-col items-center">
        
        {/* Onboarding Card */}
        <div className="w-full max-w-[620px] rounded-[32px] bg-[#0D0D0D] p-6 sm:p-9 border border-[#A58CF4]/25 shadow-[0_24px_70px_rgba(13,13,13,0.9)] relative">
          
          {/* Step Progress Bar */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#A58CF4]/20">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A58CF4] block">
                Preservation Step {currentStep + 1} of {STEPS.length}
              </span>
              <h3 className="text-[16px] font-medium text-[#FAFAFA]">
                {step.label}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < currentStep
                      ? "w-5 bg-[#433075]"
                      : i === currentStep
                      ? "w-8 bg-[#A58CF4]"
                      : "w-3 bg-[rgba(250,250,250,0.15)]"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step 1: Intent */}
          {step.id === "intent" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[24px] font-medium text-[#FAFAFA] tracking-tight mb-2">
                  Who would you like to preserve?
                </h2>
                <p className="text-[13.5px] text-[rgba(250,250,250,0.7)] leading-[1.5]">
                  Tell us about the person you cherish. We will craft a respectful, private sanctuary grounded in their memories.
                </p>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="name">
                    Their Name
                  </label>
                  <input
                    id="name"
                    className="input"
                    type="text"
                    placeholder="e.g., Mom, Dadi, Uncle Arthur"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="relationship">
                    Your Relationship
                  </label>
                  <select
                    id="relationship"
                    className="form-select"
                    value={formData.relationship}
                    onChange={(e) => updateField("relationship", e.target.value)}
                  >
                    <option value="" style={{ background: "#0D0D0D", color: "#FAFAFA" }}>
                      Select relationship...
                    </option>
                    <option value="Mother" style={{ background: "#0D0D0D", color: "#FAFAFA" }}>Mother</option>
                    <option value="Father" style={{ background: "#0D0D0D", color: "#FAFAFA" }}>Father</option>
                    <option value="Spouse" style={{ background: "#0D0D0D", color: "#FAFAFA" }}>Spouse / Partner</option>
                    <option value="Grandmother" style={{ background: "#0D0D0D", color: "#FAFAFA" }}>Grandmother</option>
                    <option value="Grandfather" style={{ background: "#0D0D0D", color: "#FAFAFA" }}>Grandfather</option>
                    <option value="Sibling" style={{ background: "#0D0D0D", color: "#FAFAFA" }}>Sibling</option>
                    <option value="Friend" style={{ background: "#0D0D0D", color: "#FAFAFA" }}>Close Friend</option>
                    <option value="Other" style={{ background: "#0D0D0D", color: "#FAFAFA" }}>Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">This sanctuary is for someone...</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div
                      className={`radio-card ${formData.subjectType === "living" ? "selected" : ""}`}
                      onClick={() => updateField("subjectType", "living")}
                    >
                      <input
                        type="radio"
                        name="subjectType"
                        checked={formData.subjectType === "living"}
                        onChange={() => {}}
                        className="accent-[#433075]"
                      />
                      <div>
                        <strong className="block text-[13.5px] text-[#FAFAFA]">Living Legacy</strong>
                        <span className="text-[11.5px] text-[rgba(250,250,250,0.6)]">
                          Preserving stories for future generations
                        </span>
                      </div>
                    </div>

                    <div
                      className={`radio-card ${formData.subjectType === "deceased" ? "selected" : ""}`}
                      onClick={() => updateField("subjectType", "deceased")}
                    >
                      <input
                        type="radio"
                        name="subjectType"
                        checked={formData.subjectType === "deceased"}
                        onChange={() => {}}
                        className="accent-[#433075]"
                      />
                      <div>
                        <strong className="block text-[13.5px] text-[#FAFAFA]">In Memory</strong>
                        <span className="text-[11.5px] text-[rgba(250,250,250,0.6)]">
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
                <h2 className="text-[24px] font-medium text-[#FAFAFA] tracking-tight mb-2">
                  Ethical Attestation & Trust
                </h2>
                <p className="text-[13.5px] text-[rgba(250,250,250,0.7)] leading-[1.5]">
                  Eternia maintains strict append-only ethical ledgers and tenant data encryption.
                </p>
              </div>

              {/* Informative Security Box */}
              <div className="p-4 rounded-2xl bg-[#433075]/25 border border-[#A58CF4]/30 text-[12.5px] leading-[1.6] text-[rgba(250,250,250,0.85)]">
                <p>
                  Your memory archives and voice likeness models are encrypted at rest with AES-256, isolated per tenant, and never used to train public universal models.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0D0D0D] border border-[#A58CF4]/20 cursor-pointer hover:border-[#A58CF4]/40 transition-colors"
                  onClick={() => updateField("consentAI", !formData.consentAI)}
                >
                  <input
                    type="checkbox"
                    checked={formData.consentAI}
                    onChange={() => {}}
                    className="w-4 h-4 mt-0.5 accent-[#433075] cursor-pointer"
                  />
                  <label className="text-[12.5px] text-[#FAFAFA] leading-[1.5] cursor-pointer">
                    I acknowledge that Eternia creates an empathetic conversational companion grounded in shared family archives, and does not replace human grief counseling.
                  </label>
                </div>

                <div
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0D0D0D] border border-[#A58CF4]/20 cursor-pointer hover:border-[#A58CF4]/40 transition-colors"
                  onClick={() => updateField("consentData", !formData.consentData)}
                >
                  <input
                    type="checkbox"
                    checked={formData.consentData}
                    onChange={() => {}}
                    className="w-4 h-4 mt-0.5 accent-[#433075] cursor-pointer"
                  />
                  <label className="text-[12.5px] text-[#FAFAFA] leading-[1.5] cursor-pointer">
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
                <h2 className="text-[24px] font-medium text-[#FAFAFA] tracking-tight mb-2">
                  Reference Portrait of {formData.name || "Them"}
                </h2>
                <p className="text-[13.5px] text-[rgba(250,250,250,0.7)] leading-[1.5]">
                  A clear photograph anchors the companion&apos;s likeness in your sanctuary.
                </p>
              </div>

              <label
                htmlFor="photo-upload"
                className="w-full flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[#A58CF4]/30 bg-[#433075]/15 hover:bg-[#433075]/25 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#433075] border border-[#A58CF4]/30 flex items-center justify-center text-[#A58CF4] mb-3">
                  <Camera size={22} />
                </div>
                <h4 className="text-[14px] font-medium text-[#FAFAFA] mb-1">
                  {photoFile ? photoFile.name : "Upload a portrait photo"}
                </h4>
                <p className="text-[11.5px] text-[rgba(250,250,250,0.6)]">
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

              <p className="text-[12px] text-[rgba(250,250,250,0.5)] text-center">
                You can also skip this step and add photos later inside Sanctuary settings.
              </p>
            </div>
          )}

          {/* Step 4: Voice */}
          {step.id === "voice" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[24px] font-medium text-[#FAFAFA] tracking-tight mb-2">
                  Voice Sample (Optional)
                </h2>
                <p className="text-[13.5px] text-[rgba(250,250,250,0.7)] leading-[1.5]">
                  A voicemail, video clip, or audio note of {formData.name || "their"} voice.
                </p>
              </div>

              <label
                htmlFor="voice-upload"
                className="w-full flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[#A58CF4]/30 bg-[#433075]/15 hover:bg-[#433075]/25 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#433075] border border-[#A58CF4]/30 flex items-center justify-center text-[#A58CF4] mb-3">
                  <Mic size={22} />
                </div>
                <h4 className="text-[14px] font-medium text-[#FAFAFA] mb-1">
                  {voiceFile ? voiceFile.name : "Upload audio recording"}
                </h4>
                <p className="text-[11.5px] text-[rgba(250,250,250,0.6)]">
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

              <div className="p-3.5 rounded-xl bg-[#433075]/20 border border-[#A58CF4]/20 text-[12px] text-[rgba(250,250,250,0.75)] text-center">
                ✨ Don&apos;t have an audio recording? That&apos;s completely okay. Eternia automatically pairs an expressive ElevenLabs voice tailored to their relationship ({formData.relationship || "Daughter, Son, Girlfriend, Grandparent, Friend"}).
              </div>
            </div>
          )}

          {/* Step 5: Memories */}
          {step.id === "memories" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[24px] font-medium text-[#FAFAFA] tracking-tight mb-2">
                  Cherished Memories of {formData.name || "Them"}
                </h2>
                <p className="text-[13.5px] text-[rgba(250,250,250,0.7)] leading-[1.5]">
                  These memories will directly ground their thoughts and conversations in your private sanctuary.
                </p>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label" htmlFor="memory1">
                    A favorite story or cherished memory
                  </label>
                  <textarea
                    id="memory1"
                    className="input"
                    rows={3}
                    placeholder={`e.g., Every Sunday, ${formData.name || "they"} would make special tea and tell stories on the veranda...`}
                    value={formData.memory1}
                    onChange={(e) => updateField("memory1", e.target.value)}
                  />
                </div>

                <div className="form-group">
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

                <div className="form-group">
                  <label className="form-label" htmlFor="memory3">
                    A tradition, recipe, or moment you shared
                  </label>
                  <textarea
                    id="memory3"
                    className="input"
                    rows={2}
                    placeholder="e.g., Cooking together on festivals and listening to old radio songs..."
                    value={formData.memory3}
                    onChange={(e) => updateField("memory3", e.target.value)}
                  />
                </div>

                {/* Bulk Document Upload */}
                <label
                  htmlFor="doc-upload"
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-[#A58CF4]/35 bg-[#433075]/15 hover:bg-[#433075]/25 cursor-pointer transition-colors text-[12px] text-[#A58CF4]"
                >
                  <Upload size={15} />
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
                className={`w-16 h-16 rounded-full bg-[#433075] border border-[#A58CF4]/40 mx-auto mb-4 flex items-center justify-center shadow-[0_0_35px_rgba(165,140,244,0.35)] ${
                  isSubmitting ? "animate-pulse" : ""
                }`}
              >
                <Sparkles size={28} className="text-[#A58CF4]" />
              </div>

              <h2 className="text-[24px] font-medium text-[#FAFAFA] mb-2">
                Preserving {formData.name || "Companion"}&apos;s Memory
              </h2>
              <p className="text-[13.5px] text-[rgba(250,250,250,0.7)] mb-8 max-w-[420px] mx-auto">
                {isSubmitting
                  ? "Ingesting memories, generating neural vector embeddings, and configuring private RAG..."
                  : "Your companion has been created and grounded with authentic family memories."}
              </p>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-[#433075]/40 border border-[#A58CF4]/40 text-[#FAFAFA] text-[12.5px] mb-6">
                  {submitError}
                </div>
              )}

              {/* Progress Checklist */}
              <div className="space-y-3 max-w-[340px] mx-auto mb-8 text-left">
                {[
                  { label: "Profile and persona initialization", done: progressState.avatarCreated },
                  { label: "Append-only ethical consent logged", done: progressState.consentRecorded },
                  { label: "Memories parsed & vector embedded", done: progressState.memoriesIngested },
                  { label: "Sanctuary conversation engine ready", done: progressState.ready },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-[13px]">
                    {item.done ? (
                      <CheckCircle2 size={16} className="text-[#A58CF4]" />
                    ) : (
                      <Clock size={16} className="text-[rgba(250,250,250,0.4)]" />
                    )}
                    <span className={item.done ? "text-[#FAFAFA]" : "text-[rgba(250,250,250,0.5)]"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {progressState.ready && (
                <Link
                  href={createdAvatarId ? `/chat?avatarId=${createdAvatarId}` : "/chat"}
                  className="btn-pill-primary px-8 py-3 text-[13px] no-underline inline-flex items-center gap-2 shadow-lg"
                >
                  <span>Start Chat with {formData.name || "Companion"}</span>
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          )}

          {/* Navigation Action Buttons */}
          {step.id !== "training" && (
            <div className="flex items-center justify-between pt-8 mt-6 border-t border-[#A58CF4]/20">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="btn-pill-ghost px-5 py-2.5 text-[12.5px] flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={nextStep}
                disabled={isNextDisabled()}
                className="btn-pill-primary px-6 py-2.5 text-[12.5px] flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
