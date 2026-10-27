"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Upload, Volume2, CheckCircle2, AlertCircle, Loader2, Sparkles, X, Play, Pause } from "lucide-react";
import { api } from "../../lib/api";

export function AvatarVoiceUpload({ avatar, onClose, onVoiceUpdated, onVoiceCloned }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const previewAudioRef = useRef(null);

  // 1. File Upload Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError("Audio file must be under 25MB.");
      return;
    }

    setSelectedFile(file);
    setRecordedBlob(null);
    setError("");

    const url = URL.createObjectURL(file);
    setAudioPreviewUrl(url);
  };

  // 2. Start Microphone Recording
  const startRecording = async () => {
    try {
      setError("");
      setAudioPreviewUrl(null);
      setSelectedFile(null);
      setRecordedBlob(null);
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
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Could not access microphone. Please check browser permissions or upload an audio file.");
    }
  };

  // 3. Stop Microphone Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // 4. Toggle Preview Playback
  const togglePlayPreview = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // 5. Submit Voice Clone to Backend
  const handleCloneVoice = async () => {
    const audioPayload = selectedFile || recordedBlob;
    if (!audioPayload) {
      setError("Please select an audio file or record a voice sample first.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");
    setStatusMessage("Cloning voice with ElevenLabs Instant Voice Clone...");

    try {
      const fileToUpload = selectedFile || new File([recordedBlob], `${avatar.name.toLowerCase()}_voice.webm`, { type: "audio/webm" });

      setStatusMessage("Synthesizing voice signature with ElevenLabs...");
      const res = await api.cloneAvatarVoice(avatar.id, fileToUpload);

      setStatusMessage("Importing cloned voice into Anam.ai 25fps digital human...");
      setSuccess(`✨ Cloned ${avatar.name}'s voice successfully! It is now linked to the live video avatar.`);

      if (onVoiceCloned) {
        onVoiceCloned(res);
      }
      if (onVoiceUpdated) {
        onVoiceUpdated(res);
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 1800);
    } catch (err) {
      console.error("Voice clone error:", err);
      setError(err.message || "Failed to clone voice. Please try again.");
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#12111A] border border-[#A58CF4]/30 rounded-3xl p-6 shadow-[0_20px_70px_rgba(67,48,117,0.45)] relative flex flex-col gap-4 text-[#FAFAFA]">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-[#433075]/30 hover:bg-[#433075]/60 text-[rgba(250,250,250,0.6)] hover:text-[#FAFAFA] transition-all cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#433075]/40 border border-[#A58CF4]/35 flex items-center justify-center text-[#A58CF4]">
            <Volume2 size={18} />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#FAFAFA] leading-tight">
              Clone {avatar?.name || "Companion"}&apos;s Real Voice
            </h2>
            <p className="text-[11.5px] text-[rgba(250,250,250,0.55)]">
              Powered by ElevenLabs Starter Plan & Anam.ai Lip-Sync
            </p>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="px-3.5 py-2.5 rounded-2xl bg-[#433075]/20 border border-[#A58CF4]/20 text-[11px] text-[rgba(250,250,250,0.8)] leading-relaxed">
          <span className="font-semibold text-[#A58CF4]">Tip:</span> Upload 30 seconds to 1 minute of clear speech of {avatar?.name || "your friend"}. This voice will be cloned and spoken by the live avatar!
        </div>

        {/* Method 1: Upload File */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-[rgba(250,250,250,0.7)]">
            Option A: Upload Audio File (MP3, WAV, M4A)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
            onChange={handleFileChange}
            disabled={isProcessing || isRecording}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isRecording}
            className="w-full py-3 px-4 rounded-2xl border border-dashed border-[#A58CF4]/40 hover:border-[#A58CF4] bg-[#1A1A2E]/50 hover:bg-[#1A1A2E]/90 flex items-center justify-center gap-2 text-[12px] text-[#A58CF4] hover:text-[#FAFAFA] transition-all cursor-pointer"
          >
            <Upload size={15} />
            <span>{selectedFile ? selectedFile.name : "Choose Voice Audio File"}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 my-0.5">
          <div className="flex-1 h-px bg-[#A58CF4]/15" />
          <span className="text-[10px] uppercase text-[rgba(250,250,250,0.4)] tracking-wider">or</span>
          <div className="flex-1 h-px bg-[#A58CF4]/15" />
        </div>

        {/* Method 2: Record from Mic */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-[rgba(250,250,250,0.7)]">
            Option B: Record Live Speech Sample
          </label>
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-full py-2.5 px-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 text-[12px] font-medium ${
              isRecording
                ? "bg-rose-600/30 border-rose-500 text-rose-300 animate-pulse"
                : "bg-[#433075]/30 hover:bg-[#433075]/60 border-[#A58CF4]/30 text-[#FAFAFA]"
            }`}
          >
            {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
            <span>
              {isRecording
                ? `Recording... (${recordingSeconds}s) Click to Stop`
                : recordedBlob
                ? "Re-record Voice Sample"
                : "Record with Microphone"}
            </span>
          </button>
        </div>

        {/* Audio Preview Player */}
        {audioPreviewUrl && (
          <div className="p-3 rounded-2xl bg-black/40 border border-[#A58CF4]/20 flex items-center justify-between">
            <audio
              ref={previewAudioRef}
              src={audioPreviewUrl}
              onEnded={() => setIsPlayingPreview(false)}
            />
            <button
              type="button"
              onClick={togglePlayPreview}
              className="flex items-center gap-2 text-[12px] text-[#A58CF4] hover:text-[#FAFAFA] transition-colors cursor-pointer"
            >
              {isPlayingPreview ? <Pause size={15} /> : <Play size={15} />}
              <span>{isPlayingPreview ? "Pause Sample" : "Listen to Sample"}</span>
            </button>
            <span className="text-[10.5px] text-[rgba(250,250,250,0.5)]">
              {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : `${recordingSeconds}s recorded`}
            </span>
          </div>
        )}

        {/* Status / Errors */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11.5px]">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11.5px]">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleCloneVoice}
          disabled={isProcessing || isRecording || (!selectedFile && !recordedBlob)}
          className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-[#433075] via-[#A58CF4] to-[#433075] hover:brightness-110 disabled:opacity-40 text-[#FAFAFA] font-medium text-[13px] shadow-lg shadow-[#433075]/40 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin text-white" />
              <span>{statusMessage || "Cloning Voice..."}</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>Clone & Apply to Avatar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
