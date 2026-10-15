"use client";

import { useState, useRef, useEffect } from "react";

const SAMPLE_MESSAGES = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hello, beta! It's so good to hear from you. How are you doing today?",
    timestamp: new Date(Date.now() - 60000),
    grounded: true,
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState(SAMPLE_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate API response (will be replaced with real backend call)
    setTimeout(() => {
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "I don't have a specific memory about that, but I'd love for you to tell me more. Would you like to add it to our shared memories?",
        timestamp: new Date(),
        grounded: false,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
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
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", color: "inherit" }}>
            <div className="navbar-brand-icon">✦</div>
            Eternia
          </a>
        </div>
        <div className="navbar-actions">
          <button className="btn btn-ghost btn-sm">⚙️ Settings</button>
          <button className="btn btn-ghost btn-sm">📤 Export</button>
        </div>
      </nav>

      {/* Chat Layout */}
      <div className="chat-layout">
        {/* Sidebar */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3 style={{ fontSize: "var(--text-base)", marginBottom: "var(--space-3)" }}>
              Your Companions
            </h3>
            <a href="/onboarding" className="btn btn-primary btn-sm" style={{ width: "100%" }}>
              + New Companion
            </a>
          </div>
          <div className="avatar-list">
            <div className="avatar-item active">
              <div className="avatar-photo">👩</div>
              <div className="avatar-info">
                <h4>Amma</h4>
                <p>Last chat: just now</p>
              </div>
            </div>
            <div className="avatar-item">
              <div className="avatar-photo">👴</div>
              <div className="avatar-info">
                <h4>Grandpa Ravi</h4>
                <p>Last chat: 2 days ago</p>
              </div>
            </div>
          </div>

          {/* Sidebar footer */}
          <div
            style={{
              marginTop: "auto",
              padding: "var(--space-4)",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-full)",
                  background: "var(--gradient-brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--text-sm)",
                  color: "white",
                }}
              >
                A
              </div>
              <div>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Aarya</p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  Free Plan
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="chat-main">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="avatar-photo" style={{ width: 36, height: 36 }}>
                👩
              </div>
              <div>
                <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Amma</h4>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  142 memories · Online
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button className="btn btn-ghost btn-sm" title="Add memories">
                📖 Add Memory
              </button>
              <button className="btn btn-ghost btn-sm" title="Voice Recovery">
                🎤
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {/* Welcome message */}
            <div
              style={{
                textAlign: "center",
                padding: "var(--space-8) 0",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
              }}
            >
              <p style={{ marginBottom: "var(--space-2)" }}>💛</p>
              <p>
                This is an AI companion built from your shared memories.
              </p>
              <p style={{ fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>
                It reflects what you&apos;ve shared — it will never invent what it doesn&apos;t know.
              </p>
            </div>

            {/* Message list */}
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`message message-${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === "user" ? "A" : "👩"}
                  </div>
                  <div>
                    <div className="message-bubble">{msg.content}</div>
                    <div
                      className="message-meta"
                      style={{
                        textAlign: msg.role === "user" ? "right" : "left",
                      }}
                    >
                      {formatTime(msg.timestamp)}
                      {msg.role === "assistant" && (
                        <span
                          style={{
                            marginLeft: "var(--space-2)",
                            color: msg.grounded
                              ? "var(--color-success)"
                              : "var(--color-warning)",
                          }}
                        >
                          {msg.grounded ? "● Grounded" : "● No matching memory"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="message message-assistant">
                <div className="message-avatar">👩</div>
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
              >
                ↑
              </button>
            </div>
            <p
              style={{
                textAlign: "center",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                marginTop: "var(--space-2)",
              }}
            >
              Responses are grounded in uploaded memories · This is an AI, not a real person
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
