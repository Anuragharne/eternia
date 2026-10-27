"use client";

import React, { useState, useEffect, useRef, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Camera,
  MessageSquare,
  Send,
  Loader2,
  Video,
  Box,
  Radio,
  Clock,
  Heart,
  ChevronDown,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import PhotoAvatar3D from "../../components/call/PhotoAvatar3D";
import { AvatarVideoPlayer } from "../../components/chat/AvatarVideoPlayer";
import { AvatarPhotoUpload } from "../../components/chat/AvatarPhotoUpload";

function CallContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const avatarId = searchParams.get("avatarId");

  // State
  const [avatars, setAvatars] = useState([]);
  const [activeAvatar, setActiveAvatar] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [introVideoUrl, setIntroVideoUrl] = useState(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);

  // Experience modes: "3d" (Three.js Photo-to-3D Depth Avatar) or "video" (D-ID Video)
  const [viewMode, setViewMode] = useState("3d");
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isGeneratingIntro, setIsGeneratingIntro] = useState(false);

  // Audio & Speech
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.6);
  const [transcript, setTranscript] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [callDuration, setCallDuration] = useState(0);

  // Modals & Text Input
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [callStatus, setCallStatus] = useState("Connecting...");

  // Refs
  const recognitionRef = useRef(null);
  const companionAudioRef = useRef(null);
  const timerRef = useRef(null);
  const videoPlayerRef = useRef(null);

  // 1. Call duration timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 2. Fetch avatar and intro video data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const list = await api.getAvatars();
        if (!isMounted) return;
        setAvatars(list || []);

        let target = null;
        if (avatarId) {
          target = list.find((a) => a.id === avatarId);
        }
        if (!target && list && list.length > 0) {
          target = list[0];
        }

        setActiveAvatar(target);

        if (target) {
          // Check cached intro video and photo
          try {
            const introRes = await api.getIntroVideo(target.id);
            if (isMounted) {
              if (introRes?.photo_url) {
                setPhotoUrl(introRes.photo_url);
              }
              if (introRes?.intro_video_url) {
                setIntroVideoUrl(introRes.intro_video_url);
                setCurrentVideoUrl(introRes.intro_video_url);
              }
            }
          } catch (introErr) {
            console.warn("Could not fetch cached intro video:", introErr);
          }

          // Fallback to photo-url endpoint if needed
          if (!photoUrl) {
            try {
              const photoRes = await api.getAvatarPhotoUrl(target.id);
              if (isMounted && photoRes?.photo_url) {
                setPhotoUrl(photoRes.photo_url);
                if (photoRes.video_url && !introVideoUrl) {
                  setIntroVideoUrl(photoRes.video_url);
                  setCurrentVideoUrl(photoRes.video_url);
                }
              }
            } catch (pErr) {
              console.warn("Photo fetch fallback:", pErr);
            }
          }

          setCallStatus("Connected");
          setSubtitle(`Connected with ${target.name}. Click the microphone or speak.`);
        } else {
          setCallStatus("No Avatar Found");
        }
      } catch (err) {
        console.error("Call load error:", err);
        setCallStatus("Connection Error");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
      if (companionAudioRef.current) {
        companionAudioRef.current.pause();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [avatarId]);

  // 3. Speech Recognition Setup (Web Speech API)
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use text input or Chrome/Edge.");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
      };

      recognition.onresult = (e) => {
        let currentText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          currentText += e.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition notice:", e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // If transcript was captured, automatically send it
        if (transcript.trim()) {
          handleSendMessage(transcript.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    if (transcript.trim()) {
      handleSendMessage(transcript.trim());
    }
  };

  // 4. Send message and handle companion response
  const handleSendMessage = async (userMessage) => {
    if (!userMessage || !activeAvatar) return;
    setTranscript("");
    setTextInput("");
    setSubtitle("Thinking...");

    try {
      // Send chat message to backend
      const res = await api.sendMessage(activeAvatar.id, userMessage);
      const reply = res?.companion_reply || res?.message || "";
      setSubtitle(reply);

      // Play companion speech audio
      try {
        setIsSpeaking(true);
        setAudioLevel(0.8);
        const audioBlob = await api.getSpeechAudioBlob(activeAvatar.id, reply);
        const audioUrl = URL.createObjectURL(audioBlob);

        if (companionAudioRef.current) {
          companionAudioRef.current.pause();
        }

        const audio = new Audio(audioUrl);
        companionAudioRef.current = audio;
        audio.muted = isMuted;

        audio.onended = () => {
          setIsSpeaking(false);
          setAudioLevel(0.3);
        };

        audio.onerror = () => {
          setIsSpeaking(false);
        };

        audio.play().catch((playErr) => {
          console.warn("Audio play notice:", playErr);
          setIsSpeaking(false);
        });
      } catch (voiceErr) {
        console.warn("TTS speech fallback:", voiceErr);
        // Fallback to browser SpeechSynthesis
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
        } else {
          setIsSpeaking(false);
        }
      }
    } catch (err) {
      console.error("Send message error:", err);
      setSubtitle("Could not reach companion. Please try again.");
      setIsSpeaking(false);
    }
  };

  // 5. Generate / Play Intro Video (Zero credit if cached)
  const handlePlayOrGenerateIntro = async () => {
    if (!activeAvatar) return;

    // If cached intro exists, replay it instantly!
    if (introVideoUrl) {
      setCurrentVideoUrl(introVideoUrl);
      setViewMode("video");
      setIsPlayingVideo(true);
      return;
    }

    if (!photoUrl) {
      setShowPhotoModal(true);
      return;
    }

    // Generate once and cache permanently
    setIsGeneratingIntro(true);
    setSubtitle("Synthesizing intro video with D-ID...");
    try {
      const res = await api.generateIntroVideo(activeAvatar.id);
      if (res?.video_url) {
        setIntroVideoUrl(res.video_url);
        setCurrentVideoUrl(res.video_url);
        setViewMode("video");
        setIsPlayingVideo(true);
        setSubtitle(`Hello! It is so wonderful to see you. I am ${activeAvatar.name}.`);
      }
    } catch (err) {
      console.error("Failed to generate intro video:", err);
      alert("Video generation was deferred. You can continue speaking with the 3D Avatar!");
    } finally {
      setIsGeneratingIntro(false);
    }
  };

  // 6. Instant Replay Video
  const handleReplayVideo = () => {
    if (introVideoUrl || currentVideoUrl) {
      setViewMode("video");
      setIsPlayingVideo(true);
      const url = currentVideoUrl || introVideoUrl;
      setCurrentVideoUrl(url);
    }
  };

  // 7. Toggle Mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (companionAudioRef.current) {
      companionAudioRef.current.muted = !isMuted;
    }
  };

  // 8. End Call
  const handleEndCall = () => {
    if (companionAudioRef.current) {
      companionAudioRef.current.pause();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    router.push(activeAvatar ? `/chat?avatarId=${activeAvatar.id}` : "/chat");
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden select-none"
      style={{ background: "var(--void)", color: "var(--text-0)" }}
    >
      {/* Background Ambient Glow Lights */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none -z-10"
        style={{
          background: "radial-gradient(circle, rgba(124, 79, 240, 0.35) 0%, rgba(79, 70, 229, 0.15) 50%, transparent 70%)",
        }}
      />

      {/* Top Header Bar */}
      <header
        className="h-16 px-4 sm:px-6 flex items-center justify-between z-20"
        style={{
          background: "var(--surface-0)",
          borderBottom: "1px solid var(--border-0)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href={activeAvatar ? `/chat?avatarId=${activeAvatar.id}` : "/chat"}
            className="btn btn-ghost btn-sm flex items-center gap-1.5"
            style={{ textDecoration: "none", fontSize: 12, padding: "6px 12px" }}
          >
            <ArrowLeft size={14} style={{ color: "var(--brand-glow)" }} />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>

          {activeAvatar && (
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <div>
                <h1 className="text-[14px] font-semibold tracking-wide leading-tight flex items-center gap-1.5" style={{ color: "var(--text-0)" }}>
                  {activeAvatar.name}
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-normal"
                    style={{
                      background: "rgba(124, 79, 240, 0.15)",
                      color: "var(--lavender)",
                      border: "1px solid rgba(124, 79, 240, 0.25)",
                    }}
                  >
                    {activeAvatar.relationship || "Companion"}
                  </span>
                </h1>
                <p className="text-[10px]" style={{ color: "var(--text-2)" }}>
                  Live Holographic Call • {callStatus}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Center: Call Duration Pill */}
        <div
          className="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full text-[12px]"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-0)",
            color: "var(--text-0)",
          }}
        >
          <Clock size={13} style={{ color: "var(--lavender)" }} />
          <span className="font-mono tracking-wider">{formatDuration(callDuration)}</span>
        </div>

        {/* Right: View Mode Toggle (3D vs Video) & Photo Modal Trigger */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div
            className="flex items-center p-0.5 rounded-full shadow-inner"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-1)",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("3d")}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer"
              style={{
                background: viewMode === "3d" ? "linear-gradient(135deg, #FFD166, #FFBE3B)" : "transparent",
                color: viewMode === "3d" ? "#1A0824" : "var(--text-1)",
                boxShadow: viewMode === "3d" ? "0 2px 10px rgba(255, 209, 102, 0.4)" : "none",
              }}
            >
              <Box size={12} />
              <span>3D Mesh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("video");
                if (introVideoUrl && !isPlayingVideo) {
                  setIsPlayingVideo(true);
                }
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer"
              style={{
                background: viewMode === "video" ? "linear-gradient(135deg, #FFD166, #FFBE3B)" : "transparent",
                color: viewMode === "video" ? "#1A0824" : "var(--text-1)",
                boxShadow: viewMode === "video" ? "0 2px 10px rgba(255, 209, 102, 0.4)" : "none",
              }}
            >
              <Video size={12} />
              <span>Video</span>
            </button>
          </div>

          {/* Photo Upload Icon */}
          <button
            type="button"
            onClick={() => setShowPhotoModal(true)}
            className="p-2 rounded-full transition-all cursor-pointer"
            style={{
              background: "rgba(255, 209, 102, 0.16)",
              border: "1px solid rgba(255, 209, 102, 0.4)",
              color: "var(--sunglow)",
            }}
            title="Upload Portrait Photo"
          >
            <Camera size={15} />
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 relative max-w-5xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin" style={{ color: "var(--brand-glow)" }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
              Connecting to holographic companion...
            </p>
          </div>
        ) : !photoUrl ? (
          /* Empty Photo Prompt */
          <div
            className="max-w-md w-full rounded-3xl p-6 sm:p-8 text-center shadow-2xl flex flex-col items-center"
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--border-1)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{
                background: "rgba(124, 79, 240, 0.15)",
                border: "1px solid rgba(124, 79, 240, 0.35)",
                color: "var(--brand-glow)",
              }}
            >
              <Camera size={34} />
            </div>
            <h2 className="text-[18px] font-bold mb-2" style={{ color: "var(--text-0)" }}>
              Upload Portrait for 3D Call
            </h2>
            <p className="text-[12px] leading-relaxed mb-6" style={{ color: "var(--text-1)" }}>
              Upload a front-facing photo to render your interactive 3D Depth Avatar and synthesize talking video greetings.
            </p>
            <AvatarPhotoUpload
              avatarId={activeAvatar?.id}
              avatarName={activeAvatar?.name}
              currentPhotoUrl={photoUrl}
              onUploadComplete={(newUrl) => {
                setPhotoUrl(newUrl);
                setShowPhotoModal(false);
              }}
            />
          </div>
        ) : (
          /* Avatar Viewport Frame */
          <div
            className="relative w-full max-w-[460px] sm:max-w-[500px] h-[480px] sm:h-[540px] rounded-[36px] overflow-hidden flex items-center justify-center"
            style={{
              background: "var(--surface-0)",
              border: "1px solid var(--border-1)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.75), 0 0 40px rgba(124, 79, 240, 0.15)",
            }}
          >
            {/* Viewport Content: 3D Depth Avatar or Video Player */}
            {viewMode === "3d" ? (
              <PhotoAvatar3D
                photoUrl={photoUrl}
                isSpeaking={isSpeaking}
                audioLevel={audioLevel}
                avatarName={activeAvatar?.name || "Companion"}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full relative flex items-center justify-center" style={{ background: "var(--void)" }}>
                <AvatarVideoPlayer
                  ref={videoPlayerRef}
                  videoUrl={currentVideoUrl || introVideoUrl}
                  photoUrl={photoUrl}
                  isLoading={isGeneratingIntro}
                  isMuted={isMuted}
                  showReplayButton={true}
                  onVideoEnd={() => {
                    setIsPlayingVideo(false);
                  }}
                  onReplay={() => {
                    setIsPlayingVideo(true);
                  }}
                  size="full"
                  className="w-full h-full object-cover"
                />

                {/* Return to 3D Button overlay */}
                <button
                  type="button"
                  onClick={() => setViewMode("3d")}
                  className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all z-20 cursor-pointer shadow-lg"
                  style={{
                    background: "rgba(8, 11, 18, 0.75)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--border-1)",
                    color: "var(--text-0)",
                    fontSize: 11,
                  }}
                >
                  <Box size={12} style={{ color: "var(--brand-glow)" }} />
                  <span>Switch to 3D</span>
                </button>
              </div>
            )}

            {/* Quick Action Badges on Avatar Frame */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-auto z-20">
              {/* Instant Replay Video Button (When video exists) */}
              {(introVideoUrl || currentVideoUrl) && (
                <button
                  type="button"
                  onClick={handleReplayVideo}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer shadow-lg hover:scale-105"
                  style={{
                    background: "rgba(8, 11, 18, 0.8)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--border-brand)",
                    color: "var(--text-0)",
                  }}
                  title="Replay Video (0 Credits)"
                >
                  <RotateCcw size={12} style={{ color: "var(--brand-glow)" }} />
                  <span>Replay Video</span>
                </button>
              )}

              {/* Intro Video Trigger (if none generated yet) */}
              {!introVideoUrl && !currentVideoUrl && (
                <button
                  type="button"
                  onClick={handlePlayOrGenerateIntro}
                  disabled={isGeneratingIntro}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer shadow-lg hover:scale-105 ml-auto"
                  style={{
                    background: "linear-gradient(135deg, #FFD166 0%, #FFBE3B 100%)",
                    color: "#1A0824",
                    boxShadow: "0 0 16px rgba(255, 209, 102, 0.4)",
                    fontWeight: 700,
                  }}
                >
                  {isGeneratingIntro ? (
                    <>
                      <Loader2 size={12} className="animate-spin text-[#1A0824]" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} color="#1A0824" />
                      <span>Generate Intro Video</span>
                    </>
                  )}
                </button>
              )}

              {/* View Mode Quick Indicator */}
              <div
                className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px]"
                style={{
                  background: "rgba(8, 11, 18, 0.75)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid var(--border-0)",
                  color: "var(--lavender)",
                }}
              >
                <Radio size={10} className="text-emerald-400 animate-pulse" />
                <span>{viewMode === "3d" ? "Real-time 3D Mesh" : "D-ID Talk Stream"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Subtitle & Transcript Card */}
        <div
          className="w-full max-w-[460px] sm:max-w-[500px] mt-4 p-3.5 sm:p-4 rounded-2xl shadow-lg"
          style={{
            background: "var(--surface-0)",
            border: "1px solid var(--border-0)",
          }}
        >
          <div className="flex items-start gap-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background: "rgba(124, 79, 240, 0.15)",
                border: "1px solid rgba(124, 79, 240, 0.3)",
                color: "var(--brand-glow)",
              }}
            >
              <Heart size={12} />
            </div>
            <div className="flex-1">
              <p className="text-[12.5px] leading-relaxed font-medium" style={{ color: "var(--text-0)" }}>
                {subtitle || `${activeAvatar?.name || "Companion"} is ready to speak with you.`}
              </p>
              {transcript && (
                <p className="text-[11px] italic mt-1.5 flex items-center gap-1" style={{ color: "var(--brand-glow)" }}>
                  <Mic size={11} className="animate-pulse" />
                  &ldquo;{transcript}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Inline Message Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (textInput.trim()) {
              handleSendMessage(textInput.trim());
            }
          }}
          className="w-full max-w-[460px] sm:max-w-[500px] mt-3 flex items-center gap-2"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`Say something to ${activeAvatar?.name || "companion"}...`}
            className="flex-1 px-4 py-2.5 rounded-full text-[12px] transition-all"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-1)",
              color: "var(--text-0)",
            }}
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="btn btn-primary btn-sm flex items-center justify-center p-2.5 rounded-full disabled:opacity-40 cursor-pointer"
            title="Send Message"
          >
            <Send size={14} />
          </button>
        </form>
      </main>

      {/* Bottom Floating Call Control Dock */}
      <footer className="p-4 sm:p-6 flex justify-center z-20">
        <div
          className="flex items-center gap-3 sm:gap-5 px-6 py-3 rounded-full shadow-2xl"
          style={{
            background: "var(--surface-0)",
            border: "1px solid var(--border-1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          }}
        >
          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-3 rounded-full transition-all cursor-pointer"
            style={{
              background: isMuted ? "rgba(248, 113, 113, 0.15)" : "var(--surface-1)",
              border: isMuted ? "1px solid rgba(248, 113, 113, 0.4)" : "1px solid var(--border-0)",
              color: isMuted ? "var(--danger)" : "var(--text-0)",
            }}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Big Center Microphone (Push to Speak / Click to Talk) */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-4 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-xl ${
              isListening
                ? "bg-rose-600 border-2 border-rose-300 text-white animate-pulse scale-110 shadow-rose-600/50"
                : "text-white hover:scale-105"
            }`}
            style={{
              background:
                isListening
                  ? undefined
                  : "linear-gradient(135deg, #7C4FF0, #9D6FF4)",
              boxShadow: "0 0 24px rgba(124, 79, 240, 0.5)",
            }}
            title={isListening ? "Listening... Click to send" : "Click to Talk"}
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {/* Replay Video Button */}
          {(introVideoUrl || currentVideoUrl) && (
            <button
              type="button"
              onClick={handleReplayVideo}
              className="p-3 rounded-full transition-all cursor-pointer hover:scale-105"
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-0)",
                color: "var(--text-0)",
              }}
              title="Replay Video (0 Credits)"
            >
              <RotateCcw size={18} style={{ color: "var(--brand-glow)" }} />
            </button>
          )}

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="p-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-lg hover:scale-105"
            title="End Call"
          >
            <PhoneOff size={18} />
          </button>
        </div>
      </footer>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl relative"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-1)",
            }}
          >
            <button
              type="button"
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full transition-colors cursor-pointer text-[18px]"
              style={{ color: "var(--text-2)" }}
            >
              ✕
            </button>
            <h3 className="text-[16px] font-bold mb-4 text-center" style={{ color: "var(--text-0)" }}>
              Update Portrait Photo
            </h3>
            <AvatarPhotoUpload
              avatarId={activeAvatar?.id}
              avatarName={activeAvatar?.name}
              currentPhotoUrl={photoUrl}
              onUploadComplete={(newUrl) => {
                setPhotoUrl(newUrl);
                setShowPhotoModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "var(--void)", color: "var(--text-0)" }}
        >
          <Loader2 size={36} className="animate-spin" style={{ color: "var(--brand-glow)" }} />
        </div>
      }
    >
      <CallContent />
    </Suspense>
  );
}
