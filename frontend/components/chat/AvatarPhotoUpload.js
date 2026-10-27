"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, Camera, Sparkles } from "lucide-react";
import { api } from "../../lib/api";

/**
 * Avatar Photo Upload Component
 *
 * Allows users to upload a clear front-facing photo for their companion's
 * talking avatar. Immediately triggers D-ID talking avatar creation upon
 * photo upload so the avatar is instantly created and ready to talk.
 */
export function AvatarPhotoUpload({ avatarId, avatarName, currentPhotoUrl, onUploadComplete }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState("");
  const [preview, setPreview] = useState(currentPhotoUrl || null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      setError("Please upload a JPG or PNG image.");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo must be under 10MB.");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setIsProcessing(true);
    setError("");
    setSuccess("");

    try {
      // Step 1: Upload photo
      setProcessStep("Saving portrait photo...");
      const result = await api.uploadAvatarPhoto(avatarId, file);
      const photoUrl = result.photo_url;

      setSuccess("Portrait uploaded! Ready for 3D Avatar.");
      if (onUploadComplete) {
        onUploadComplete(photoUrl);
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      setError(err.message || "Failed to upload photo. Please try again.");
      setPreview(currentPhotoUrl || null);
    } finally {
      setIsProcessing(false);
      setProcessStep("");
    }
  };

  return (
    <div className="flex flex-col items-center gap-3.5 text-center">
      {/* Photo Preview / Upload Zone */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-[#A58CF4]/40 hover:border-[#A58CF4] transition-all cursor-pointer group shadow-lg shadow-[#433075]/20"
      >
        {preview ? (
          <img
            src={preview}
            alt="Avatar face"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#433075]/25 flex flex-col items-center justify-center text-[#A58CF4] gap-1 p-2">
            <Camera size={26} />
            <span className="text-[10.5px] font-medium opacity-90">Upload Photo</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
          <Upload size={20} />
          <span className="text-[10px] font-medium">Choose Photo</span>
        </div>

        {/* Loading spinner with pulsing aura */}
        {isProcessing && (
          <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 p-2">
            <Loader2 size={24} className="text-[#A58CF4] animate-spin" />
            <span className="text-[9.5px] text-[#FAFAFA] font-medium animate-pulse px-1">
              Generating...
            </span>
          </div>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="space-y-1">
        <p className="text-[12px] font-medium text-[#FAFAFA] flex items-center justify-center gap-1">
          <Sparkles size={12} className="text-[#A58CF4]" />
          Upload Portrait Photo
        </p>
        <p className="text-[11px] text-[rgba(250,250,250,0.55)] max-w-[240px] leading-relaxed">
          Upload a clear front-facing portrait. This will be used for your interactive 3D avatar and video call.
        </p>
      </div>

      {/* Progress & Status Messages */}
      {isProcessing && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#433075]/30 border border-[#A58CF4]/30 text-[#A58CF4] text-[11px]">
          <Loader2 size={12} className="animate-spin" />
          <span>{processStep || "Processing..."}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-red-400 text-[11px] bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-500/20">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-1.5 text-green-400 text-[11px] bg-green-950/20 px-3 py-1.5 rounded-lg border border-green-500/20">
          <CheckCircle2 size={13} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
