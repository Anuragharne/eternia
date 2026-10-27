"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
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
  Send,
  Loader2,
  Radio,
  Clock,
  Heart,
  Smile,
  ChevronDown,
  User,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { AvatarPhotoUpload } from "../../components/chat/AvatarPhotoUpload";

// High quality Simli default faces
const DEFAULT_SIMLI_FACES = [
  { id: "03ce3ee8-db97-4150-a333-8f643d48fee9", name: "Daniel (Male)", gender: "male" },
  { id: "3bad681f-1b4a-4507-bc54-fbc675c191b7", name: "Victor (Male)", gender: "male" },
  { id: "66d1f5af-9b9b-49e2-a97f-6f5f3d59a2d5", name: "Tina (Female)", gender: "female" },
  { id: "8ef039c1-06d7-4ea7-b01c-6b620c755a92", name: "Ruby (Female)", gender: "female" },
  { id: "148efaa3-0224-490d-ab77-2a026f4e6738", name: "Alex (Neutral)", gender: "all" },
];

function CallContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const avatarId = searchParams.get("avatarId");

  // State
  const [avatars, setAvatars] = useState([]);
  const [activeAvatar, setActiveAvatar] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);

  // Simli Live Avatar State
  const [isSimliConnected, setIsSimliConnected] = useState(false);
  const [isSimliConnecting, setIsSimliConnecting] = useState(false);
  const [selectedFaceId, setSelectedFaceId] = useState(DEFAULT_SIMLI_FACES[0].id);
  const [showFaceMenu, setShowFaceMenu] = useState(false);

  // Audio & Speech
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [callDuration, setCallDuration] = useState(0);

  // Modals & Text Input
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [callStatus, setCallStatus] = useState("Connecting to companion...");

  // Refs
  const simliVideoRef = useRef(null);
  const simliAudioRef = useRef(null);
  const companionAudioRef = useRef(null);
  const simliClientRef = useRef(null);
  const audioContextSourceAttached = useRef(false);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

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

  // 2. Fetch avatar and photo data
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
          try {
            const photoRes = await api.getAvatarPhotoUrl(target.id);
            if (isMounted && photoRes?.photo_url) {
              setPhotoUrl(photoRes.photo_url);
            }
          } catch (pErr) {
            console.warn("Photo fetch notice:", pErr);
          }

          setCallStatus("Live Holographic Call");
          setSubtitle(`Connected with ${target.name}. Click the mic or type below.`);
        } else {
          setCallStatus("No Companion Found");
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

  // 3. Initialize Simli WebRTC Live Stream
  const initSimliSession = async (faceId = selectedFaceId) => {
    if (typeof window === "undefined") return;
    setIsSimliConnecting(true);
    setCallStatus("Connecting to Simli 16:9 Stream...");

    // Stop previous instance if exists
    if (simliClientRef.current) {
      try {
        await simliClientRef.current.stop();
      } catch {}
      simliClientRef.current = null;
      audioContextSourceAttached.current = false;
    }

    try {
      const { SimliClient } = await import("simli-client");
      const tokenRes = await api.getSimliToken(activeAvatar?.id, faceId);

      if (!tokenRes?.session_token) {
        throw new Error("No session token received from Simli");
      }

      if (simliVideoRef.current && simliAudioRef.current) {
        const client = new SimliClient(
          tokenRes.session_token,
          simliVideoRef.current,
          simliAudioRef.current,
          null
        );

        client.on("start", () => {
          console.log("[Simli] WebRTC 16:9 Stream Started!");
          setIsSimliConnected(true);
          setIsSimliConnecting(false);
          setCallStatus("Live 16:9 Stream Active");
        });

        client.on("stop", () => {
          console.log("[Simli] WebRTC Stream stopped");
          setIsSimliConnected(false);
          setIsSimliConnecting(false);
          setCallStatus("Stream Paused");
        });

        client.on("speaking", () => {
          setIsSpeaking(true);
        });

        client.on("silent", () => {
          setIsSpeaking(false);
        });

        client.on("error", (err) => {
          console.warn("[Simli] WebRTC error:", err);
          setIsSimliConnected(false);
          setIsSimliConnecting(false);
          setCallStatus("Stream Offline (Photo Mode)");
        });

        client.on("startup_error", (err) => {
          console.warn("[Simli] Startup error:", err);
          setIsSimliConnected(false);
          setIsSimliConnecting(false);
          setCallStatus("Interactive Mode");
        });

        await client.start();
        simliClientRef.current = client;

        // Attach companion audio element for automatic lip-sync
        if (companionAudioRef.current && !audioContextSourceAttached.current) {
          try {
            client.listenToAudioElement(companionAudioRef.current);
            audioContextSourceAttached.current = true;
          } catch (audioErr) {
            console.warn("[Simli] Audio element binding notice:", audioErr);
          }
        }
      }
    } catch (err) {
      console.warn("Simli WebRTC initialization notice:", err);
      setIsSimliConnecting(false);
      setIsSimliConnected(false);
      setCallStatus("Interactive Mode");
    }
  };

  // Start Simli when avatar is loaded
  useEffect(() => {
    if (activeAvatar) {
      initSimliSession(selectedFaceId);
    }
    return () => {
      if (simliClientRef.current) {
        try {
          simliClientRef.current.stop();
        } catch {}
        simliClientRef.current = null;
      }
    };
  }, [activeAvatar?.id, selectedFaceId]);

  // 4. Speech Recognition Setup (Web Speech API)
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use text input or Google Chrome.");
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

  // 5. Send message and handle companion response with Simli audio pipe
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
        const audioBlob = await api.getSpeechAudioBlob(activeAvatar.id, reply);
        const audioUrl = URL.createObjectURL(audioBlob);

        if (companionAudioRef.current) {
          companionAudioRef.current.pause();
          companionAudioRef.current.src = audioUrl;
          companionAudioRef.current.muted = isMuted;

          companionAudioRef.current.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
          };

          companionAudioRef.current.onerror = () => {
            setIsSpeaking(false);
          };

          await companionAudioRef.current.play().catch((playErr) => {
            console.warn("Audio play notice:", playErr);
            setIsSpeaking(false);
          });
        }
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

  // 6. Toggle Mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (companionAudioRef.current) {
      companionAudioRef.current.muted = !isMuted;
    }
    if (simliAudioRef.current) {
      simliAudioRef.current.muted = !isMuted;
    }
  };

  // 7. End Call
  const handleEndCall = () => {
    if (companionAudioRef.current) {
      companionAudioRef.current.pause();
    }
    if (simliClientRef.current) {
      try {
        simliClientRef.current.stop();
      } catch {}
      simliClientRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    router.push(activeAvatar ? `/chat?avatarId=${activeAvatar.id}` : "/chat");
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#0D0D0D] text-[#FAFAFA] flex flex-col relative select-none">
      {/* Background Ambient Violet Backlight Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-tr from-[#433075]/30 via-[#A58CF4]/15 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Hidden Audio Elements for WebRTC and TTS */}
      <audio ref={simliAudioRef} autoPlay playsInline />
      <audio ref={companionAudioRef} crossOrigin="anonymous" />

      {/* 1. Top Header Bar (56px) */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#A58CF4]/15 bg-[#0D0D0D]/80 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={activeAvatar ? `/chat?avatarId=${activeAvatar.id}` : "/chat"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#433075]/30 hover:bg-[#433075]/60 border border-[#A58CF4]/25 text-[#FAFAFA] text-[12px] font-medium transition-all no-underline"
          >
            <ArrowLeft size={14} className="text-[#A58CF4]" />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>

          {activeAvatar && (
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isSimliConnected ? "bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <div>
                <h1 className="text-[13.5px] font-semibold tracking-wide text-[#FAFAFA] leading-tight flex items-center gap-1.5">
                  {activeAvatar.name}
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#433075]/40 text-[#A58CF4] border border-[#A58CF4]/20 font-normal">
                    {activeAvatar.relationship || "Companion"}
                  </span>
                </h1>
                <p className="text-[10px] text-[rgba(250,250,250,0.6)]">
                  {callStatus}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Center: Call Duration Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#433075]/25 border border-[#A58CF4]/20 text-[11.5px] text-[#FAFAFA]">
          <Clock size={12} className="text-[#A58CF4]" />
          <span className="font-mono tracking-wider">{formatDuration(callDuration)}</span>
        </div>

        {/* Right: Actions (Face Preset Selector & Photo Upload) */}
        <div className="flex items-center gap-2 relative">
          {/* Face Preset Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFaceMenu(!showFaceMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#433075]/30 hover:bg-[#433075]/60 border border-[#A58CF4]/25 text-[#A58CF4] hover:text-[#FAFAFA] text-[11px] font-medium transition-all cursor-pointer"
              title="Select Avatar Persona Face"
            >
              <Smile size={12} />
              <span className="hidden md:inline">Avatar Face</span>
              <ChevronDown size={11} />
            </button>

            {showFaceMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#0D0D0D]/95 border border-[#A58CF4]/30 shadow-2xl p-1.5 z-50 backdrop-blur-2xl">
                <div className="text-[10px] text-[#A58CF4] font-semibold px-2 py-1 uppercase tracking-wider">
                  Simli 16:9 Faces
                </div>
                {DEFAULT_SIMLI_FACES.map((face) => (
                  <button
                    key={face.id}
                    onClick={() => {
                      setSelectedFaceId(face.id);
                      setShowFaceMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] flex items-center justify-between transition-all ${
                      selectedFaceId === face.id
                        ? "bg-[#433075] text-[#FAFAFA] font-medium"
                        : "text-[rgba(250,250,250,0.7)] hover:bg-[#433075]/40 hover:text-[#FAFAFA]"
                    }`}
                  >
                    <span>{face.name}</span>
                    {selectedFaceId === face.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Photo Upload Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowPhotoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#433075]/30 hover:bg-[#433075]/60 border border-[#A58CF4]/25 text-[#A58CF4] hover:text-[#FAFAFA] text-[11px] font-medium transition-all cursor-pointer"
            title="Update Portrait Photo"
          >
            <Camera size={12} />
            <span className="hidden sm:inline">Photo</span>
          </button>
        </div>
      </header>

      {/* 2. Main Viewport: Single Frame Layout (Zero Scroll) */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-between p-2 sm:px-6 sm:py-3 overflow-hidden w-full max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 size={36} className="text-[#A58CF4] animate-spin" />
            <p className="text-[13px] text-[rgba(250,250,250,0.7)] font-medium">
              Connecting to live video call...
            </p>
          </div>
        ) : (
          <>
            {/* 16:9 Cinematic Widescreen Avatar Frame */}
            <div className="w-full max-w-4xl aspect-video max-h-[calc(100vh-215px)] min-h-[240px] relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0A0A0F] border border-[#A58CF4]/30 shadow-[0_16px_70px_rgba(67,48,117,0.35)] flex items-center justify-center shrink">
              {/* WebRTC Video Element (Always mounted for stream binding) */}
              <video
                ref={simliVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-700 ${
                  isSimliConnected ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              />

              {/* Seamless Companion Photo Fallback / Idle Display */}
              <div
                className={`absolute inset-0 flex items-center justify-center bg-[#0D0D0D] transition-opacity duration-700 ${
                  isSimliConnected ? "opacity-0 pointer-events-none" : "opacity-100 z-10"
                }`}
              >
                {photoUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                    {/* Blurred background backdrop filling entire 16:9 width */}
                    <img
                      src={photoUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-55 scale-125 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.85)_100%)] pointer-events-none" />
                    {/* Centered portrait image with gentle breathing pulse */}
                    <img
                      src={photoUrl}
                      alt={activeAvatar?.name || "Companion"}
                      className={`relative max-h-full max-w-full object-contain rounded-2xl shadow-2xl z-10 transition-transform duration-1000 ${
                        isSpeaking ? "scale-[1.02]" : "scale-100 animate-pulse"
                      }`}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center p-6">
                    <div className="w-20 h-20 rounded-full bg-[#433075]/30 border border-[#A58CF4]/40 flex items-center justify-center text-[#A58CF4]">
                      <User size={36} />
                    </div>
                    <p className="text-[14px] font-medium text-[#FAFAFA]">
                      {activeAvatar?.name || "Companion"}
                    </p>
                    <p className="text-[11px] text-[rgba(250,250,250,0.5)]">
                      Connecting live interactive avatar stream...
                    </p>
                  </div>
                )}
              </div>

              {/* Status Badge Over Video (Top Left) */}
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#A58CF4]/25 text-[10.5px] text-[#FAFAFA]">
                <Radio
                  size={10}
                  className={isSimliConnected ? "text-emerald-400 animate-pulse" : "text-amber-400"}
                />
                <span>
                  {isSimliConnected
                    ? "16:9 WebRTC Live Stream"
                    : isSimliConnecting
                    ? "Connecting Simli Stream..."
                    : "Real-time Ready"}
                </span>
              </div>

              {/* Speaking Indicator Badge (Top Right) */}
              {isSpeaking && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#433075]/80 backdrop-blur-md border border-[#A58CF4]/40 text-[10.5px] text-[#FAFAFA] animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#A58CF4] animate-ping" />
                  <span>Speaking...</span>
                </div>
              )}

              {/* Subtitles & Captions Overlaid at Bottom Edge of 16:9 Video */}
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-6 sm:right-6 z-20 pointer-events-auto">
                <div className="px-4 py-2 sm:py-2.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-[#A58CF4]/30 shadow-2xl flex items-center gap-2.5 transition-all">
                  <div className="w-6 h-6 rounded-full bg-[#433075]/60 border border-[#A58CF4]/40 flex items-center justify-center shrink-0 text-[#A58CF4]">
                    <Heart size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] sm:text-[13px] leading-snug text-[#FAFAFA] font-medium truncate">
                      {subtitle || `Connected with ${activeAvatar?.name || "companion"}.`}
                    </p>
                    {transcript && (
                      <p className="text-[11px] text-[#A58CF4] italic truncate flex items-center gap-1 mt-0.5">
                        <Mic size={10} className="animate-pulse" />
                        &ldquo;{transcript}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Controls Section Anchored Below 16:9 Avatar (Same Viewport Frame) */}
            <div className="w-full max-w-4xl flex flex-col items-center gap-2 sm:gap-2.5 shrink-0 mt-2">
              {/* Compact Quick Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (textInput.trim()) {
                    handleSendMessage(textInput.trim());
                  }
                }}
                className="w-full max-w-2xl flex items-center gap-2"
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`Say something to ${activeAvatar?.name || "companion"}...`}
                  className="flex-1 px-4 py-2 rounded-full bg-[#1A1A2E]/80 border border-[#A58CF4]/25 text-[12px] text-[#FAFAFA] placeholder:text-[rgba(250,250,250,0.4)] focus:outline-none focus:border-[#A58CF4] transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="p-2 sm:px-4 sm:py-2 rounded-full bg-[#433075] hover:bg-[#A58CF4]/80 disabled:opacity-40 text-[#FAFAFA] text-[12px] font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                  title="Send Message"
                >
                  <Send size={13} />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>

              {/* Floating Call Action Dock */}
              <div className="flex items-center gap-3 sm:gap-4 px-5 py-2 rounded-full bg-[#0D0D0D]/90 backdrop-blur-2xl border border-[#A58CF4]/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
                {/* Volume / Mute Toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-3 rounded-full border transition-all cursor-pointer ${
                    isMuted
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      : "bg-[#433075]/30 hover:bg-[#433075]/60 border-[#A58CF4]/25 text-[#FAFAFA]"
                  }`}
                  title={isMuted ? "Unmute Audio" : "Mute Audio"}
                >
                  {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>

                {/* Big Interactive Microphone Button */}
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`relative p-4 rounded-full border transition-all cursor-pointer shadow-xl ${
                    isListening
                      ? "bg-rose-600 border-rose-400 text-white animate-pulse scale-110 shadow-rose-600/50"
                      : "bg-gradient-to-tr from-[#433075] to-[#A58CF4] hover:brightness-110 border-[#A58CF4]/50 text-white shadow-[#433075]/60 hover:scale-105"
                  }`}
                  title={isListening ? "Listening... Click to stop" : "Click to speak"}
                >
                  {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                  {isListening && (
                    <span className="absolute -inset-1 rounded-full border-2 border-rose-400 animate-ping pointer-events-none" />
                  )}
                </button>

                {/* Refresh / Reconnect WebRTC Stream */}
                <button
                  type="button"
                  onClick={() => initSimliSession(selectedFaceId)}
                  disabled={isSimliConnecting}
                  className="p-3 rounded-full bg-[#433075]/30 hover:bg-[#433075]/60 border border-[#A58CF4]/25 text-[#FAFAFA] transition-all cursor-pointer disabled:opacity-50"
                  title="Reconnect Simli Live Stream"
                >
                  <RotateCcw
                    size={17}
                    className={`text-[#A58CF4] ${isSimliConnecting ? "animate-spin" : ""}`}
                  />
                </button>

                {/* Hang Up / Exit Call */}
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="p-3 rounded-full bg-rose-600/90 hover:bg-rose-600 border border-rose-400 text-white transition-all cursor-pointer shadow-lg hover:scale-105"
                  title="End Call and Return to Chat"
                >
                  <PhoneOff size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Portrait Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl bg-[#0D0D0D] border border-[#A58CF4]/30 p-6 shadow-2xl">
            <h3 className="text-[16px] font-bold text-[#FAFAFA] mb-1">
              Update Companion Photo
            </h3>
            <p className="text-[12px] text-[rgba(250,250,250,0.6)] mb-4">
              Upload a clear front-facing portrait to customize your companion&apos;s appearance.
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
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="px-4 py-1.5 rounded-full bg-[#433075]/30 hover:bg-[#433075]/60 text-[12px] text-[#FAFAFA] border border-[#A58CF4]/25 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
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
        <div className="h-screen bg-[#0D0D0D] flex items-center justify-center text-[#FAFAFA]">
          <Loader2 size={32} className="animate-spin text-[#A58CF4]" />
        </div>
      }
    >
      <CallContent />
    </Suspense>
  );
}
