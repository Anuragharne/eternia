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

  // Modal for adding a memory
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memorySuccessMsg, setMemorySuccessMsg] = useState("");

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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

  const handleSend = async () => {
    if (!input.trim() || !activeAvatar) return;

    const userText = input.trim();
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await api.sendMessage(activeAvatar.id, userText);
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
        grounded: response.is_grounded,
        memoriesUsed: response.memories_used,
        citedIds: response.memory_ids_cited,
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

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!activeAvatar) return;
    setIsSavingMemory(true);
    setMemorySuccessMsg("");

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
      }, 1400);
    } catch (err) {
      console.error("Error adding memory:", err);
      alert(err.message || "Failed to add memory.");
    } finally {
      setIsSavingMemory(false);
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
    <div className="outer-viewport">
      {/* Main Container */}
      <main className="site-container flex flex-col flex-1 pb-4">
        
        {/* Floating Navbar */}
        <Navbar />

        {/* Inner Chat Box */}
        <div className="w-full flex-1 flex flex-col pt-20 pb-2">
          <div className="w-full flex-1 rounded-[28px] bg-[#0D0D0D] border border-[#A58CF4]/25 shadow-[0_16px_50px_rgba(13,13,13,0.7)] flex flex-col md:flex-row overflow-hidden min-h-[600px] h-[calc(100vh-100px)]">
            
            {/* Sidebar: Companions List */}
            <aside className="w-full md:w-[280px] bg-[#433075]/15 border-r border-[#A58CF4]/20 flex flex-col p-4">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#A58CF4]/15">
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

              <div className="flex-1 overflow-y-auto space-y-1.5 py-1">
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
                      className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                        activeAvatar?.id === av.id
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
                    </div>
                  ))
                )}
              </div>

              {/* Sidebar bottom indicator */}
              <div className="pt-3 border-t border-[#A58CF4]/15 flex items-center justify-between text-[11px] text-[rgba(250,250,250,0.7)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#A58CF4] shadow-[0_0_8px_#A58CF4] inline-block"></span>
                  Grounded Sanctuary
                </span>
                <Link href="/settings" className="hover:text-[#A58CF4] no-underline text-[rgba(250,250,250,0.7)] transition-colors">
                  <SettingsIcon size={14} />
                </Link>
              </div>
            </aside>

            {/* Main Chat Thread & Input */}
            <section className="flex-1 flex flex-col bg-[#0D0D0D]">
              
              {/* Chat Thread Header */}
              {activeAvatar ? (
                <div className="px-6 py-3.5 bg-[#433075]/20 border-b border-[#A58CF4]/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#433075] border border-[#A58CF4]/30 text-[#FAFAFA] flex items-center justify-center font-medium text-[12px]">
                      {activeAvatar.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-[14px] font-medium text-[#FAFAFA]">
                        {activeAvatar.name}
                      </h3>
                      <p className="text-[11px] text-[rgba(250,250,250,0.65)] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A58CF4] inline-block"></span>
                        {activeAvatar.relationship} · {activeAvatar.memory_count || 0} preserved stories
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowMemoryModal(true)}
                      className="btn-pill-ghost text-[11px] px-3 py-1 flex items-center gap-1"
                    >
                      <Plus size={13} /> Add Story / Memory
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-4 bg-[#433075]/20 border-b border-[#A58CF4]/20 text-[13px] text-[rgba(250,250,250,0.7)]">
                  Select or create a companion to begin conversation.
                </div>
              )}

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === "user" ? "items-end" : "items-start"
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

                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[10.5px] text-[rgba(250,250,250,0.55)]">
                        {formatTime(m.timestamp)}
                      </span>
                      {m.role === "assistant" && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            m.grounded
                              ? "bg-[#433075] text-[#FAFAFA] border border-[#A58CF4]/40"
                              : "bg-[#433075]/40 text-[#A58CF4] border border-[#A58CF4]/25"
                          }`}
                        >
                          {m.grounded ? "✓ Grounded in Memory" : "✦ Gentle Reflection"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-start">
                    <div className="chat-message-assistant py-3 px-4 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#A58CF4] animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-[#A58CF4] animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 rounded-full bg-[#A58CF4] animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Pill */}
              <div className="p-4 bg-[#433075]/15 border-t border-[#A58CF4]/20">
                <div className="chat-input-pill">
                  <button
                    type="button"
                    onClick={() => setShowMemoryModal(true)}
                    className="text-[rgba(250,250,250,0.7)] hover:text-[#A58CF4] transition-colors p-1"
                    title="Upload memories or documents"
                  >
                    <Upload size={17} />
                  </button>

                  <input
                    type="text"
                    placeholder={`Message ${activeAvatar ? activeAvatar.name : "companion"}...`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="chat-input-field"
                    disabled={!activeAvatar || isTyping}
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping || !activeAvatar}
                    className="btn-pill-primary text-[12px] px-4 py-2 disabled:opacity-40"
                  >
                    <Send size={13} className="mr-1" /> Send
                  </button>
                </div>
              </div>

            </section>
          </div>
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
                className="text-[rgba(250,250,250,0.6)] hover:text-[#FAFAFA] text-[18px] transition-colors"
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
                  className="btn-pill-primary text-[11px] px-4 py-2 disabled:opacity-40"
                >
                  {isSavingMemory ? "Preserving..." : "Save Memory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#FAFAFA]">Loading Sanctuary...</div>}>
      <ChatContent />
    </Suspense>
  );
}
