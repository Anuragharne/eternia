"use client";

import { useState, useRef } from "react";
import { UserPlus, Camera, Upload, Mic, MicOff, Sparkles, X, CheckCircle2, AlertCircle, Loader2, Play, Pause, Heart } from "lucide-react";
import { api } from "../../lib/api";

export function CreateAvatarModal({ onClose, onCreated, onAvatarCreated }) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Friend");
  const [bio, setBio] = useState("");
  const [initialMemory, setInitialMemory] = useState("");

  // Photo
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Voice
  const [voiceFile, setVoiceFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const photoInputRef = useRef(null);
  const voiceInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const voiceAudioRef = useRef(null);

  // 1. Photo select
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      setError("Photo must be a JPG or PNG image.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Photo must be under 15MB.");
      return;
    }

    setPhotoFile(file);
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // 2. Voice file select
  const handleVoiceFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError("Voice file must be under 25MB.");
      return;
    }

    setVoiceFile(file);
    setRecordedVoiceBlob(null);
    setError("");
    const url = URL.createObjectURL(file);
    setVoicePreviewUrl(url);
  };

  // 3. Voice mic recording
  const startVoiceRecording = async () => {
    try {
      setError("");
      setVoicePreviewUrl(null);
      setVoiceFile(null);
      setRecordedVoiceBlob(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedVoiceBlob(blob);
        const url = URL.createObjectURL(blob);
        setVoicePreviewUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access error:", err);
      setError("Microphone permission denied. You can still upload an audio file instead.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const togglePlayVoice = () => {
    if (!voiceAudioRef.current) return;
    if (isPlayingVoice) {
      voiceAudioRef.current.pause();
      setIsPlayingVoice(false);
    } else {
      voiceAudioRef.current.play();
      setIsPlayingVoice(true);
    }
  };

  // 4. Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter companion's name.");
      return;
    }
    if (!photoFile) {
      setError("Please upload a photo for the companion's avatar.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");
    setStatusMessage("Creating companion profile...");

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("relationship", relationship);
      formData.append("bio", bio.trim() || `Beloved ${relationship}`);
      formData.append("subject_type", "living");
      if (initialMemory.trim()) {
        formData.append("initial_memory", initialMemory.trim());
      }
      formData.append("photo", photoFile);

      if (voiceFile) {
        formData.append("voice_sample", voiceFile);
        setStatusMessage("Cloning voice with ElevenLabs & creating Anam digital human...");
      } else if (recordedVoiceBlob) {
        const audioFile = new File([recordedVoiceBlob], `${name.toLowerCase()}_voice.webm`, { type: "audio/webm" });
        formData.append("voice_sample", audioFile);
        setStatusMessage("Cloning voice with ElevenLabs & creating Anam digital human...");
      } else {
        setStatusMessage("Generating 25fps Anam digital human from photo...");
      }

      const newAvatar = await api.createAvatarWithMedia(formData);

      setSuccess(`✨ ${name} has been created and is ready to talk!`);
      if (onAvatarCreated) {
        onAvatarCreated(newAvatar);
      }
      if (onCreated) {
        onCreated(newAvatar);
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      console.error("Create avatar error:", err);
      setError(err.message || "Failed to create companion. Please try again.");
    } finally {
      setIsSubmitting(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#12111A] border border-[#A58CF4]/30 rounded-3xl p-5 sm:p-6 shadow-[0_25px_80px_rgba(67,48,117,0.5)] relative flex flex-col gap-4 text-[#FAFAFA] my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-[#433075]/30 hover:bg-[#433075]/60 text-[rgba(250,250,250,0.6)] hover:text-[#FAFAFA] transition-all cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#433075] to-[#A58CF4] flex items-center justify-center text-white shadow-md">
            <UserPlus size={18} />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#FAFAFA] leading-tight">
              Create New Companion
            </h2>
            <p className="text-[11.5px] text-[rgba(250,250,250,0.55)]">
              25fps Interactive Digital Human with Cloned Voice
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Top Row: Photo Upload + Name & Relationship */}
          <div className="flex items-center gap-4">
            {/* Photo Dropzone Circle */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handlePhotoSelect}
                disabled={isSubmitting}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isSubmitting}
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-[#A58CF4]/40 hover:border-[#A58CF4] bg-[#1A1A2E]/60 transition-all cursor-pointer group shadow-inner"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#A58CF4] gap-1 p-1">
                    <Camera size={20} />
                    <span className="text-[9.5px] font-medium leading-tight">Add Photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
                  Change
                </div>
              </button>
              <span className="text-[10px] text-[rgba(250,250,250,0.5)]">Face Photo *</span>
            </div>

            {/* Name & Relationship inputs */}
            <div className="flex-1 flex flex-col gap-2.5">
              <div>
                <label className="text-[11px] font-medium text-[rgba(250,250,250,0.7)] block mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya, Anurag, Rohan"
                  required
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-1.5 rounded-xl bg-[#1A1A2E]/80 border border-[#A58CF4]/25 text-[12.5px] text-[#FAFAFA] placeholder:text-[rgba(250,250,250,0.35)] focus:outline-none focus:border-[#A58CF4] transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[rgba(250,250,250,0.7)] block mb-1">
                  Relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-1.5 rounded-xl bg-[#1A1A2E]/80 border border-[#A58CF4]/25 text-[12.5px] text-[#FAFAFA] focus:outline-none focus:border-[#A58CF4] transition-all cursor-pointer"
                >
                  <option value="Friend">Friend</option>
                  <option value="Best Friend">Best Friend</option>
                  <option value="Partner">Partner</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Mentor">Mentor</option>
                  <option value="Companion">Companion</option>
                </select>
              </div>
            </div>
          </div>

          {/* Voice Cloning Section */}
          <div className="p-3.5 rounded-2xl bg-[#433075]/15 border border-[#A58CF4]/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#FAFAFA] flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#A58CF4]" />
                ElevenLabs Voice Clone (Optional)
              </span>
              <span className="text-[10px] text-[#A58CF4] px-2 py-0.5 rounded-full bg-[#433075]/30 border border-[#A58CF4]/20">
                Starter Plan Active
              </span>
            </div>

            <p className="text-[10.5px] text-[rgba(250,250,250,0.55)] leading-tight">
              Upload an audio clip or record a speech sample of this person so their digital human speaks in their real voice.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-1">
              {/* File upload */}
              <input
                ref={voiceInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                onChange={handleVoiceFileSelect}
                disabled={isSubmitting || isRecording}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => voiceInputRef.current?.click()}
                disabled={isSubmitting || isRecording}
                className="py-2 px-3 rounded-xl border border-dashed border-[#A58CF4]/35 bg-[#1A1A2E]/50 hover:bg-[#1A1A2E] text-[11px] text-[#A58CF4] hover:text-[#FAFAFA] transition-all flex items-center justify-center gap-1.5 truncate cursor-pointer"
              >
                <Upload size={12} className="shrink-0" />
                <span className="truncate">{voiceFile ? voiceFile.name : "Upload Audio"}</span>
              </button>

              {/* Record Mic */}
              <button
                type="button"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={isSubmitting}
                className={`py-2 px-3 rounded-xl border text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isRecording
                    ? "bg-rose-600/30 border-rose-500 text-rose-300 animate-pulse"
                    : "bg-[#433075]/30 hover:bg-[#433075]/60 border-[#A58CF4]/30 text-[#FAFAFA]"
                }`}
              >
                {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
                <span>
                  {isRecording
                    ? `Stop (${recordingSeconds}s)`
                    : recordedVoiceBlob
                    ? "Recorded ✓"
                    : "Record Voice"}
                </span>
              </button>
            </div>

            {/* Voice Preview */}
            {voicePreviewUrl && (
              <div className="flex items-center justify-between mt-1 px-3 py-1.5 rounded-xl bg-black/40 text-[11px]">
                <audio
                  ref={voiceAudioRef}
                  src={voicePreviewUrl}
                  onEnded={() => setIsPlayingVoice(false)}
                />
                <button
                  type="button"
                  onClick={togglePlayVoice}
                  className="text-[#A58CF4] hover:text-[#FAFAFA] flex items-center gap-1 cursor-pointer"
                >
                  {isPlayingVoice ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isPlayingVoice ? "Pause" : "Play Voice Preview"}</span>
                </button>
                <span className="text-[10px] text-[rgba(250,250,250,0.45)]">Sample Ready</span>
              </div>
            )}
          </div>

          {/* First Memory / Lore */}
          <div>
            <label className="text-[11px] font-medium text-[rgba(250,250,250,0.7)] block mb-1">
              Core Memory or Personality Notes (Preserved in Qdrant Vector Archive)
            </label>
            <textarea
              value={initialMemory}
              onChange={(e) => setInitialMemory(e.target.value)}
              placeholder="e.g. We met in college in 2020. Loves sci-fi movies, coffee, and always tells dad jokes."
              rows={2}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl bg-[#1A1A2E]/80 border border-[#A58CF4]/25 text-[12px] text-[#FAFAFA] placeholder:text-[rgba(250,250,250,0.35)] focus:outline-none focus:border-[#A58CF4] transition-all resize-none"
            />
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px]">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px]">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !photoFile}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#433075] via-[#A58CF4] to-[#433075] hover:brightness-110 disabled:opacity-40 text-[#FAFAFA] font-medium text-[13px] shadow-lg shadow-[#433075]/40 transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>{statusMessage || "Creating Companion..."}</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Create & Start Live Video Call</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateAvatarModal;
