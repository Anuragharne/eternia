"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Volume2, VolumeX, RefreshCw, RotateCcw } from "lucide-react";

/**
 * Avatar Video Player Component
 *
 * Displays D-ID talking avatar videos inline in the chat or in the
 * live video call page. Supports:
 * - Auto-play when video URL is set
 * - Idle state (shows static photo with subtle breathing animation)
 * - Loading state with spinner
 * - Mute/unmute toggle
 * - Instant video replay without burning credits
 * - Error fallback to static photo without crashing or showing error overlays
 */
export function AvatarVideoPlayer({
  videoUrl,
  photoUrl,
  isLoading = false,
  isMuted = false,
  showReplayButton = true,
  onVideoEnd,
  onReplay,
  onError,
  size = "md", // "sm" | "md" | "lg" | "full"
  className = "",
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [localMuted, setLocalMuted] = useState(isMuted);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
    full: "w-full h-full",
  };

  // Reset error state and start play when videoUrl changes
  useEffect(() => {
    if (videoUrl) {
      setHasError(false);
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.muted = localMuted;
        videoRef.current.play().catch((err) => {
          console.warn("Auto-play notice:", err?.message || err);
        });
      }
    } else {
      setIsPlaying(false);
      setHasError(false);
    }
  }, [videoUrl]);

  // Update mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = localMuted;
    }
  }, [localMuted]);

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (onVideoEnd) onVideoEnd();
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((err) => {
        console.warn("Replay play error:", err);
      });
      setIsPlaying(true);
      setHasError(false);
      if (onReplay) onReplay();
    }
  };

  const handleVideoError = (e) => {
    console.warn("Avatar video source unavailable or expired, showing photo.");
    setHasError(true);
    setIsPlaying(false);
    if (onError) onError(e);
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-[#1A1A2E] border border-[#A58CF4]/20 ${sizeClasses[size]} ${className}`}
    >
      {/* Video Element - Only rendered when a valid videoUrl exists and has no error */}
      {videoUrl && !hasError && (
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          autoPlay
          muted={localMuted}
          onEnded={handleVideoEnd}
          onError={handleVideoError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isPlaying ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
          }`}
        />
      )}

      {/* Idle / Fallback State: Static Photo with Breathing Animation */}
      {(!isPlaying || hasError || !videoUrl) && !isLoading && photoUrl && (
        <div className="w-full h-full relative">
          <img
            src={photoUrl}
            alt="Avatar"
            className="w-full h-full object-cover animate-subtle-breathe"
          />
          {/* Subtle glow overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D]/40 via-transparent to-transparent" />
        </div>
      )}

      {/* No Photo Placeholder */}
      {!isPlaying && !isLoading && !photoUrl && !videoUrl && !hasError && (
        <div className="w-full h-full flex items-center justify-center bg-[#433075]/20">
          <div className="text-center text-[rgba(250,250,250,0.4)]">
            <div className="w-16 h-16 rounded-full bg-[#433075]/40 mx-auto mb-2 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <p className="text-[10px]">No photo uploaded</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]/60 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="text-[#A58CF4] animate-spin" />
            <span className="text-[11px] text-[rgba(250,250,250,0.7)]">
              Generating avatar...
            </span>
          </div>
        </div>
      )}

      {/* Error State (only shown if there is no photo to fallback to) */}
      {hasError && !photoUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D0D]/60 z-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <RefreshCw size={20} className="text-red-400" />
            <span className="text-[11px] text-red-400">Video failed to load</span>
          </div>
        </div>
      )}

      {/* Replay Button (visible when video exists and is paused/ended) */}
      {videoUrl && !isPlaying && !isLoading && !hasError && showReplayButton && (
        <button
          type="button"
          onClick={handleReplay}
          className="absolute bottom-2 left-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[#A58CF4]/40 text-[#FAFAFA] text-[11px] font-medium hover:bg-[#433075]/80 transition-all z-20 cursor-pointer shadow-lg hover:scale-105"
          title="Replay Video"
        >
          <RotateCcw size={12} className="text-[#A58CF4]" />
          <span>Replay</span>
        </button>
      )}

      {/* Mute Toggle (visible when playing) */}
      {isPlaying && videoUrl && !hasError && (
        <button
          type="button"
          onClick={() => setLocalMuted(!localMuted)}
          className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white/70 hover:text-white transition-colors z-20 cursor-pointer"
        >
          {localMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      )}
    </div>
  );
}
