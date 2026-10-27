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
  Sparkles,
  MessageSquare,
  Send,
  Loader2,
  Radio,
  Clock,
  Heart,
  ChevronDown,
  AudioWaveform,
  Square,
  RefreshCw,
  Plus,
  UserPlus,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import CreateAvatarModal from "../../components/chat/CreateAvatarModal";

function VoiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const avatarId = searchParams.get("avatarId");

  // State
  const [avatars, setAvatars] = useState([]);
  const [activeAvatar, setActiveAvatar] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [voiceInfo, setVoiceInfo] = useState(null);

  // Call Status
  const [callStatus, setCallStatus] = useState("connecting"); // "connecting" | "idle" | "listening" | "thinking" | "speaking" | "muted"
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isHandsFree, setIsHandsFree] = useState(true);

  // Subtitles & Transcripts
  const [liveTranscript, setLiveTranscript] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [recentDialogue, setRecentDialogue] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [showCreateAvatarModal, setShowCreateAvatarModal] = useState(false);

  // Audio reactivity
  const [audioLevel, setAudioLevel] = useState(0.4);

  // Refs
  const recognitionRef = useRef(null);
  const companionAudioRef = useRef(null);
  const timerRef = useRef(null);
  const isCallActiveRef = useRef(true);
  const callStatusRef = useRef("connecting");

  // Keep ref in sync
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // 1. Call Duration Timer
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

  // 2. Fetch Companion & Voice Data
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
          // Fetch voice info
          try {
            const vInfo = await api.getVoiceInfo(target.id);
            if (isMounted) setVoiceInfo(vInfo);
          } catch (vErr) {
            console.warn("Voice info fallback:", vErr);
          }

          // Fetch photo URL if available
          try {
            const pRes = await api.getAvatarPhotoUrl(target.id);
            if (isMounted && pRes?.photo_url) {
              setPhotoUrl(pRes.photo_url);
            }
          } catch (pErr) {
            console.warn("Photo fetch fallback:", pErr);
          }

          const greeting = `Hello! It is so wonderful to hear your voice. What would you like to reflect on together today?`;
          setSubtitle(greeting);
          setCallStatus("speaking");
          playCompanionVoice(greeting, target.id);
        } else {
          setCallStatus("idle");
        }
      } catch (err) {
        console.error("Voice call load error:", err);
        setCallStatus("idle");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
      isCallActiveRef.current = false;
      if (companionAudioRef.current) {
        companionAudioRef.current.pause();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [avatarId]);

  const switchAvatar = async (target) => {
    if (!target || target.id === activeAvatar?.id) {
      setShowAvatarDropdown(false);
      return;
    }
    setShowAvatarDropdown(false);
    setActiveAvatar(target);
    setPhotoUrl(target.photo_url || target.photo_s3_key || null);
    setRecentDialogue([]);
    setCallStatus("connecting");
    if (companionAudioRef.current) {
      companionAudioRef.current.pause();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    router.replace(`/voice?avatarId=${target.id}`, { scroll: false });

    try {
      const vInfo = await api.getVoiceInfo(target.id).catch(() => null);
      setVoiceInfo(vInfo);
      const pRes = await api.getAvatarPhotoUrl(target.id).catch(() => null);
      if (pRes?.photo_url) setPhotoUrl(pRes.photo_url);

      const greeting = `Hello! It is so wonderful to hear your voice. What would you like to reflect on together today?`;
      setSubtitle(greeting);
      setCallStatus("speaking");
      playCompanionVoice(greeting, target.id);
    } catch (e) {
      setCallStatus("idle");
    }
  };

  // 3. Speech Recognition (Speech-to-Text)
  const startListening = () => {
    if (typeof window === "undefined" || !isCallActiveRef.current) return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Microphone speech recognition is supported in Chrome, Edge, and Safari.");
      return;
    }

    // Stop previous audio
    if (companionAudioRef.current) {
      companionAudioRef.current.pause();
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setCallStatus("listening");
        setLiveTranscript("");
      };

      recognition.onresult = (e) => {
        let currentText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          currentText += e.results[i][0].transcript;
        }
        setLiveTranscript(currentText);
      };

      recognition.onerror = (e) => {
        console.warn("Voice recognition notice:", e.error);
        if (callStatusRef.current === "listening") {
          setCallStatus("idle");
        }
      };

      recognition.onend = () => {
        if (callStatusRef.current === "listening") {
          setCallStatus("idle");
          if (liveTranscript.trim()) {
            handleSendUserVoice(liveTranscript.trim());
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Voice recognition start failed:", err);
      setCallStatus("idle");
    }
  };

  const stopListeningAndSend = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (liveTranscript.trim()) {
      handleSendUserVoice(liveTranscript.trim());
    } else {
      setCallStatus("idle");
    }
  };

  // 4. Send Message & Play Voice Response
  const handleSendUserVoice = async (userText) => {
    if (!userText || !activeAvatar) return;
    setCallStatus("thinking");
    setLiveTranscript("");
    setTextInput("");
    setSubtitle("Reflecting on memories...");

    // Append to dialogue history
    setRecentDialogue((prev) => [
      ...prev.slice(-4),
      { role: "user", text: userText },
    ]);

    try {
      const res = await api.sendMessage(activeAvatar.id, userText);
      const reply = res?.companion_reply || res?.message || "";
      setSubtitle(reply);
      setRecentDialogue((prev) => [
        ...prev.slice(-4),
        { role: "assistant", text: reply },
      ]);

      await playCompanionVoice(reply, activeAvatar.id);
    } catch (err) {
      console.error("Voice turn error:", err);
      setSubtitle("I am reflecting quietly with you. Tell me a little more.");
      setCallStatus("idle");
    }
  };

  // 5. Play Companion Speech (ElevenLabs with browser TTS fallback)
  const playCompanionVoice = async (text, id) => {
    const targetId = id || activeAvatar?.id;
    if (!targetId || !isCallActiveRef.current) return;

    setCallStatus("speaking");
    setAudioLevel(0.85);

    try {
      const audioBlob = await api.getSpeechAudioBlob(targetId, text);
      if (!isCallActiveRef.current) return;

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      companionAudioRef.current = audio;
      audio.muted = isMuted;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setCallStatus("idle");
        setAudioLevel(0.3);
        // Hands-free auto listen
        if (isHandsFree && isCallActiveRef.current) {
          setTimeout(() => {
            if (isCallActiveRef.current && callStatusRef.current === "idle") {
              startListening();
            }
          }, 600);
        }
      };

      audio.onerror = (e) => {
        console.warn("ElevenLabs audio play notice, falling back to speech synthesis:", e);
        fallbackBrowserSpeech(text);
      };

      await audio.play();
    } catch (err) {
      console.warn("TTS synthesis error, using browser speech synthesis:", err);
      fallbackBrowserSpeech(text);
    }
  };

  const fallbackBrowserSpeech = (text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setCallStatus("idle");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onstart = () => {
      setCallStatus("speaking");
      setAudioLevel(0.8);
    };

    utterance.onend = () => {
      setCallStatus("idle");
      setAudioLevel(0.3);
      if (isHandsFree && isCallActiveRef.current) {
        setTimeout(() => {
          if (isCallActiveRef.current && callStatusRef.current === "idle") {
            startListening();
          }
        }, 600);
      }
    };

    utterance.onerror = () => {
      setCallStatus("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  // 6. Interrupt Companion
  const handleInterrupt = () => {
    if (companionAudioRef.current) {
      companionAudioRef.current.pause();
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    startListening();
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
    isCallActiveRef.current = false;
    if (companionAudioRef.current) {
      companionAudioRef.current.pause();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    router.push(activeAvatar ? `/chat?avatarId=${activeAvatar.id}` : "/chat");
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden select-none"
      style={{ background: "var(--void)", color: "var(--text-0)" }}
    >
      {/* Dynamic Ambient Background Glow in Dark Purple, Wisteria, and Sunglow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full pointer-events-none -z-10 blur-3xl transition-all duration-700"
        style={{
          background:
            callStatus === "listening"
              ? "radial-gradient(circle, rgba(255, 209, 102, 0.35) 0%, rgba(188, 150, 230, 0.25) 45%, transparent 70%)"
              : callStatus === "speaking"
              ? "radial-gradient(circle, rgba(255, 209, 102, 0.45) 0%, rgba(33, 11, 44, 0.6) 45%, transparent 70%)"
              : "radial-gradient(circle, rgba(188, 150, 230, 0.35) 0%, rgba(33, 11, 44, 0.5) 45%, transparent 70%)",
        }}
      />

      {/* Top Header Bar */}
      <header
        className="h-16 px-4 sm:px-6 flex items-center justify-between z-20"
        style={{
          background: "var(--surface-0)",
          borderBottom: "1px solid var(--border-1)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href={activeAvatar ? `/chat?avatarId=${activeAvatar.id}` : "/chat"}
            className="btn btn-ghost btn-sm flex items-center gap-1.5"
            style={{ textDecoration: "none", fontSize: 12, padding: "6px 12px" }}
          >
            <ArrowLeft size={14} style={{ color: "var(--sunglow)" }} />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>

          {activeAvatar && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAvatarDropdown(!showAvatarDropdown)}
                className="flex items-center gap-2.5 p-1.5 px-3 rounded-2xl hover:bg-[#3B184C]/50 transition-all cursor-pointer border border-transparent hover:border-[#BC96E6]/30 text-left"
                title="Switch Companion"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    callStatus === "listening"
                      ? "bg-[#FFD166] shadow-sm shadow-[#FFD166] animate-pulse"
                      : callStatus === "speaking"
                      ? "bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse"
                      : "bg-[#BC96E6]"
                  }`}
                />
                <div>
                  <h1 className="text-[14px] font-semibold tracking-wide leading-tight flex items-center gap-1.5" style={{ color: "#FAF6FF" }}>
                    <span>{activeAvatar.name}</span>
                    <ChevronDown size={14} className="text-[#FFD166] transition-transform" />
                    <span
                      className="text-[10px] px-2.5 py-0.5 rounded-full font-bold"
                      style={{
                        background: "rgba(255, 209, 102, 0.15)",
                        color: "var(--sunglow)",
                        border: "1px solid rgba(255, 209, 102, 0.4)",
                      }}
                    >
                      {activeAvatar.relationship || "Companion"}
                    </span>
                  </h1>
                  <p className="text-[10.5px] flex items-center gap-1" style={{ color: "var(--text-2)" }}>
                    <Volume2 size={10} style={{ color: "var(--sunglow)" }} />
                    <span>
                      {voiceInfo?.is_cloned || activeAvatar.voice_status === "cloned" || activeAvatar.persona_config?.elevenlabs_voice_id
                        ? "🎙️ ElevenLabs Cloned Voice"
                        : voiceInfo
                        ? `${voiceInfo.voice_name} Voice`
                        : "Neural Voice"}
                    </span>
                  </p>
                </div>
              </button>

              {/* Companion Switcher Dropdown */}
              {showAvatarDropdown && (
                <div
                  className="absolute top-full left-0 mt-2 w-72 rounded-2xl p-2 z-50 shadow-2xl"
                  style={{
                    background: "var(--surface-0)",
                    border: "1px solid var(--border-1)",
                    boxShadow: "0 20px 60px rgba(18, 5, 24, 0.8)",
                  }}
                >
                  <div className="text-[10px] uppercase tracking-wider px-3 py-1 font-bold" style={{ color: "var(--sunglow)" }}>
                    Choose Companion
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1 my-1 pr-1">
                    {avatars.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => switchAvatar(av)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[12px] transition-all cursor-pointer"
                        style={{
                          background: av.id === activeAvatar.id ? "rgba(255, 209, 102, 0.15)" : "transparent",
                          border: av.id === activeAvatar.id ? "1px solid var(--border-sunglow)" : "1px solid transparent",
                          color: av.id === activeAvatar.id ? "#FAF6FF" : "var(--text-1)",
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden"
                          style={{
                            background: "linear-gradient(135deg, #210B2C, #3B184C)",
                            border: "1px solid rgba(255, 209, 102, 0.4)",
                            color: "var(--sunglow)",
                          }}
                        >
                          {av.photo_url ? (
                            <img src={av.photo_url} alt={av.name} className="w-full h-full object-cover" />
                          ) : (
                            av.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate text-[12.5px] text-[#FAF6FF]">{av.name}</div>
                          <div className="text-[10px] text-[var(--text-2)] truncate">
                            {av.relationship || "Companion"}
                            {av.voice_status === "cloned" || av.persona_config?.elevenlabs_voice_id ? " · 🎙️ Cloned" : ""}
                          </div>
                        </div>
                        {av.id === activeAvatar.id && (
                          <div className="w-2 h-2 rounded-full bg-[#FFD166] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 mt-1" style={{ borderTop: "1px solid var(--border-0)" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAvatarDropdown(false);
                        setShowCreateAvatarModal(true);
                      }}
                      className="w-full btn btn-primary btn-sm flex items-center justify-center gap-1.5 py-1.5"
                    >
                      <Plus size={13} />
                      <span>+ Create New Companion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Duration Pill */}
        <div
          className="hidden sm:flex items-center gap-2 px-3.5 py-1 rounded-full text-[12px]"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-0)",
            color: "var(--text-0)",
          }}
        >
          <Clock size={13} style={{ color: "var(--lavender)" }} />
          <span className="font-mono tracking-wider">{formatDuration(callDuration)}</span>
        </div>

        {/* Right: Hands-free toggle & Switch to Video Call link */}
        <div className="flex items-center gap-2">
          {/* Hands-free mode toggle button */}
          <button
            type="button"
            onClick={() => setIsHandsFree(!isHandsFree)}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer"
            style={{
              background: isHandsFree ? "rgba(124, 79, 240, 0.2)" : "transparent",
              color: isHandsFree ? "var(--text-0)" : "var(--text-2)",
              border: isHandsFree ? "1px solid var(--brand)" : "1px solid var(--border-0)",
            }}
            title="Auto-listen after companion speaks"
          >
            <Sparkles size={11} style={{ color: isHandsFree ? "var(--brand-glow)" : "var(--text-2)" }} />
            <span>Hands-free: {isHandsFree ? "ON" : "OFF"}</span>
          </button>

          {/* Create New Companion button */}
          <button
            type="button"
            onClick={() => setShowCreateAvatarModal(true)}
            className="btn btn-ghost btn-sm flex items-center gap-1.5"
            style={{ fontSize: 11, padding: "5px 10px" }}
            title="Create New Companion"
          >
            <UserPlus size={12} style={{ color: "var(--sunglow)" }} />
            <span className="hidden md:inline">New Companion</span>
          </button>

          {/* Link to Video Call */}
          <Link
            href={activeAvatar ? `/call?avatarId=${activeAvatar.id}` : "/call"}
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: "none", fontSize: 11, padding: "5px 12px" }}
            title="Switch to Video Call"
          >
            <span>Video Call →</span>
          </Link>
        </div>
      </header>

      {/* Main Voice Room Stage */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative max-w-4xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin" style={{ color: "var(--brand-glow)" }} />
            <p className="text-[13px] font-medium" style={{ color: "var(--text-1)" }}>
              Connecting to voice presence...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full max-w-md">
            {/* Visualizer Sphere / Avatar Presence */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full flex items-center justify-center mb-6">
              {/* Outer Pulsing Soundwave Rings */}
              <div
                className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-500 ${
                  callStatus === "speaking"
                    ? "scale-115 opacity-80 animate-ping"
                    : callStatus === "listening"
                    ? "scale-110 opacity-70 animate-pulse"
                    : "scale-100 opacity-20"
                }`}
                style={{
                  border:
                    callStatus === "listening"
                      ? "1px solid rgba(255, 209, 102, 0.7)"
                      : "1px solid rgba(188, 150, 230, 0.4)",
                }}
              />
              <div
                className={`absolute -inset-4 rounded-full pointer-events-none transition-all duration-700 ${
                  callStatus === "speaking" ? "scale-125 opacity-40 animate-pulse" : "opacity-10"
                }`}
                style={{ border: "1px solid rgba(255, 209, 102, 0.35)" }}
              />

              {/* Central Visual Representation: Natural Portrait Photo or Luminous Neural Orb */}
              {photoUrl ? (
                <div
                  className="w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden relative"
                  style={{
                    background: "var(--surface-0)",
                    border: "2px solid rgba(255, 209, 102, 0.5)",
                    boxShadow: "0 16px 60px rgba(18, 5, 24, 0.8)",
                  }}
                >
                  <img
                    src={photoUrl}
                    alt={activeAvatar?.name || "Companion"}
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      callStatus === "speaking" ? "scale-105" : "scale-100"
                    }`}
                  />
                  {callStatus === "speaking" && (
                    <div className="absolute inset-0 bg-[#FFD166]/10 pointer-events-none" />
                  )}
                </div>
              ) : (
                <div
                  className="w-56 h-56 rounded-full flex flex-col items-center justify-center relative"
                  style={{
                    background: "radial-gradient(circle, #FFD166 0%, #BC96E6 40%, #210B2C 80%)",
                    border: "2px solid rgba(255, 209, 102, 0.6)",
                    boxShadow: "0 0 60px rgba(255, 209, 102, 0.45)",
                  }}
                >
                  <span className="text-5xl font-bold mb-1 opacity-90" style={{ color: "var(--text-0)" }}>
                    {activeAvatar?.name?.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="w-1.5 h-6 rounded-full bg-[#B89FF8] animate-bounce" />
                    <span className="w-1.5 h-10 rounded-full bg-white animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-7 rounded-full bg-[#B89FF8] animate-bounce [animation-delay:0.3s]" />
                    <span className="w-1.5 h-4 rounded-full bg-white animate-bounce [animation-delay:0.45s]" />
                  </div>
                </div>
              )}

              {/* Status Pill on Orb */}
              <div
                className="absolute -bottom-3 flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-medium shadow-lg"
                style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-1)",
                  color: "var(--text-0)",
                }}
              >
                <Radio
                  size={11}
                  className={
                    callStatus === "speaking"
                      ? "text-emerald-400 animate-pulse"
                      : callStatus === "listening"
                      ? "text-rose-400 animate-ping"
                      : "text-[#9D6FF4]"
                  }
                />
                <span>
                  {callStatus === "speaking"
                    ? `${activeAvatar?.name} Speaking`
                    : callStatus === "listening"
                    ? "Listening to you..."
                    : callStatus === "thinking"
                    ? "Reflecting..."
                    : "Voice Active"}
                </span>
              </div>
            </div>

            {/* Live Subtitle / Dialogue Display */}
            <div
              className="w-full p-4 rounded-2xl text-center min-h-[90px] flex flex-col items-center justify-center mb-4 transition-all"
              style={{
                background: "var(--surface-0)",
                border: "1px solid var(--border-0)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              {callStatus === "listening" && liveTranscript ? (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold flex items-center justify-center gap-1">
                    <Mic size={10} /> You said
                  </span>
                  <p className="text-[13px] text-rose-200 font-medium leading-relaxed italic">
                    &ldquo;{liveTranscript}&rdquo;
                  </p>
                </div>
              ) : callStatus === "thinking" ? (
                <div className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: "var(--brand-glow)" }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Reflecting on memories with {activeAvatar?.name}...</span>
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed font-medium italic" style={{ color: "var(--text-0)" }}>
                  &ldquo;{subtitle || `${activeAvatar?.name} is listening.`}&rdquo;
                </p>
              )}
            </div>

            {/* Typed Chat Fallback Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (textInput.trim()) {
                  handleSendUserVoice(textInput.trim());
                }
              }}
              className="w-full flex items-center gap-2"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type a thought to speak..."
                disabled={callStatus === "thinking"}
                className="flex-1 px-4 py-2.5 rounded-full text-[12px] transition-all"
                style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-1)",
                  color: "var(--text-0)",
                }}
              />
              <button
                type="submit"
                disabled={!textInput.trim() || callStatus === "thinking"}
                className="btn btn-primary btn-sm flex items-center justify-center p-2.5 rounded-full disabled:opacity-40 cursor-pointer"
                title="Send"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Bottom Floating Control Dock */}
      <footer className="p-4 sm:p-6 flex justify-center z-20">
        <div
          className="flex items-center gap-4 sm:gap-6 px-6 py-3 rounded-full shadow-2xl"
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

          {/* Big Center Microphone (Push to Speak / Stop & Send) */}
          <button
            type="button"
            onClick={callStatus === "listening" ? stopListeningAndSend : startListening}
            className={`p-4 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-xl ${
              callStatus === "listening"
                ? "bg-rose-600 border-2 border-rose-300 text-white animate-pulse scale-110 shadow-rose-600/50"
                : "text-white hover:scale-105"
            }`}
            style={{
              background:
                callStatus === "listening"
                  ? undefined
                  : "linear-gradient(135deg, #7C4FF0, #9D6FF4)",
              boxShadow: "0 0 24px rgba(124, 79, 240, 0.5)",
            }}
            title={callStatus === "listening" ? "Listening... Click to send" : "Click to Talk"}
          >
            {callStatus === "listening" ? <Square size={22} fill="white" /> : <Mic size={24} />}
          </button>

          {/* Interrupt Companion button (visible when companion is speaking) */}
          {callStatus === "speaking" && (
            <button
              type="button"
              onClick={handleInterrupt}
              className="p-3 rounded-full transition-all cursor-pointer hover:scale-105"
              style={{
                background: "rgba(124, 79, 240, 0.2)",
                border: "1px solid rgba(124, 79, 240, 0.4)",
                color: "var(--brand-glow)",
              }}
              title="Interrupt and speak"
            >
              <Radio size={18} className="animate-pulse" />
            </button>
          )}

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="p-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-lg hover:scale-105"
            title="End Voice Call"
          >
            <PhoneOff size={18} />
          </button>
        </div>
      </footer>

      {/* In-Call Create Companion Modal */}
      {showCreateAvatarModal && (
        <CreateAvatarModal
          onClose={() => setShowCreateAvatarModal(false)}
          onAvatarCreated={async (newAvatar) => {
            setShowCreateAvatarModal(false);
            const list = await api.getAvatars().catch(() => []);
            setAvatars(list || []);
            switchAvatar(newAvatar);
          }}
        />
      )}
    </div>
  );
}

export default function VoicePage() {
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
      <VoiceContent />
    </Suspense>
  );
}
