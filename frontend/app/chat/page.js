"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Send,
  Plus,
  BookOpen,
  Upload,
  CheckCircle2,
  User,
  X,
  ArrowLeft,
  Settings as SettingsIcon,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertCircle,
  Loader2,
  Square,
  Trash2,
  Video,
  ChevronDown,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { Navbar } from "../../components/layout/Navbar";

function ChatContent() {
  const searchParams = useSearchParams();
  const requestedAvatarId = searchParams?.get("avatarId");
  const { user } = useAuth();

  const [avatars, setAvatars] = useState([]);
  const [activeAvatar, setActiveAvatar] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);

  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [isVoiceLoading, setIsVoiceLoading] = useState(null);
  const [voiceInfo, setVoiceInfo] = useState(null);
  const activeAudioRef = useRef(null);

  const messagesContainerRef = useRef(null);
  const recordingTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);

  // Modal for adding a memory
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memorySuccessMsg, setMemorySuccessMsg] = useState("");
  const [memoryErrorMsg, setMemoryErrorMsg] = useState("");

  // Modal for deleting an avatar / companion
  const [showDeleteAvatarModal, setShowDeleteAvatarModal] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState(null);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  // Modal for viewing & managing particular stories / memories
  const [showStoriesModal, setShowStoriesModal] = useState(false);
  const [avatarMemories, setAvatarMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [deletingMemoryId, setDeletingMemoryId] = useState(null);
  const [storiesToastMsg, setStoriesToastMsg] = useState("");

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Smooth scroll ONLY the messages container (never scrolls the outer window or moves message bar)
  const scrollToBottom = (behavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isTyping]);


  // Load avatars on mount
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const list = await api.getAvatars();
        setAvatars(list || []);
        if (list && list.length > 0) {
          const matched = requestedAvatarId
            ? list.find((a) => a.id === requestedAvatarId) || list[0]
            : list[0];
          setActiveAvatar(matched);
        }
      } catch (err) {
        console.error("Failed to fetch avatars:", err);
      } finally {
        setLoadingAvatars(false);
      }
    };

    fetchAvatars();
  }, [requestedAvatarId]);

  // Load chat history when active avatar changes
  useEffect(() => {
    if (!activeAvatar) return;

    const loadHistory = async () => {
      try {
        const history = await api.getChatHistory(activeAvatar.id);
        if (history && history.length > 0) {
          setMessages(
            history.map((m, idx) => ({
              id: idx,
              role: m.role,
              content: m.content,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
              grounded: m.is_grounded !== false,
            }))
          );
        } else {
          // Default welcoming greeting from companion
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: `Hello! It is so comforting to speak with you today. What cherished memory or moment would you like to reflect on together?`,
              timestamp: new Date(),
              grounded: true,
            },
          ]);
        }
      } catch (err) {
        console.error("Error loading history:", err);
      }
    };

    loadHistory();
  }, [activeAvatar]);

  // Load voice info and cancel previous audio when active avatar changes
  useEffect(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingMessageId(null);
    setIsVoiceLoading(null);

    if (!activeAvatar?.id) {
      setVoiceInfo(null);
      return;
    }

    api.getVoiceInfo(activeAvatar.id)
      .then((info) => setVoiceInfo(info))
      .catch((err) => console.log("Voice info note:", err.message));
  }, [activeAvatar?.id]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSend = async (customText = null) => {
    const textToProcess = (typeof customText === "string" ? customText : input).trim();
    if (!textToProcess || !activeAvatar) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: textToProcess,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (typeof customText !== "string") {
      setInput("");
    }
    setIsTyping(true);

    try {
      const response = await api.sendMessage(activeAvatar.id, textToProcess);
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
        grounded: response.is_grounded,
        memoriesUsed: response.memories_used,
        citedIds: response.memory_ids_cited,
        videoUrl: response.video_url || null,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "I am having a moment of quiet reflection. Could you please share that thought once more?",
        timestamp: new Date(),
        grounded: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Speech-to-Text Microphone Recording in Chat Bar (Click to Talk -> Click to Stop & Send)
  const toggleRecording = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Microphone speech recognition is supported in Chrome, Edge, and Safari.");
      return;
    }

    if (isRecording) {
      // User clicked while recording -> STOP talking and SEND converted text to model!
      isRecordingRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch (e) { }
      setIsRecording(false);

      const textToSend = (recordingTranscriptRef.current || input).trim();
      if (textToSend) {
        setInput("");
        recordingTranscriptRef.current = "";
        handleSend(textToSend);
      }
      return;
    }

    // Starting recording on click
    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recordingTranscriptRef.current = "";
      isRecordingRef.current = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const transcript = (final || interim).trim();
        if (transcript) {
          setInput(transcript);
          recordingTranscriptRef.current = transcript;
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e);
        if (e.error === "not-allowed") {
          isRecordingRef.current = false;
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // If user hasn't clicked stop yet, keep listening through pauses without auto-sending!
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch (e) { }
        } else {
          setIsRecording(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition initialization error:", err);
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  // Fallback to browser Web Speech API
  const fallbackToBrowserTTS = (msgId, text) => {
    setIsVoiceLoading(null);
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setPlayingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onend = () => {
      setPlayingMessageId(null);
    };

    utterance.onerror = () => {
      setPlayingMessageId(null);
    };

    setPlayingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Text-to-Speech Audio Playback (ElevenLabs high-fidelity relationship voice)
  const handleSpeakMessage = async (msgId, text) => {
    // If clicking on currently playing message, toggle stop
    if (playingMessageId === msgId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingMessageId(null);
      setIsVoiceLoading(null);
      return;
    }

    // Stop any existing playback
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setPlayingMessageId(msgId);
    setIsVoiceLoading(msgId);

    // Primary: ElevenLabs Audio
    if (activeAvatar?.id) {
      try {
        const audioBlob = await api.getSpeechAudioBlob(activeAvatar.id, text);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        audio.onended = () => {
          setPlayingMessageId(null);
          setIsVoiceLoading(null);
          URL.revokeObjectURL(audioUrl);
          activeAudioRef.current = null;
        };

        audio.onerror = (e) => {
          console.warn("ElevenLabs audio play error, falling back to browser speech synthesis:", e);
          fallbackToBrowserTTS(msgId, text);
        };

        await audio.play();
        setIsVoiceLoading(null);
        return;
      } catch (err) {
        console.warn("ElevenLabs TTS request failed, falling back to browser speech synthesis:", err);
      }
    }

    // Fallback: Browser Web Speech API
    fallbackToBrowserTTS(msgId, text);
  };

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!activeAvatar) return;
    setIsSavingMemory(true);
    setMemorySuccessMsg("");
    setMemoryErrorMsg("");

    try {
      if (newMemoryText.trim()) {
        await api.addMemory(activeAvatar.id, newMemoryText.trim(), "manual");
      }

      if (uploadFile) {
        await api.importMemoriesFile(activeAvatar.id, uploadFile);
      }

      setMemorySuccessMsg("✨ This memory has been safely preserved in the companion archive.");
      setNewMemoryText("");
      setUploadFile(null);

      // Refresh avatar stats
      const updated = await api.getAvatar(activeAvatar.id);
      setActiveAvatar(updated);
      setAvatars((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

      setTimeout(() => {
        setShowMemoryModal(false);
        setMemorySuccessMsg("");
        setMemoryErrorMsg("");
      }, 1400);
    } catch (err) {
      console.error("Error adding memory:", err);
      setMemoryErrorMsg(err.message || "Failed to preserve memory. Please try again.");
    } finally {
      setIsSavingMemory(false);
    }
  };

  // Open Stories & Particular Memories Manager Modal
  const openStoriesModal = async (avatar = activeAvatar) => {
    if (!avatar) return;
    setShowStoriesModal(true);
    setLoadingMemories(true);
    setStoriesToastMsg("");
    try {
      const list = await api.getMemories(avatar.id);
      setAvatarMemories(list || []);
    } catch (err) {
      console.error("Failed to load companion memories:", err);
      setAvatarMemories([]);
    } finally {
      setLoadingMemories(false);
    }
  };

  // Delete an individual memory / story
  const handleDeleteMemory = async (memoryId) => {
    setDeletingMemoryId(memoryId);
    setStoriesToastMsg("");
    try {
      await api.deleteMemory(memoryId);
      setAvatarMemories((prev) => prev.filter((m) => m.id !== memoryId));
      if (activeAvatar) {
        const updatedCount = Math.max(0, (activeAvatar.memory_count || 1) - 1);
        setActiveAvatar((prev) => ({ ...prev, memory_count: updatedCount }));
        setAvatars((prev) =>
          prev.map((a) => (a.id === activeAvatar.id ? { ...a, memory_count: updatedCount } : a))
        );
      }
      setStoriesToastMsg("Memory removed from archive.");
      setTimeout(() => setStoriesToastMsg(""), 2500);
    } catch (err) {
      console.error("Failed to delete memory:", err);
      alert(err.message || "Failed to remove memory.");
    } finally {
      setDeletingMemoryId(null);
    }
  };

  // Delete an entire companion archive (Kabir, Anurag, etc.)
  const handleConfirmDeleteAvatar = async () => {
    if (!avatarToDelete) return;
    setIsDeletingAvatar(true);
    try {
      await api.deleteAvatar(avatarToDelete.id);
      const remaining = avatars.filter((a) => a.id !== avatarToDelete.id);
      setAvatars(remaining);

      // If active avatar was deleted, switch to first available or null
      if (activeAvatar?.id === avatarToDelete.id) {
        if (remaining.length > 0) {
          setActiveAvatar(remaining[0]);
        } else {
          setActiveAvatar(null);
          setMessages([]);
        }
      }

      setShowDeleteAvatarModal(false);
      setAvatarToDelete(null);
    } catch (err) {
      console.error("Failed to delete companion:", err);
      alert(err.message || "Failed to delete companion archive.");
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };


  return (
    <div
      className="h-screen h-[100dvh] w-full overflow-hidden flex flex-col md:flex-row p-2 sm:p-3 md:p-3.5 gap-2.5 sm:gap-3 relative"
      style={{ background: "var(--void)" }}
    >
      {/* Aurora ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            "radial-gradient(120% 80% at 50% 0%, rgba(255, 209, 102, 0.12) 0%, rgba(33, 11, 44, 0.94) 55%, var(--void) 100%)",
        }}
      />

      {/* Left-docked Vertical Glass Navbar for Chat mode */}
      <Navbar mode="vertical" />

      {/* Main Chat Viewport */}
      <main className="flex-1 min-w-0 h-full flex flex-col z-10 overflow-hidden">
        <div
          className="w-full flex-1 min-h-0 rounded-[24px] sm:rounded-[28px] flex flex-col md:flex-row overflow-hidden"
          style={{
            background: "var(--surface-0)",
            border: "1px solid var(--border-0)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
          }}
        >

          {/* Sidebar: Companions List */}
          <aside
            className="w-full md:w-[280px] flex flex-col p-4 shrink-0 h-full overflow-hidden"
            style={{
              background: "var(--surface-0)",
              borderRight: "1px solid var(--border-0)",
            }}
          >
            <div
              className="flex items-center justify-between pb-3 mb-2 shrink-0"
              style={{ borderBottom: "1px solid var(--border-0)" }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-0)" }}>
                Active Companions
              </span>
              <Link
                href="/onboarding"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--lavender)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  textDecoration: "none",
                  transition: "color 150ms",
                }}
                className="hover:text-[#EEF0F6]"
              >
                <Plus size={13} /> New
              </Link>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 py-1 no-scrollbar">
              {loadingAvatars ? (
                <div style={{ padding: "12px 8px" }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12, marginBottom: 6 }} />
                  ))}
                </div>
              ) : avatars.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 16px" }}>
                  <p style={{ fontSize: 12.5, color: "var(--text-1)", marginBottom: 12 }}>
                    When you\'re ready, create your first companion.
                  </p>
                  <Link href="/onboarding" className="btn btn-primary btn-sm" style={{ textDecoration: "none", display: "inline-flex" }}>
                    Create First
                  </Link>
                </div>
              ) : (
                avatars.map((av) => (
                  <div
                    key={av.id}
                    onClick={() => setActiveAvatar(av)}
                    className="group relative"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      transition: "all 150ms",
                      background: activeAvatar?.id === av.id
                        ? "rgba(255, 209, 102, 0.14)"
                        : "transparent",
                      border: activeAvatar?.id === av.id
                        ? "1px solid rgba(255, 209, 102, 0.45)"
                        : "1px solid transparent",
                      boxShadow: activeAvatar?.id === av.id
                        ? "inset 3px 0 0 #FFD166, 0 0 16px rgba(255, 209, 102, 0.15)"
                        : "none",
                    }}
                    className={`group relative cursor-pointer ${activeAvatar?.id !== av.id ? "hover:bg-white/[0.04]" : ""
                      }`}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #210B2C, #3B184C, #BC96E6)",
                        border: "1px solid rgba(255, 209, 102, 0.45)",
                        color: "#FFD166",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                        boxShadow: "0 0 12px rgba(255, 209, 102, 0.25)",
                      }}
                    >
                      {av.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 500, color: "var(--text-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {av.name}
                      </h4>
                      <p style={{ fontSize: 11, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {av.relationship} · {av.memory_count || 0} memories
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAvatarToDelete(av); setShowDeleteAvatarModal(true); }}
                      style={{
                        opacity: 0,
                        padding: 6,
                        borderRadius: 8,
                        color: "var(--text-2)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 150ms",
                      }}
                      className="group-hover:opacity-100 hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Sidebar bottom */}
            <div
              className="pt-3 flex items-center justify-between shrink-0"
              style={{ borderTop: "1px solid var(--border-0)", fontSize: 11, color: "var(--text-2)" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="glow-dot" />
                Grounded · Uncapped
              </span>
              <Link href="/settings" style={{ color: "var(--text-2)", textDecoration: "none", transition: "color 150ms" }} className="hover:text-[#EEF0F6]">
                <SettingsIcon size={14} />
              </Link>
            </div>
          </aside>

          {/* Main Chat Thread */}
          <section
            className="flex-1 min-h-0 flex flex-col h-full overflow-hidden"
            style={{ background: "var(--void)" }}
          >
            {/* Chat Header */}
            {activeAvatar ? (
              <div
                className="px-4 sm:px-5 py-3 flex items-center justify-between shrink-0"
                style={{
                  background: "var(--surface-0)",
                  borderBottom: "1px solid var(--border-0)",
                }}
              >
                <div style={{ position: "relative" }}>
                  <div
                    onClick={() => setShowAvatarDropdown(!showAvatarDropdown)}
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "4px 8px", borderRadius: 12, transition: "background 150ms" }}
                    className="hover:bg-[#3B184C]/40"
                    title="Click to Switch Companion"
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #210B2C, #3B184C, #BC96E6)",
                        border: "1px solid rgba(255, 209, 102, 0.5)",
                        color: "#FFD166",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        boxShadow: "0 0 12px rgba(255, 209, 102, 0.35)",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      {activeAvatar.photo_url ? (
                        <img src={activeAvatar.photo_url} alt={activeAvatar.name} className="w-full h-full object-cover" />
                      ) : (
                        activeAvatar.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-0)", fontFamily: "Outfit, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
                        <span>{activeAvatar.name}</span>
                        <ChevronDown size={14} style={{ color: "var(--sunglow)" }} />
                      </h3>
                      <p style={{ fontSize: 11, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="glow-dot" style={{ width: 6, height: 6 }} />
                        <span>{activeAvatar.relationship} · {activeAvatar.memory_count || 0} stories</span>
                        {(voiceInfo || activeAvatar.voice_status === "cloned" || activeAvatar.persona_config?.elevenlabs_voice_id) && (
                          <>
                            <span style={{ color: "var(--text-2)" }}>·</span>
                            <span style={{ color: "var(--sunglow)", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                              <Volume2 size={11} />
                              {activeAvatar.voice_status === "cloned" || activeAvatar.persona_config?.elevenlabs_voice_id
                                ? "Cloned Voice"
                                : `${voiceInfo?.voice_name || "Neural"} Voice`}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Companion Switcher Dropdown */}
                  {showAvatarDropdown && (
                    <div
                      className="absolute top-full left-0 mt-2 w-64 rounded-2xl p-2 z-50 shadow-2xl"
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
                            onClick={() => {
                              setActiveAvatar(av);
                              setShowAvatarDropdown(false);
                            }}
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
                        <Link
                          href="/onboarding"
                          className="w-full btn btn-primary btn-sm flex items-center justify-center gap-1.5 py-1.5"
                          style={{ textDecoration: "none" }}
                        >
                          <Plus size={13} />
                          <span>+ New Companion</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Header Actions: Voice Call, Video Call, Stories Archive, Add Memory, Delete Companion */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Link
                    href={`/voice?avatarId=${activeAvatar.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
                    title={`Start live voice call with ${activeAvatar.name}`}
                  >
                    <Volume2 size={13} style={{ color: "var(--sunglow)" }} />
                    <span style={{ fontWeight: 600 }}>Voice Call</span>
                  </Link>

                  <Link
                    href={`/call?avatarId=${activeAvatar.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 11, padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
                    title={`Start live 16:9 interactive video call with ${activeAvatar.name}`}
                  >
                    <Video size={13} />
                    <span style={{ fontWeight: 600 }}>Video Call</span>
                  </Link>
                  <button
                    onClick={() => openStoriesModal()}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: "5px 10px" }}
                  >
                    <BookOpen size={12} style={{ color: "var(--lavender)" }} /> Stories ({activeAvatar.memory_count || 0})
                  </button>
                  <button
                    onClick={() => setShowMemoryModal(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: "5px 10px" }}
                  >
                    <Plus size={13} /> Add
                  </button>
                  <button
                    onClick={() => { setAvatarToDelete(activeAvatar); setShowDeleteAvatarModal(true); }}
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      color: "var(--text-2)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 150ms",
                    }}
                    className="hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid var(--border-0)",
                  fontSize: 13,
                  color: "var(--text-1)",
                  background: "var(--surface-0)",
                }}
              >
                Select or create a companion to begin conversation.
              </div>
            )}

            {/* Message Feed - ONLY SCROLLING AREA (ChatGPT / Claude style) */}
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"
                    }`}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "chat-message-user"
                        : "chat-message-assistant"
                    }
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 mt-1.5 px-1 flex-wrap">
                    <span className="text-[10.5px]" style={{ color: "var(--text-2)" }}>
                      {formatTime(m.timestamp)}
                    </span>
                    {m.role === "assistant" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSpeakMessage(m.id, m.content)}
                          disabled={isVoiceLoading && isVoiceLoading !== m.id}
                          className="text-[10.5px] flex items-center gap-1 transition-all px-2 py-0.5 rounded-lg cursor-pointer disabled:opacity-50"
                          style={{
                            color: "var(--sunglow)",
                            background: "rgba(255, 209, 102, 0.12)",
                            border: "1px solid rgba(255, 209, 102, 0.35)",
                          }}
                          title={`Hear companion voice (${voiceInfo ? voiceInfo.voice_name : "ElevenLabs"})`}
                        >
                          {isVoiceLoading === m.id ? (
                            <>
                              <Loader2 size={12} className="animate-spin" style={{ color: "var(--sunglow)" }} />
                              <span style={{ color: "var(--sunglow)" }}>Speaking...</span>
                            </>
                          ) : playingMessageId === m.id ? (
                            <>
                              <VolumeX size={12} className="animate-pulse" style={{ color: "var(--sunglow)" }} />
                              <span style={{ color: "var(--sunglow)" }}>Pause</span>
                            </>
                          ) : (
                            <>
                              <Volume2 size={12} style={{ color: "var(--sunglow)" }} />
                              <span>Hear Voice {voiceInfo ? `(${voiceInfo.voice_name})` : ""}</span>
                            </>
                          )}
                        </button>

                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${m.grounded
                              ? "grounding-badge-grounded"
                              : "grounding-badge-gentle"
                            }`}
                        >
                          {m.grounded ? "✓ Grounded in Memory" : "✦ Gentle Reflection"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div className="chat-message-assistant" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              className="p-3 sm:p-4 shrink-0"
              style={{
                background: "var(--surface-0)",
                borderTop: "1px solid var(--border-0)",
              }}
            >
              <div className="chat-input-pill max-w-4xl mx-auto">
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => setShowMemoryModal(true)}
                  className="p-1 transition-colors cursor-pointer"
                  style={{ color: "var(--text-1)" }}
                  title="Upload memories or documents"
                >
                  <Upload size={17} />
                </button>

                {/* Microphone Speech-to-Text Button */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`transition-all p-1.5 rounded-full cursor-pointer flex items-center justify-center ${isRecording
                      ? "bg-red-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.8)] animate-pulse"
                      : "hover:text-[#EEF0F6]"
                    }`}
                  style={{ color: isRecording ? "#fff" : "var(--text-1)" }}
                  title={isRecording ? "Click to stop talking & send" : "Click to talk (Microphone)"}
                >
                  {isRecording ? <Square size={14} fill="currentColor" /> : <Mic size={16} />}
                </button>

                <input
                  type="text"
                  placeholder={
                    isRecording
                      ? "Listening... Click red Stop button to send message"
                      : `Message ${activeAvatar ? activeAvatar.name : "companion"}...`
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="chat-input-field"
                  disabled={!activeAvatar || isTyping}
                />

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping || !activeAvatar}
                  className="btn btn-primary btn-sm disabled:opacity-40"
                  style={{ padding: "8px 18px", fontSize: 12 }}
                >
                  <Send size={13} /> Send
                </button>
              </div>
            </div>

          </section>
        </div>
      </main>

      {/* Add Memory Modal */}
      {showMemoryModal && (
        <div className="modal-backdrop">
          <div
            className="w-full max-w-[540px] rounded-[28px] p-6 sm:p-7 relative text-left"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-1)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.85)",
            }}
          >
            <div
              className="flex items-center justify-between pb-3 mb-4 shrink-0"
              style={{ borderBottom: "1px solid var(--border-0)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(124,79,240,0.15)", color: "var(--brand-glow)" }}
                >
                  <BookOpen size={16} />
                </div>
                <h3 className="font-medium text-[16px]" style={{ color: "var(--text-0)" }}>
                  Preserve a Memory for {activeAvatar?.name}
                </h3>
              </div>
              <button
                onClick={() => setShowMemoryModal(false)}
                className="transition-colors cursor-pointer text-[18px]"
                style={{ color: "var(--text-2)" }}
              >
                ✕
              </button>
            </div>

            {memorySuccessMsg && (
              <div
                className="mb-4 p-3 rounded-xl text-[12px] flex items-center gap-2"
                style={{
                  background: "rgba(52, 211, 153, 0.12)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  color: "var(--text-0)",
                }}
              >
                <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                <span>{memorySuccessMsg}</span>
              </div>
            )}

            {memoryErrorMsg && (
              <div
                className="mb-4 p-3 rounded-xl text-[12px] flex items-center gap-2"
                style={{
                  background: "rgba(248, 113, 113, 0.12)",
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                  color: "var(--text-0)",
                }}
              >
                <AlertCircle size={16} style={{ color: "var(--danger)" }} className="shrink-0" />
                <span>{memoryErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddMemory} className="space-y-4">
              <div>
                <label className="text-[11.5px] font-medium block mb-1.5" style={{ color: "var(--lavender)" }}>
                  Story, Favorite Saying, or Shared Tradition:
                </label>
                <textarea
                  rows={4}
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="e.g., Whenever it rained, she would make warm tea and tell us childhood stories..."
                  className="w-full p-3.5 text-[13px] rounded-xl focus:outline-none transition-all"
                  style={{
                    background: "var(--surface-0)",
                    border: "1px solid var(--border-1)",
                    color: "var(--text-0)",
                  }}
                />
              </div>

              <div>
                <label className="text-[11.5px] font-medium block mb-1.5" style={{ color: "var(--lavender)" }}>
                  Attach Chat Export or Document (.txt, .pdf, .docx):
                </label>
                <input
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  className="text-[12px] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] cursor-pointer"
                  style={{
                    color: "var(--text-1)",
                  }}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowMemoryModal(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMemory || (!newMemoryText.trim() && !uploadFile)}
                  className="btn btn-primary btn-sm disabled:opacity-40 cursor-pointer"
                >
                  {isSavingMemory ? "Preserving..." : "Save Memory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Companion Confirmation Modal */}
      {showDeleteAvatarModal && avatarToDelete && (
        <div className="modal-backdrop">
          <div
            className="w-full max-w-[460px] rounded-[28px] p-6 sm:p-7 flex flex-col relative text-left"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-1)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.85)",
            }}
          >
            <div
              className="flex items-center justify-between pb-3 mb-4"
              style={{ borderBottom: "1px solid var(--border-0)" }}
            >
              <div className="flex items-center gap-2.5" style={{ color: "var(--danger)" }}>
                <AlertCircle size={20} />
                <h3 className="font-medium text-[16px]" style={{ color: "var(--text-0)" }}>
                  Remove Companion Archive
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteAvatarModal(false);
                  setAvatarToDelete(null);
                }}
                className="text-[18px] cursor-pointer"
                style={{ color: "var(--text-2)" }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-0)" }}>
                Are you sure you want to remove <strong>{avatarToDelete.name}</strong> ({avatarToDelete.relationship})?
              </p>
              <div
                className="p-3.5 rounded-xl text-[12px] space-y-1.5"
                style={{
                  background: "rgba(248, 113, 113, 0.08)",
                  border: "1px solid rgba(248, 113, 113, 0.25)",
                  color: "var(--text-1)",
                }}
              >
                <p>• All <strong>{avatarToDelete.memory_count || 0}</strong> preserved memories and stories will be deleted.</p>
                <p>• Vector search points and neural voice persona will be purged.</p>
                <p>• Conversation history will be permanently erased.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAvatarModal(false);
                  setAvatarToDelete(null);
                }}
                disabled={isDeletingAvatar}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAvatar}
                disabled={isDeletingAvatar}
                className="btn btn-danger btn-sm"
              >
                {isDeletingAvatar ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Removing...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} /> Remove Companion
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View & Manage Stories / Memories Modal */}
      {showStoriesModal && activeAvatar && (
        <div className="modal-backdrop">
          <div
            className="w-full max-w-[640px] max-h-[85vh] rounded-[28px] p-6 sm:p-7 flex flex-col relative text-left"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-1)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.85)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between pb-3 mb-3 shrink-0"
              style={{ borderBottom: "1px solid var(--border-0)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255, 209, 102, 0.16)", border: "1px solid rgba(255, 209, 102, 0.4)", color: "var(--sunglow)" }}
                >
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="font-medium text-[16px]" style={{ color: "var(--text-0)" }}>
                    {activeAvatar.name}&apos;s Preserved Stories
                  </h3>
                  <p className="text-[11px]" style={{ color: "var(--text-2)" }}>
                    {avatarMemories.length} stories grounded in vector vault
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowStoriesModal(false);
                    setShowMemoryModal(true);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ padding: "6px 12px", fontSize: 11 }}
                >
                  <Plus size={12} /> Add Story
                </button>
                <button
                  onClick={() => setShowStoriesModal(false)}
                  className="text-[18px] cursor-pointer"
                  style={{ color: "var(--text-2)" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {storiesToastMsg && (
              <div
                className="mb-3 p-2.5 rounded-xl text-[12px] flex items-center gap-2 shrink-0"
                style={{
                  background: "rgba(52, 211, 153, 0.12)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  color: "var(--text-0)",
                }}
              >
                <CheckCircle2 size={15} style={{ color: "var(--success)" }} />
                <span>{storiesToastMsg}</span>
              </div>
            )}

            {/* Stories List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 py-1 no-scrollbar">
              {loadingMemories ? (
                <div className="py-12 text-center text-[13px] flex flex-col items-center gap-2" style={{ color: "var(--text-1)" }}>
                  <Loader2 size={18} className="animate-spin" style={{ color: "var(--brand-glow)" }} />
                  <span>Loading preserved stories from memory vault...</span>
                </div>
              ) : avatarMemories.length === 0 ? (
                <div className="py-12 text-center space-y-3" style={{ color: "var(--text-1)" }}>
                  <p className="text-[13px]">No stories preserved in this archive yet.</p>
                  <button
                    onClick={() => {
                      setShowStoriesModal(false);
                      setShowMemoryModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Add First Memory
                  </button>
                </div>
              ) : (
                avatarMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3.5 rounded-2xl transition-all flex flex-col gap-2 group"
                    style={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--border-0)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap flex-1" style={{ color: "var(--text-0)" }}>
                        {mem.content}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(mem.id)}
                        disabled={deletingMemoryId === mem.id}
                        className="p-1.5 rounded-lg transition-all shrink-0 cursor-pointer disabled:opacity-50"
                        style={{ color: "var(--text-2)" }}
                        title="Remove this memory"
                      >
                        {deletingMemoryId === mem.id ? (
                          <Loader2 size={13} className="animate-spin text-red-400" />
                        ) : (
                          <Trash2 size={13} className="hover:text-red-400" />
                        )}
                      </button>
                    </div>

                    <div
                      className="flex items-center gap-2 pt-1 text-[10.5px]"
                      style={{ borderTop: "1px solid var(--border-0)", color: "var(--text-2)" }}
                    >
                      <span
                        className="px-2 py-0.5 rounded-md uppercase tracking-wider text-[9.5px]"
                        style={{
                          background: "rgba(124, 79, 240, 0.12)",
                          color: "var(--lavender)",
                          border: "1px solid rgba(124, 79, 240, 0.25)",
                        }}
                      >
                        {mem.source_type || "manual"}
                      </span>
                      {mem.memory_date && <span>• {new Date(mem.memory_date).toLocaleDateString()}</span>}
                      {mem.created_at && (
                        <span className="ml-auto">
                          Added {new Date(mem.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="pt-3 flex items-center justify-between text-[11px] shrink-0 mt-2"
              style={{ borderTop: "1px solid var(--border-0)", color: "var(--text-2)" }}
            >
              <span>Grounded in Qdrant Vector Vault</span>
              <button
                onClick={() => setShowStoriesModal(false)}
                className="btn btn-ghost btn-sm"
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

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#FAFAFA]">Loading Chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
