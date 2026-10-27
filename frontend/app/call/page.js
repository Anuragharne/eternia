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
  User,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
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

  // Anam.ai Live Interactive Avatar State
  const [isAnamConnected, setIsAnamConnected] = useState(false);
  const [isAnamConnecting, setIsAnamConnecting] = useState(false);

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
  const companionAudioRef = useRef(null);
  const anamClientRef = useRef(null);
  const isConnectingRef = useRef(false);
  const recognitionRef = useRef(null);
  const lastTranscriptRef = useRef("");
  const hasGreetedRef = useRef(false);
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

  // 3. Initialize Anam.ai 25fps Real-Time WebRTC Live Avatar
  const initAnamSession = async () => {
    if (typeof window === "undefined" || !activeAvatar) return;

    if (isAnamConnected && anamClientRef.current) {
      return;
    }

    if (isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    setIsAnamConnecting(true);
    setCallStatus("Connecting to Anam 16:9 Live Avatar...");

    // Stop previous client cleanly if one was active
    if (anamClientRef.current) {
      const prevClient = anamClientRef.current;
      anamClientRef.current = null;
      try {
        await prevClient.stopStreaming();
      } catch {}
    }

    try {
      // 1. Ensure video element exists in DOM before starting stream
      let videoEl = document.getElementById("anam-persona-video");
      if (!videoEl) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        videoEl = document.getElementById("anam-persona-video");
      }

      if (!videoEl) {
        throw new Error("anam-persona-video DOM element not found");
      }

      const { createClient, AnamEvent } = await import("@anam-ai/js-sdk");
      const tokenRes = await api.getAnamSessionToken(activeAvatar.id);

      if (!tokenRes?.sessionToken) {
        throw new Error("No session token received from Anam.ai");
      }

      // Initialize client with modern session token and disableInputAudio for clean WebRTC
      const client = createClient(tokenRes.sessionToken, {
        disableInputAudio: true,
      });
      anamClientRef.current = client;

      const markStreamActive = () => {
        console.log("[Anam] Live 25fps digital human video active!");
        setIsAnamConnected(true);
        setIsAnamConnecting(false);
        isConnectingRef.current = false;
        setCallStatus("Live 16:9 Digital Human Active");

        const el = document.getElementById("anam-persona-video");
        if (el && el.paused) {
          el.play().catch((playErr) => {
            console.warn("[Anam] Autoplay notice (click anywhere on call to play):", playErr);
          });
        }
      };

      client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
        console.log("[Anam] WebRTC connection established!");
      });

      client.addListener(AnamEvent.VIDEO_STREAM_STARTED, (stream) => {
        console.log("[Anam] 25fps video stream track received:", stream);
        markStreamActive();
      });

      client.addListener(AnamEvent.VIDEO_PLAY_STARTED, () => {
        console.log("[Anam] 25fps digital human video playing!");
        markStreamActive();
      });

      client.addListener(AnamEvent.CONNECTION_CLOSED, (code, details) => {
        console.log("[Anam] Connection closed:", code, details);
        setIsAnamConnected(false);
        setIsAnamConnecting(false);
        isConnectingRef.current = false;
        setCallStatus("Interactive Mode");
      });

      // Stream directly to the 16:9 widescreen video element
      await client.streamToVideoElement("anam-persona-video");

    } catch (err) {
      console.warn("Anam.ai WebRTC initialization notice:", err);
      setIsAnamConnected(false);
      setCallStatus("Interactive Mode");
    } finally {
      setIsAnamConnecting(false);
      isConnectingRef.current = false;
    }
  };

  // Start Anam when avatar is loaded (debounced to avoid React StrictMode duplicate start)
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      if (!isCancelled && activeAvatar?.id) {
        initAnamSession();
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [activeAvatar?.id]);

  // Teardown when component completely unmounts or before page refresh/leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (anamClientRef.current) {
        anamClientRef.current.stopStreaming().catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (anamClientRef.current) {
        const client = anamClientRef.current;
        anamClientRef.current = null;
        client.stopStreaming().catch(() => {});
      }
    };
  }, []);

  // 4. Play companion speech audio (Pipes directly to Anam.ai WebRTC for 25fps lip-sync)
  const playCompanionSpeech = async (replyText) => {
    if (!replyText || !activeAvatar) return;
    setIsSpeaking(true);
    setSubtitle(replyText);

    try {
      if (anamClientRef.current && isAnamConnected) {
        const videoEl = document.getElementById("anam-persona-video");
        if (videoEl) {
          videoEl.muted = isMuted;
          if (videoEl.paused) {
            videoEl.play().catch(() => {});
          }
        }
        // Anam.ai renders photorealistic 25fps facial animation & lip-sync over WebRTC
        await anamClientRef.current.talk(replyText);
        const durationMs = Math.max(2500, Math.min(10000, replyText.length * 75));
        setTimeout(() => setIsSpeaking(false), durationMs);
      } else {
        // Fallback: If WebRTC stream is offline/connecting, play MP3 via HTML5 audio
        const audioBlob = await api.getSpeechAudioBlob(activeAvatar.id, replyText);
        const audioUrl = URL.createObjectURL(audioBlob);
        if (companionAudioRef.current) {
          companionAudioRef.current.src = audioUrl;
          companionAudioRef.current.muted = isMuted;
          await new Promise((resolve) => {
            companionAudioRef.current.onended = () => {
              URL.revokeObjectURL(audioUrl);
              resolve();
            };
            companionAudioRef.current.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              resolve();
            };
            companionAudioRef.current.play().catch(() => resolve());
          });
        }
        setIsSpeaking(false);
      }
    } catch (voiceErr) {
      console.warn("[Call] Speech playback notice:", voiceErr);
      setIsSpeaking(false);
    }
  };

  // 5. Speech Recognition Setup (Web Speech API) - Fixed stale closure
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
        lastTranscriptRef.current = "";
        setTranscript("");
      };

      recognition.onresult = (e) => {
        let currentText = "";
        for (let i = 0; i < e.results.length; i++) {
          currentText += e.results[i][0].transcript;
        }
        lastTranscriptRef.current = currentText;
        setTranscript(currentText);
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition notice:", e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const textToSend = lastTranscriptRef.current.trim();
        if (textToSend) {
          lastTranscriptRef.current = "";
          handleSendMessage(textToSend);
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
    const textToSend = lastTranscriptRef.current.trim();
    if (textToSend) {
      lastTranscriptRef.current = "";
      handleSendMessage(textToSend);
    }
  };

  // 6. Send message and handle companion response with Anam live avatar
  const handleSendMessage = async (userMessage) => {
    if (!userMessage || !activeAvatar) return;
    setTranscript("");
    setTextInput("");
    setSubtitle("Thinking...");
    setIsSpeaking(true);

    try {
      // Send chat message to backend (Gemini/LLM companion reply)
      const res = await api.sendMessage(activeAvatar.id, userMessage);
      const reply = res?.companion_reply || res?.message || "";
      if (!reply) throw new Error("No response from companion");

      await playCompanionSpeech(reply);
    } catch (err) {
      console.error("Send message error:", err);
      setSubtitle("Could not reach companion. Please try again.");
      setIsSpeaking(false);
    }
  };

  // 7. Automatic Interactive Greeting when Digital Human connects
  useEffect(() => {
    if (activeAvatar && !hasGreetedRef.current && isAnamConnected) {
      hasGreetedRef.current = true;
      const greetingTimer = setTimeout(() => {
        const greeting = `Hey! It's so good to see you. How are you doing today?`;
        playCompanionSpeech(greeting);
      }, 700);
      return () => clearTimeout(greetingTimer);
    }
  }, [activeAvatar?.id, isAnamConnected]);

  // Fallback greeting if WebRTC connection takes longer than 5 seconds
  useEffect(() => {
    if (activeAvatar && !hasGreetedRef.current && !isLoading && !isAnamConnecting && !isAnamConnected) {
      const fallbackGreetingTimer = setTimeout(() => {
        if (!hasGreetedRef.current) {
          hasGreetedRef.current = true;
          const greeting = `Hey! It's so good to see you. How are you doing today?`;
          playCompanionSpeech(greeting);
        }
      }, 5000);
      return () => clearTimeout(fallbackGreetingTimer);
    }
  }, [activeAvatar?.id, isLoading, isAnamConnecting, isAnamConnected]);

  // 8. Toggle Mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    const videoEl = document.getElementById("anam-persona-video");
    if (videoEl) {
      videoEl.muted = !isMuted;
    }
    if (companionAudioRef.current) {
      companionAudioRef.current.muted = !isMuted;
    }
  };

  // 9. End Call
  const handleEndCall = async () => {
    if (companionAudioRef.current) {
      companionAudioRef.current.pause();
    }
    if (anamClientRef.current) {
      const client = anamClientRef.current;
      anamClientRef.current = null;
      await client.stopStreaming().catch(() => {});
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    router.push(activeAvatar ? `/chat?avatarId=${activeAvatar.id}` : "/chat");
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col relative select-none" style={{ background: "var(--void)", color: "var(--text-0)" }}>
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-tr from-[#531F6D]/30 via-[#BC96E6]/15 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Hidden Fallback Audio Element */}
      <audio ref={companionAudioRef} crossOrigin="anonymous" />

      {/* 1. Top Header Bar (56px) */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#BC96E6]/15 bg-[#210B2C]/80 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={activeAvatar ? `/chat?avatarId=${activeAvatar.id}` : "/chat"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3B184C]/50 hover:bg-[#3B184C]/80 border border-[#BC96E6]/25 text-[#FAF6FF] text-[12px] font-medium transition-all no-underline"
          >
            <ArrowLeft size={14} className="text-[#BC96E6]" />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>

          {activeAvatar && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAvatarDropdown(!showAvatarDropdown)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#433075]/25 border border-transparent hover:border-[#A58CF4]/20 transition-all text-left cursor-pointer"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isAnamConnected ? "bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                <div>
                  <h1 className="text-[13px] font-semibold tracking-wide text-[#FAFAFA] leading-tight flex items-center gap-1.5">
                    {activeAvatar.name}
                    <ChevronDown size={13} className="text-[#A58CF4]" />
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#433075]/40 text-[#A58CF4] border border-[#A58CF4]/20 font-normal hidden sm:inline">
                      {activeAvatar.relationship || "Companion"}
                    </span>
                  </h1>
                  <p className="text-[10px] text-[rgba(250,250,250,0.6)]">
                    {callStatus}
                  </p>
                </div>
              </button>

              {/* Avatar Switcher Dropdown */}
              {showAvatarDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-[#14121F] border border-[#A58CF4]/30 shadow-2xl p-2 z-50">
                  <div className="text-[10px] uppercase tracking-wider text-[rgba(250,250,250,0.5)] px-3 py-1 font-semibold">
                    Switch Companion
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 my-1">
                    {avatars.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => switchAvatar(av)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[12px] transition-all cursor-pointer ${
                          av.id === activeAvatar.id
                            ? "bg-[#433075]/60 text-white font-medium border border-[#A58CF4]/40"
                            : "hover:bg-[#433075]/30 text-[rgba(250,250,250,0.8)] hover:text-white"
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-[#433075]/40 border border-[#A58CF4]/30 flex items-center justify-center text-[10px] font-semibold text-[#A58CF4] overflow-hidden shrink-0">
                          {av.photo_url ? (
                            <img src={av.photo_url} alt={av.name} className="w-full h-full object-cover" />
                          ) : (
                            av.name.charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{av.name}</div>
                          <div className="text-[10px] text-[#A58CF4]/70 truncate">
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
                  <div className="pt-2 border-t border-[#A58CF4]/15">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAvatarDropdown(false);
                        setShowCreateAvatarModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#433075] to-[#A58CF4] text-white text-[11.5px] font-medium hover:brightness-110 transition-all cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Create New Companion</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Call Duration Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#433075]/25 border border-[#A58CF4]/20 text-[11.5px] text-[#FAFAFA]">
          <Clock size={12} className="text-[#A58CF4]" />
          <span className="font-mono tracking-wider">{formatDuration(callDuration)}</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 relative">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#433075]/20 border border-[#A58CF4]/20 text-[11px] text-[#A58CF4]">
            <Sparkles size={11} className="text-[#A58CF4]" />
            <span>Anam Cara-4 25fps</span>
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
      <main
        onClick={() => {
          const videoEl = document.getElementById("anam-persona-video");
          if (videoEl && videoEl.paused) {
            videoEl.play().catch(() => {});
          }
        }}
        className="flex-1 min-h-0 flex flex-col items-center justify-between p-2 sm:px-6 sm:py-3 overflow-hidden w-full max-w-6xl mx-auto relative"
      >
        {/* Loading Overlay (keeps DOM intact beneath it) */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#0D0D0D]/90 backdrop-blur-md z-40 flex flex-col items-center justify-center gap-3">
            <Loader2 size={36} className="text-[#A58CF4] animate-spin" />
            <p className="text-[13px] text-[rgba(250,250,250,0.7)] font-medium">
              Connecting to live video call...
            </p>
          </div>
        )}

        {/* 16:9 Cinematic Widescreen Avatar Frame */}
        <div className="w-full max-w-[calc((100vh-215px)*16/9)] aspect-[16/9] max-h-[calc(100vh-215px)] min-h-[240px] relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-[#A58CF4]/30 shadow-[0_16px_70px_rgba(67,48,117,0.35)] flex items-center justify-center shrink mx-auto">
          {/* Anam.ai Real-Time 25fps Live WebRTC Video Element - ALWAYS MOUNTED IN DOM */}
          <video
            id="anam-persona-video"
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-700 ${
              isAnamConnected ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          />

          {/* Seamless Companion Photo Display (During Initial Connect) */}
          <div
            className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${
              isAnamConnected ? "opacity-0 pointer-events-none" : "opacity-100 z-10"
            }`}
          >
            {photoUrl ? (
              <div className="relative w-full h-full overflow-hidden bg-black">
                {/* Blurred background backdrop filling entire 16:9 widescreen */}
                <img
                  src={photoUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none"
                />
                {/* Portrait image scaled with object-cover and centered at 65% to focus on face and shoulders */}
                <img
                  src={photoUrl}
                  alt={activeAvatar?.name || "Companion"}
                  className={`relative w-full h-full object-cover object-[center_65%] transition-transform duration-1000 ${
                    isSpeaking ? "scale-[1.03]" : "scale-100"
                  }`}
                />
                {/* Subtle cinematic gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                <div className="w-20 h-20 rounded-full bg-[#433075]/30 border border-[#A58CF4]/40 flex items-center justify-center text-[#A58CF4]">
                  <User size={36} />
                </div>
                <p className="text-[14px] font-medium text-[#FAFAFA]">
                  {activeAvatar?.name || "Companion"}
                </p>
                <p className="text-[11px] text-[rgba(250,250,250,0.5)]">
                  Connecting live interactive digital human...
                </p>
              </div>
            )}
          </div>

          {/* Status Badge Over Video (Top Left) */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#A58CF4]/25 text-[10.5px] text-[#FAFAFA]">
            <Radio
              size={10}
              className={isAnamConnected ? "text-emerald-400 animate-pulse" : "text-amber-400"}
            />
            <span>
              {isAnamConnected
                ? "25fps Live Digital Human"
                : isAnamConnecting
                ? "Connecting Live Avatar..."
                : "Interactive 16:9 Ready"}
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

            {/* Refresh Stream Button */}
            <button
              type="button"
              onClick={() => initAnamSession()}
              className="p-3 rounded-full bg-[#433075]/30 hover:bg-[#433075]/60 border border-[#A58CF4]/25 text-[#FAFAFA] transition-all cursor-pointer"
              title="Reconnect Live Avatar Stream"
            >
              <RotateCcw size={17} />
            </button>

            {/* Hang Up Button */}
            <button
              type="button"
              onClick={handleEndCall}
              className="p-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/40 transition-all cursor-pointer hover:scale-105"
              title="End Video Call"
            >
              <PhoneOff size={17} />
            </button>
          </div>
        </div>
      </main>

      {/* Portrait Photo Upload Modal */}
      {showPhotoModal && activeAvatar && (
        <AvatarPhotoUpload
          avatar={activeAvatar}
          currentPhotoUrl={photoUrl}
          onClose={() => setShowPhotoModal(false)}
          onPhotoUpdated={(newUrl) => {
            setPhotoUrl(newUrl);
            setShowPhotoModal(false);
          }}
        />
      )}
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center" style={{ background: "var(--void)", color: "var(--text-0)" }}>
          <Loader2 size={36} className="animate-spin text-[#FFD166]" />
        </div>
      }
    >
      <CallContent />
    </Suspense>
  );
}
