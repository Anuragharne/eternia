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
    <div className="h-screen h-[100dvh] w-full overflow-hidden bg-[#0D0D0D] flex flex-col md:flex-row p-2 sm:p-3 md:p-3.5 gap-2.5 sm:gap-3 relative">
      {/* Ambient background glow (strictly in palette #433075 and #0D0D0D) */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 50% 0%, rgba(67, 48, 117, 0.45) 0%, rgba(13, 13, 13, 0.95) 55%, #0D0D0D 100%)",
        }}
      />

      {/* Left-docked Vertical Glass Navbar for Chat mode */}
      <Navbar mode="vertical" />

      {/* Main Chat Viewport - Pinned ChatGPT/Claude Style Layout */}
      <main className="flex-1 min-w-0 h-full flex flex-col z-10 overflow-hidden">
        <div className="w-full flex-1 min-h-0 rounded-[24px] sm:rounded-[28px] bg-[#0D0D0D] border border-[#A58CF4]/25 shadow-[0_16px_50px_rgba(13,13,13,0.7)] flex flex-col md:flex-row overflow-hidden">

          {/* Sidebar: Companions List */}
          <aside className="w-full md:w-[280px] bg-[#433075]/15 border-r border-[#A58CF4]/20 flex flex-col p-4 shrink-0 h-full overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#A58CF4]/15 shrink-0">
              <span className="text-[12px] font-medium text-[#FAFAFA]">
                Active Companions
              </span>
              <Link
                href="/onboarding"
                className="text-[11px] font-medium text-[#A58CF4] hover:text-[#FAFAFA] flex items-center gap-1 no-underline transition-colors"
              >
                <Plus size={13} /> New
              </Link>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 py-1 no-scrollbar">
              {loadingAvatars ? (
                <p className="text-[12px] text-[rgba(250,250,250,0.7)] p-2">Loading companions...</p>
              ) : avatars.length === 0 ? (
                <div className="text-center p-6 text-[rgba(250,250,250,0.7)]">
                  <p className="text-[12px] mb-3">No companion created yet.</p>
                  <Link href="/onboarding" className="btn-pill-primary text-[11px] px-3 py-1.5 no-underline">
                    Create First
                  </Link>
                </div>
              ) : (
                avatars.map((av) => (
                  <div
                    key={av.id}
                    onClick={() => setActiveAvatar(av)}
                    className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all group relative ${activeAvatar?.id === av.id
                        ? "bg-[#433075] text-[#FAFAFA] shadow-xs border border-[#A58CF4]/35"
                        : "hover:bg-[#433075]/20 text-[rgba(250,250,250,0.7)] border border-transparent"
                      }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#433075] border border-[#A58CF4]/30 text-[#FAFAFA] flex items-center justify-center font-medium text-[13px] shrink-0">
                      {av.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-medium truncate text-[#FAFAFA]">
                        {av.name}
                      </h4>
                      <p className="text-[11px] text-[rgba(250,250,250,0.6)] truncate">
                        {av.relationship} · {av.memory_count || 0} memories
                      </p>
                    </div>

                    {/* Delete Companion Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAvatarToDelete(av);
                        setShowDeleteAvatarModal(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[rgba(250,250,250,0.45)] hover:text-red-400 hover:bg-[#0D0D0D]/60 transition-all cursor-pointer"
                      title={`Remove ${av.name}'s archive`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Sidebar bottom indicator */}
            <div className="pt-3 border-t border-[#A58CF4]/15 flex items-center justify-between text-[11px] text-[rgba(250,250,250,0.7)] shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#A58CF4] shadow-[0_0_8px_#A58CF4] inline-block"></span>
                Grounded Chat • Uncapped
              </span>
              <Link href="/settings" className="hover:text-[#A58CF4] no-underline text-[rgba(250,250,250,0.7)] transition-colors">
                <SettingsIcon size={14} />
              </Link>
            </div>
          </aside>

          {/* Main Chat Thread & Stationary Input (ChatGPT / Claude Style) */}
          <section className="flex-1 min-h-0 flex flex-col h-full bg-[#0D0D0D] overflow-hidden">

            {/* Chat Thread Header */}
            {activeAvatar ? (
              <div className="px-4 sm:px-6 py-3 bg-[#433075]/20 border-b border-[#A58CF4]/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#433075] border border-[#A58CF4]/30 text-[#FAFAFA] flex items-center justify-center font-medium text-[12px]">
                    {activeAvatar.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-medium text-[#FAFAFA]">
                      {activeAvatar.name}
                    </h3>
                    <p className="text-[11px] text-[rgba(250,250,250,0.65)] flex items-center gap-1.5 flex-wrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A58CF4] inline-block"></span>
                      <span>{activeAvatar.relationship} · {activeAvatar.memory_count || 0} stories</span>
                      {voiceInfo && (
                        <>
                          <span className="text-[rgba(250,250,250,0.3)]">·</span>
                          <span className="text-[#A58CF4] flex items-center gap-1 font-medium">
                            <Volume2 size={11} /> {voiceInfo.voice_name} Voice
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Header Actions: Stories Archive, Add Memory, Delete Companion */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => openStoriesModal()}
                    className="btn-pill-ghost text-[11px] px-2.5 sm:px-3 py-1 flex items-center gap-1 cursor-pointer"
                    title="View, search and manage preserved memories"
                  >
                    <BookOpen size={12} className="text-[#A58CF4]" /> Stories ({activeAvatar.memory_count || 0})
                  </button>
                  <button
                    onClick={() => setShowMemoryModal(true)}
                    className="btn-pill-ghost text-[11px] px-2.5 sm:px-3 py-1 flex items-center gap-1 cursor-pointer"
                    title="Add a new story or memory"
                  >
                    <Plus size={13} /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarToDelete(activeAvatar);
                      setShowDeleteAvatarModal(true);
                    }}
                    className="p-1.5 rounded-full text-[rgba(250,250,250,0.5)] hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                    title={`Delete ${activeAvatar.name}'s companion archive`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-4 bg-[#433075]/20 border-b border-[#A58CF4]/20 text-[13px] text-[rgba(250,250,250,0.7)] shrink-0">
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
                    <span className="text-[10.5px] text-[rgba(250,250,250,0.55)]">
                      {formatTime(m.timestamp)}
                    </span>
                    {m.role === "assistant" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSpeakMessage(m.id, m.content)}
                          disabled={isVoiceLoading && isVoiceLoading !== m.id}
                          className="text-[10.5px] text-[rgba(250,250,250,0.65)] hover:text-[#A58CF4] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-md hover:bg-[#433075]/30 cursor-pointer disabled:opacity-50"
                          title={`Hear companion voice (${voiceInfo ? voiceInfo.voice_name : "ElevenLabs"})`}
                        >
                          {isVoiceLoading === m.id ? (
                            <>
                              <Loader2 size={12} className="text-[#A58CF4] animate-spin" />
                              <span className="text-[#A58CF4]">Speaking...</span>
                            </>
                          ) : playingMessageId === m.id ? (
                            <>
                              <VolumeX size={12} className="text-[#A58CF4] animate-pulse" />
                              <span className="text-[#A58CF4]">Pause</span>
                            </>
                          ) : (
                            <>
                              <Volume2 size={12} className="text-[#A58CF4]" />
                              <span>Hear Voice {voiceInfo ? `(${voiceInfo.voice_name})` : ""}</span>
                            </>
                          )}
                        </button>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.grounded
                              ? "bg-[#433075] text-[#FAFAFA] border border-[#A58CF4]/40"
                              : "bg-[#433075]/40 text-[#A58CF4] border border-[#A58CF4]/25"
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
                <div className="flex items-start">
                  <div className="chat-message-assistant py-3 px-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#A58CF4] animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-[#A58CF4] animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-[#A58CF4] animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Pinned Stationary Chat Input Bar (ChatGPT / Claude style) */}
            <div className="p-3 sm:p-4 bg-[#433075]/15 border-t border-[#A58CF4]/20 shrink-0">
              <div className="chat-input-pill max-w-4xl mx-auto">
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => setShowMemoryModal(true)}
                  className="text-[rgba(250,250,250,0.7)] hover:text-[#A58CF4] transition-colors p-1"
                  title="Upload memories or documents"
                >
                  <Upload size={17} />
                </button>

                {/* Microphone Speech-to-Text Button (Click to Talk -> Click to Stop & Send) */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`transition-all p-1.5 rounded-full cursor-pointer flex items-center justify-center ${isRecording
                      ? "bg-red-600 text-[#FAFAFA] shadow-[0_0_14px_rgba(220,38,38,0.8)] animate-pulse"
                      : "text-[rgba(250,250,250,0.7)] hover:text-[#A58CF4]"
                    }`}
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
                  className="btn-pill-primary text-[12px] px-4 py-2 disabled:opacity-40 cursor-pointer"
                >
                  <Send size={13} className="mr-1" /> Send
                </button>
              </div>
            </div>

          </section>
        </div>
      </main>

      {/* Add Memory Modal */}
      {showMemoryModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#A58CF4]/20">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#A58CF4]" />
                <h3 className="font-medium text-[16px] text-[#FAFAFA]">
                  Preserve a Memory for {activeAvatar?.name}
                </h3>
              </div>
              <button
                onClick={() => setShowMemoryModal(false)}
                className="text-[rgba(250,250,250,0.6)] hover:text-[#FAFAFA] text-[18px] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {memorySuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-[#433075]/40 border border-[#A58CF4] text-[#FAFAFA] text-[12px] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#A58CF4]" />
                <span>{memorySuccessMsg}</span>
              </div>
            )}

            {memoryErrorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-[#433075]/20 border border-red-500/60 text-[#FAFAFA] text-[12px] flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{memoryErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddMemory} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-[#A58CF4] block mb-1">
                  Story, Favorite Saying, or Shared Memory:
                </label>
                <textarea
                  rows={4}
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="e.g., Whenever it rained, Dadi would always bake warm besan laddoos and tell us stories about her childhood in Shimla..."
                  className="w-full p-3 text-[13px] border border-[#A58CF4]/25 rounded-xl focus:outline-none focus:border-[#A58CF4] bg-[#0D0D0D] text-[#FAFAFA]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#A58CF4] block mb-1">
                  Attach Chat Export or Document (.txt, .pdf, .docx):
                </label>
                <input
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  className="text-[12px] text-[rgba(250,250,250,0.8)] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[11px] file:bg-[#433075] file:text-[#FAFAFA] hover:file:bg-[#A58CF4] hover:file:text-[#0D0D0D]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMemoryModal(false)}
                  className="btn-pill-ghost text-[11px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMemory || (!newMemoryText.trim() && !uploadFile)}
                  className="btn-pill-primary text-[11px] px-4 py-2 disabled:opacity-40 cursor-pointer"
                >
                  {isSavingMemory ? "Preserving..." : "Save Memory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Companion Confirmation Modal (Kabir, Anurag, etc.) */}
      {showDeleteAvatarModal && avatarToDelete && (
        <div className="modal-backdrop">
          <div className="w-full max-w-[460px] rounded-[28px] bg-[#0D0D0D] p-6 sm:p-7 border border-[#A58CF4]/30 shadow-[0_24px_80px_rgba(13,13,13,0.95)] flex flex-col relative text-left">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#A58CF4]/20">
              <div className="flex items-center gap-2.5 text-red-400">
                <AlertCircle size={20} />
                <h3 className="font-medium text-[16px] text-[#FAFAFA]">
                  Remove Companion Archive
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteAvatarModal(false);
                  setAvatarToDelete(null);
                }}
                className="text-[rgba(250,250,250,0.6)] hover:text-[#FAFAFA] text-[18px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-[13px] text-[#FAFAFA] leading-relaxed">
                Are you sure you want to remove <strong>{avatarToDelete.name}</strong> ({avatarToDelete.relationship})?
              </p>
              <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 text-[12px] text-[rgba(250,250,250,0.75)] space-y-1.5">
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
                className="btn-pill-ghost text-[12px] px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAvatar}
                disabled={isDeletingAvatar}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-[#FAFAFA] text-[12px] font-medium flex items-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50 transition-all"
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
          <div className="w-full max-w-[640px] max-h-[85vh] rounded-[28px] bg-[#0D0D0D] p-6 sm:p-7 border border-[#A58CF4]/30 shadow-[0_24px_80px_rgba(13,13,13,0.95)] flex flex-col relative text-left">

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#A58CF4]/20 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#A58CF4]" />
                <div>
                  <h3 className="font-medium text-[16px] text-[#FAFAFA]">
                    {activeAvatar.name}'s Preserved Stories
                  </h3>
                  <p className="text-[11px] text-[rgba(250,250,250,0.6)]">
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
                  className="btn-pill-primary text-[11px] px-3 py-1 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Story
                </button>
                <button
                  onClick={() => setShowStoriesModal(false)}
                  className="text-[rgba(250,250,250,0.6)] hover:text-[#FAFAFA] text-[18px] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {storiesToastMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-[#433075]/40 border border-[#A58CF4] text-[#FAFAFA] text-[12px] flex items-center gap-2 shrink-0">
                <CheckCircle2 size={15} className="text-[#A58CF4]" />
                <span>{storiesToastMsg}</span>
              </div>
            )}

            {/* Stories List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 py-1 no-scrollbar">
              {loadingMemories ? (
                <div className="py-12 text-center text-[13px] text-[rgba(250,250,250,0.7)] flex flex-col items-center gap-2">
                  <Loader2 size={18} className="animate-spin text-[#A58CF4]" />
                  <span>Loading preserved stories from memory vault...</span>
                </div>
              ) : avatarMemories.length === 0 ? (
                <div className="py-12 text-center text-[rgba(250,250,250,0.65)] space-y-3">
                  <p className="text-[13px]">No stories preserved in this archive yet.</p>
                  <button
                    onClick={() => {
                      setShowStoriesModal(false);
                      setShowMemoryModal(true);
                    }}
                    className="btn-pill-primary text-[11px] px-4 py-2"
                  >
                    Add First Memory
                  </button>
                </div>
              ) : (
                avatarMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3.5 rounded-2xl bg-[#433075]/15 border border-[#A58CF4]/20 hover:border-[#A58CF4]/35 transition-all flex flex-col gap-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[12.5px] text-[#FAFAFA] leading-relaxed whitespace-pre-wrap flex-1">
                        {mem.content}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(mem.id)}
                        disabled={deletingMemoryId === mem.id}
                        className="p-1.5 rounded-lg text-[rgba(250,250,250,0.4)] hover:text-red-400 hover:bg-red-950/30 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                        title="Remove this memory"
                      >
                        {deletingMemoryId === mem.id ? (
                          <Loader2 size={13} className="animate-spin text-red-400" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-[#A58CF4]/10 text-[10.5px] text-[rgba(250,250,250,0.55)]">
                      <span className="px-2 py-0.5 rounded-md bg-[#433075]/30 text-[#A58CF4] border border-[#A58CF4]/20 uppercase tracking-wider text-[9.5px]">
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
            <div className="pt-3 border-t border-[#A58CF4]/15 flex items-center justify-between text-[11px] text-[rgba(250,250,250,0.6)] shrink-0 mt-2">
              <span>Grounded in Qdrant Vector Vault</span>
              <button
                onClick={() => setShowStoriesModal(false)}
                className="btn-pill-ghost text-[11px] px-3 py-1"
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
