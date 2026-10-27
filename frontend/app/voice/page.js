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
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

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
    <div className="min-h-screen bg-[#0D0D0D] text-[#FAFAFA] flex flex-col relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Glow in Eternia Purple & Lavender */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full pointer-events-none -z-10 blur-3xl transition-all duration-700"
        style={{
          background:
            callStatus === "listening"
              ? "radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, rgba(67, 48, 117, 0.6) 45%, transparent 70%)"
              : callStatus === "speaking"
              ? "radial-gradient(circle, rgba(165, 140, 244, 0.45) 0%, rgba(67, 48, 117, 0.75) 45%, transparent 70%)"
              : "radial-gradient(circle, rgba(67, 48, 117, 0.85) 0%, rgba(165, 140, 244, 0.25) 45%, transparent 70%)",
        }}
      />

      {/* Top Header Bar */}
      <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-[#A58CF4]/15 bg-[#0D0D0D]/75 backdrop-blur-xl z-20">
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
                className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  callStatus === "listening"
                    ? "bg-rose-500 shadow-sm shadow-rose-500"
                    : callStatus === "speaking"
                    ? "bg-emerald-400 shadow-sm shadow-emerald-400"
                    : "bg-[#A58CF4]"
                }`}
              />
              <div>
                <h1 className="text-[14px] font-semibold tracking-wide text-[#FAFAFA] leading-tight flex items-center gap-1.5">
                  {activeAvatar.name}
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#433075]/40 text-[#A58CF4] border border-[#A58CF4]/20 font-normal">
                    {activeAvatar.relationship || "Companion"}
                  </span>
                </h1>
                <p className="text-[10px] text-[rgba(250,250,250,0.6)] flex items-center gap-1">
                  <Volume2 size={10} className="text-[#A58CF4]" />
                  <span>{voiceInfo ? `${voiceInfo.voice_name} Voice` : "Neural Voice"}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Center: Duration Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#433075]/25 border border-[#A58CF4]/20 text-[12px] text-[#FAFAFA]">
          <Clock size={13} className="text-[#A58CF4]" />
          <span className="font-mono tracking-wider">{formatDuration(callDuration)}</span>
        </div>

        {/* Right: Hands-free toggle & Switch to Video Call link */}
        <div className="flex items-center gap-2">
          {/* Hands-free mode toggle button */}
          <button
            type="button"
            onClick={() => setIsHandsFree(!isHandsFree)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
              isHandsFree
                ? "bg-[#433075] text-[#FAFAFA] border-[#A58CF4]/40 shadow-sm shadow-[#A58CF4]/20"
                : "bg-transparent text-[rgba(250,250,250,0.6)] border-white/10 hover:text-[#FAFAFA]"
            }`}
            title="Auto-listen after companion speaks"
          >
            <Sparkles size={11} className={isHandsFree ? "text-[#A58CF4]" : "text-gray-400"} />
            <span>Hands-free: {isHandsFree ? "ON" : "OFF"}</span>
          </button>

          {/* Link to Video Call */}
          <Link
            href={activeAvatar ? `/call?avatarId=${activeAvatar.id}` : "/call"}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#433075]/30 hover:bg-[#433075]/60 border border-[#A58CF4]/25 text-[11px] text-[#A58CF4] hover:text-[#FAFAFA] transition-all no-underline"
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
            <Loader2 size={36} className="text-[#A58CF4] animate-spin" />
            <p className="text-[13px] text-[rgba(250,250,250,0.7)] font-medium">
              Connecting to voice presence...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full max-w-md">
            {/* Visualizer Sphere / 3D Avatar Presence */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full flex items-center justify-center mb-6">
              {/* Outer Pulsing Soundwave Rings */}
              <div
                className={`absolute inset-0 rounded-full border border-[#A58CF4]/30 pointer-events-none transition-all duration-500 ${
                  callStatus === "speaking"
                    ? "scale-115 opacity-80 border-[#A58CF4] animate-ping"
                    : callStatus === "listening"
                    ? "scale-110 opacity-70 border-rose-400 animate-pulse"
                    : "scale-100 opacity-20"
                }`}
              />
              <div
                className={`absolute -inset-4 rounded-full border border-[#433075]/40 pointer-events-none transition-all duration-700 ${
                  callStatus === "speaking" ? "scale-125 opacity-40 animate-pulse" : "opacity-10"
                }`}
              />

              {/* Central Visual Representation: Natural Portrait Photo or Luminous Neural Orb */}
              {photoUrl ? (
                <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden border-2 border-[#A58CF4]/40 shadow-[0_16px_60px_rgba(67,48,117,0.6)] relative bg-[#0D0D0D]">
                  <img
                    src={photoUrl}
                    alt={activeAvatar?.name || "Companion"}
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      callStatus === "speaking" ? "scale-105" : "scale-100"
                    }`}
                  />
                  {callStatus === "speaking" && (
                    <div className="absolute inset-0 bg-[#A58CF4]/10 pointer-events-none" />
                  )}
                </div>
              ) : (
                <div className="w-56 h-56 rounded-full bg-gradient-to-tr from-[#433075] via-[#A58CF4]/40 to-[#0D0D0D] border-2 border-[#A58CF4]/50 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(165,140,244,0.4)] relative">
                  <span className="text-5xl font-bold text-[#FAFAFA] opacity-90 mb-1">
                    {activeAvatar?.name?.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="w-1.5 h-6 rounded-full bg-[#A58CF4] animate-bounce" />
                    <span className="w-1.5 h-10 rounded-full bg-[#FAFAFA] animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-7 rounded-full bg-[#A58CF4] animate-bounce [animation-delay:0.3s]" />
                    <span className="w-1.5 h-4 rounded-full bg-[#FAFAFA] animate-bounce [animation-delay:0.45s]" />
                  </div>
                </div>
              )}

              {/* Status Pill on Orb */}
              <div className="absolute -bottom-3 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#0D0D0D]/90 backdrop-blur-md border border-[#A58CF4]/30 shadow-lg text-[11px] font-medium text-[#FAFAFA]">
                <Radio
                  size={11}
                  className={
                    callStatus === "speaking"
                      ? "text-emerald-400 animate-pulse"
                      : callStatus === "listening"
                      ? "text-rose-400 animate-ping"
                      : "text-[#A58CF4]"
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
            <div className="w-full p-4 rounded-2xl bg-[#0D0D0D]/85 backdrop-blur-xl border border-[#A58CF4]/20 shadow-xl text-center min-h-[90px] flex flex-col items-center justify-center mb-4 transition-all">
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
                <div className="flex items-center gap-2 text-[12.5px] text-[#A58CF4] font-medium">
                  <Loader2 size={16} className="animate-spin text-[#A58CF4]" />
                  <span>Reflecting on memories with {activeAvatar?.name}...</span>
                </div>
              ) : (
                <p className="text-[13px] leading-relaxed text-[#FAFAFA] font-medium italic">
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
                className="flex-1 px-4 py-2.5 rounded-full bg-[#1A1A2E]/80 border border-[#A58CF4]/25 text-[12px] text-[#FAFAFA] placeholder:text-[rgba(250,250,250,0.4)] focus:outline-none focus:border-[#A58CF4] transition-all"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || callStatus === "thinking"}
                className="p-2.5 rounded-full bg-[#433075] hover:bg-[#A58CF4]/80 disabled:opacity-40 text-[#FAFAFA] transition-all cursor-pointer shadow-md"
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
        <div className="flex items-center gap-4 sm:gap-6 px-6 py-3 rounded-full bg-[#0D0D0D]/90 backdrop-blur-2xl border border-[#A58CF4]/30 shadow-[0_16px_50px_rgba(13,13,13,0.85)]">
          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-3 rounded-full transition-all cursor-pointer border ${
              isMuted
                ? "bg-red-950/60 border-red-500/40 text-red-400"
                : "bg-[#433075]/40 hover:bg-[#433075]/70 border-[#A58CF4]/25 text-[#FAFAFA]"
            }`}
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
                : "bg-gradient-to-r from-[#433075] to-[#A58CF4] text-white hover:scale-105 shadow-[#A58CF4]/30 border border-white/20"
            }`}
            title={callStatus === "listening" ? "Listening... Click to send" : "Click to Talk"}
          >
            {callStatus === "listening" ? <Square size={22} fill="white" /> : <Mic size={24} />}
          </button>

          {/* Interrupt Companion button (visible when companion is speaking) */}
          {callStatus === "speaking" && (
            <button
              type="button"
              onClick={handleInterrupt}
              className="p-3 rounded-full bg-[#433075]/50 hover:bg-[#433075] border border-[#A58CF4]/30 text-[#FAFAFA] transition-all cursor-pointer hover:scale-105"
              title="Interrupt and speak"
            >
              <Radio size={18} className="text-[#A58CF4] animate-pulse" />
            </button>
          )}

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="p-3 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white transition-all cursor-pointer border border-rose-400/30 shadow-lg hover:scale-105"
            title="End Voice Call"
          >
            <PhoneOff size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function VoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-[#FAFAFA]">
          <Loader2 size={36} className="text-[#A58CF4] animate-spin" />
        </div>
      }
    >
      <VoiceContent />
    </Suspense>
  );
}
