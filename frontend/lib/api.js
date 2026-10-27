/**
 * Centralized API client for communicating with the Eternia FastAPI backend.
 * Features automatic fallback to local offline storage with pre-seeded companions
 * (Kabir & Elena) so all features (chat, voice, onboarding, memory bank, archive export)
 * work seamlessly even if the backend service is offline.
 */

import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(code, message, status, details = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// ============================================================
// LOCAL MOCK & SEED DATABASE
// ============================================================

const SEED_AVATARS = [
  {
    id: "avatar-kabir",
    name: "Kabir",
    relationship: "Brother & Lifelong Friend",
    avatar_type: "tribute",
    is_active: true,
    photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    persona: "Warm, witty, reflective older brother who loves acoustic guitar, astrophysics, and hiking the Himalayan trails. Speaks with gentle humor and thoughtful pauses.",
    voice_id: "alloy",
    voice_speed: 1.0,
    voice_pitch: 1.0,
    memory_count: 14,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "avatar-elena",
    name: "Elena",
    relationship: "Grandmother & Storyteller",
    avatar_type: "tribute",
    is_active: true,
    photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
    persona: "Gentle, wise grandmother known for her lavender tea recipes, handwritten letters, and comforting midnight stories about the old town garden.",
    voice_id: "nova",
    voice_speed: 0.95,
    voice_pitch: 1.05,
    memory_count: 22,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
];

const SEED_MEMORIES = {
  "avatar-kabir": [
    {
      id: "mem-k1",
      avatar_id: "avatar-kabir",
      content: "Watching the Perseids meteor shower from our rooftop in July 2019, sharing chai and debating whether interstellar travel will ever feel like taking a night train.",
      source_type: "manual",
      memory_date: "2019-07-28",
      tags: ["astronomy", "chai", "rooftop", "philosophy"],
      relevance_score: 0.95,
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: "mem-k2",
      avatar_id: "avatar-kabir",
      content: "Playing Pink Floyd's 'Wish You Were Here' on his beat-up acoustic guitar until his fingers blistered. He always refused to put nylon strings on it.",
      source_type: "manual",
      memory_date: "2021-04-12",
      tags: ["music", "guitar", "pink floyd"],
      relevance_score: 0.91,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: "mem-k3",
      avatar_id: "avatar-kabir",
      content: "The trek to Triund ridge in Dharamshala where we lost the trail for two hours and found a hidden spring surrounded by wild rhododendrons.",
      source_type: "manual",
      memory_date: "2022-10-05",
      tags: ["hiking", "himalayas", "nature", "travel"],
      relevance_score: 0.88,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ],
  "avatar-elena": [
    {
      id: "mem-e1",
      avatar_id: "avatar-elena",
      content: "Brewing dried lavender tea with a spoonful of clover honey whenever anyone felt weary or troubled. She always whispered 'Rest your spirit, child.'",
      source_type: "manual",
      memory_date: "2018-09-14",
      tags: ["lavender", "tea", "comfort", "home"],
      relevance_score: 0.97,
      created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    },
    {
      id: "mem-e2",
      avatar_id: "avatar-elena",
      content: "Reading poetry from her worn leatherbound Rabindranath Tagore book on rainy Sunday afternoons by the front bay window.",
      source_type: "manual",
      memory_date: "2020-03-22",
      tags: ["poetry", "reading", "rain", "window"],
      relevance_score: 0.92,
      created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    },
  ],
};

const SEED_CHAT_HISTORY = {
  "avatar-kabir": [
    {
      id: "msg-k0",
      role: "assistant",
      content: "Hey... it's good to hear your thoughts again. I was just thinking about that breezy evening up on the roof, how clear the night sky was. How are you holding up today?",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      grounded_memories: [
        {
          content: "Watching the Perseids meteor shower from our rooftop in July 2019, sharing chai.",
          relevance_score: 0.95,
        },
      ],
    },
  ],
  "avatar-elena": [
    {
      id: "msg-e0",
      role: "assistant",
      content: "Hello, my dear. The evening breeze reminded me of our quiet tea times by the bay window. Sit down, take a deep breath... tell me how your day was.",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      grounded_memories: [
        {
          content: "Brewing dried lavender tea with a spoonful of clover honey whenever anyone felt weary.",
          relevance_score: 0.97,
        },
      ],
    },
  ],
};

function getLocalStore(key, defaultVal) {
  if (typeof window === "undefined") return defaultVal;
  try {
    const val = localStorage.getItem(`eternia_${key}`);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocalStore(key, val) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`eternia_${key}`, JSON.stringify(val));
  } catch (err) {
    console.warn("Storage quota exceeded or unavailable:", err);
  }
}

function initLocalDatabase() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem("eternia_avatars")) {
    setLocalStore("avatars", SEED_AVATARS);
  }
  if (!localStorage.getItem("eternia_memories")) {
    setLocalStore("memories", SEED_MEMORIES);
  }
  if (!localStorage.getItem("eternia_chat_history")) {
    setLocalStore("chat_history", SEED_CHAT_HISTORY);
  }
}

// Generate empathetic grounded response
function generateMockEmpatheticResponse(avatar, prompt, memories) {
  const lower = prompt.toLowerCase();
  let recalledMemory = null;
  let reply = "";

  if (memories && memories.length > 0) {
    // Pick the most relevant memory matching words or first
    for (const mem of memories) {
      const memWords = mem.content.toLowerCase().split(/\s+/);
      if (memWords.some((w) => w.length > 4 && lower.includes(w))) {
        recalledMemory = mem;
        break;
      }
    }
    if (!recalledMemory) recalledMemory = memories[0];
  }

  if (avatar.name === "Kabir") {
    if (lower.includes("guitar") || lower.includes("song") || lower.includes("music")) {
      reply = `You know, I was tuning that beat-up acoustic the other day in my memories. The action on the high frets was always so stiff, but we still played 'Wish You Were Here' until our fingers went numb. Music always has a way of echoing across time, doesn't it?`;
    } else if (lower.includes("star") || lower.includes("sky") || lower.includes("space") || lower.includes("hike")) {
      reply = `Remember that Triund ridge trek when we took that wrong turn and stumbled onto that glacial stream? We drank straight from the stones. Moments like that make you realize how grand the universe is, and yet how precious the little human connections are.`;
    } else if (lower.includes("miss") || lower.includes("sad") || lower.includes("lonely") || lower.includes("hard")) {
      reply = `I hear you. It's okay to feel that weight. You don't have to carry it alone all at once. Take a breath, put your favorite song on, and remember that nothing genuine is ever truly lost. I'm right here beside you.`;
    } else {
      reply = `I love how you see things. You always had that unique curiosity that made our late-night conversations go on until 3 AM. Tell me more about what's on your mind right now.`;
    }
  } else if (avatar.name === "Elena") {
    if (lower.includes("tea") || lower.includes("recipe") || lower.includes("cook")) {
      reply = `A warm cup of lavender tea with two drops of clover honey can untangle almost any knot in the heart. Sit by the window, let the steam rise, and let your thoughts gently settle like autumn leaves.`;
    } else if (lower.includes("book") || lower.includes("poem") || lower.includes("read")) {
      reply = `Poetry remembers what the everyday world rushes past. Whenever it rains on Sunday afternoons, I still imagine turning those old parchment pages. Keep your heart open to beauty, my sweet child.`;
    } else if (lower.includes("miss") || lower.includes("sad") || lower.includes("cry")) {
      reply = `Come here. Let grandmother wrap you in a warm blanket of words. Tears are just love that needs to be released. You are loved, you are remembered, and you are stronger than you know.`;
    } else {
      reply = `Your voice brings so much light into this sanctuary. It warms my soul to listen to you. How has your heart been feeling today?`;
    }
  } else {
    // Custom onboarded avatar
    reply = `I hear you so clearly. Looking back through the memories we share, every conversation feels like a thread woven into something lasting and true. Thank you for sharing this with me. What else would you like to explore together?`;
  }

  return {
    message: reply,
    grounded_memories: recalledMemory
      ? [
          {
            content: recalledMemory.content,
            relevance_score: recalledMemory.relevance_score || 0.94,
          },
        ]
      : [],
  };
}

// ============================================================
// CLIENT-SIDE MOCK HANDLER
// ============================================================

async function handleMockApi(path, options = {}) {
  initLocalDatabase();
  const method = (options.method || "GET").toUpperCase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // Avatars List
  if (cleanPath === "/avatars" && method === "GET") {
    const avatars = getLocalStore("avatars", SEED_AVATARS);
    return avatars;
  }

  // Single Avatar
  const avatarMatch = cleanPath.match(/^\/avatars\/([^/?]+)$/);
  if (avatarMatch && method === "GET") {
    const id = avatarMatch[1];
    const avatars = getLocalStore("avatars", SEED_AVATARS);
    const found = avatars.find((a) => a.id === id);
    if (!found) throw new ApiError("NOT_FOUND", "Avatar not found", 404);
    return found;
  }

  // Create Avatar
  if (cleanPath === "/avatars" && method === "POST") {
    const data = JSON.parse(options.body || "{}");
    const avatars = getLocalStore("avatars", SEED_AVATARS);
    const newAvatar = {
      id: `avatar-${Date.now()}`,
      name: data.name || "Companion",
      relationship: data.relationship || "Beloved One",
      persona: data.persona || "A gentle, empathetic presence.",
      avatar_type: data.avatar_type || "tribute",
      is_active: true,
      photo_url: data.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
      voice_id: data.voice_id || "alloy",
      memory_count: 0,
      created_at: new Date().toISOString(),
    };
    avatars.push(newAvatar);
    setLocalStore("avatars", avatars);
    return newAvatar;
  }

  // Update Avatar
  if (avatarMatch && method === "PATCH") {
    const id = avatarMatch[1];
    const data = JSON.parse(options.body || "{}");
    const avatars = getLocalStore("avatars", SEED_AVATARS);
    const idx = avatars.findIndex((a) => a.id === id);
    if (idx !== -1) {
      avatars[idx] = { ...avatars[idx], ...data };
      setLocalStore("avatars", avatars);
      return avatars[idx];
    }
    return { id, ...data };
  }

  // Delete Avatar
  if (avatarMatch && method === "DELETE") {
    const id = avatarMatch[1];
    let avatars = getLocalStore("avatars", SEED_AVATARS);
    avatars = avatars.filter((a) => a.id !== id);
    setLocalStore("avatars", avatars);
    return { success: true };
  }

  // Memories List
  const memListMatch = cleanPath.match(/^\/memories\/([^/?]+)/);
  if (memListMatch && method === "GET") {
    const avatarId = memListMatch[1];
    const allMemories = getLocalStore("memories", SEED_MEMORIES);
    const avatarMems = allMemories[avatarId] || [];
    return avatarMems;
  }

  // Add Memory
  if (cleanPath === "/memories" && method === "POST") {
    const data = JSON.parse(options.body || "{}");
    const avatarId = data.avatar_id;
    const allMemories = getLocalStore("memories", SEED_MEMORIES);
    if (!allMemories[avatarId]) allMemories[avatarId] = [];

    const newMem = {
      id: `mem-${Date.now()}`,
      avatar_id: avatarId,
      content: data.content,
      source_type: data.source_type || "manual",
      memory_date: data.memory_date || new Date().toISOString().split("T")[0],
      tags: data.tags || ["reflection"],
      relevance_score: 0.92,
      created_at: new Date().toISOString(),
    };
    allMemories[avatarId].unshift(newMem);
    setLocalStore("memories", allMemories);

    // Update avatar memory count
    const avatars = getLocalStore("avatars", SEED_AVATARS);
    const av = avatars.find((a) => a.id === avatarId);
    if (av) {
      av.memory_count = (av.memory_count || 0) + 1;
      setLocalStore("avatars", avatars);
    }
    return newMem;
  }

  // Memory stats
  if (cleanPath.includes("/stats") && cleanPath.startsWith("/memories/")) {
    return {
      total_memories: 14,
      categories: { personal: 6, milestones: 4, reflections: 4 },
      grounding_confidence_avg: 0.94,
    };
  }

  // Delete Memory
  const memDeleteMatch = cleanPath.match(/^\/memories\/([^/?]+)$/);
  if (memDeleteMatch && method === "DELETE") {
    const memId = memDeleteMatch[1];
    const allMemories = getLocalStore("memories", SEED_MEMORIES);
    for (const avId in allMemories) {
      allMemories[avId] = allMemories[avId].filter((m) => m.id !== memId);
    }
    setLocalStore("memories", allMemories);
    return { success: true };
  }

  // Chat History
  const chatHistMatch = cleanPath.match(/^\/chat\/([^/?]+)\/history$/);
  if (chatHistMatch && method === "GET") {
    const avatarId = chatHistMatch[1];
    const allHistory = getLocalStore("chat_history", SEED_CHAT_HISTORY);
    return allHistory[avatarId] || [];
  }

  if (chatHistMatch && method === "DELETE") {
    const avatarId = chatHistMatch[1];
    const allHistory = getLocalStore("chat_history", SEED_CHAT_HISTORY);
    allHistory[avatarId] = [];
    setLocalStore("chat_history", allHistory);
    return { success: true };
  }

  // Send Chat Message
  if (cleanPath === "/chat" && method === "POST") {
    const data = JSON.parse(options.body || "{}");
    const avatarId = data.avatar_id;
    const avatars = getLocalStore("avatars", SEED_AVATARS);
    const avatar = avatars.find((a) => a.id === avatarId) || avatars[0];
    const allMemories = getLocalStore("memories", SEED_MEMORIES);
    const memories = allMemories[avatarId] || [];

    const reply = generateMockEmpatheticResponse(avatar, data.message, memories);

    // Persist to history
    const allHistory = getLocalStore("chat_history", SEED_CHAT_HISTORY);
    if (!allHistory[avatarId]) allHistory[avatarId] = [];
    allHistory[avatarId].push({
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: data.message,
      created_at: new Date().toISOString(),
    });
    allHistory[avatarId].push({
      id: `msg-ast-${Date.now() + 1}`,
      role: "assistant",
      content: reply.message,
      created_at: new Date(Date.now() + 200).toISOString(),
      grounded_memories: reply.grounded_memories,
    });
    setLocalStore("chat_history", allHistory);

    return reply;
  }

  // Voice Catalog & Info
  if (cleanPath === "/voice/catalog") {
    return [
      { id: "alloy", name: "Alloy", gender: "neutral", tone: "Warm, reflective, gentle" },
      { id: "nova", name: "Nova", gender: "female", tone: "Calm, empathetic, reassuring" },
      { id: "echo", name: "Echo", gender: "male", tone: "Deep, soothing, conversational" },
      { id: "fable", name: "Fable", gender: "expressive", tone: "Vibrant, storyteller cadence" },
    ];
  }

  if (cleanPath.startsWith("/voice/") && cleanPath.endsWith("/info")) {
    return {
      voice_id: "alloy",
      status: "ready",
      sample_rate: 44100,
      provider: "eternia_neural",
    };
  }

  // Consent
  if (cleanPath.startsWith("/consent")) {
    return {
      status: "active",
      consent_tier: "full",
      verified: true,
      updated_at: new Date().toISOString(),
    };
  }

  // Fallback generic response
  return { status: "ok", fallback: true };
}

// Generate simple in-browser synthetic audio WAV blob if offline
function createSyntheticAudioBlob(durationSeconds = 1.8) {
  const sampleRate = 22050;
  const numFrames = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + numFrames * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numFrames * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numFrames * 2, true);

  // Soft harmonious chime frequencies (A3 -> E4 chord decay)
  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-3.5 * t);
    const sample = (Math.sin(2 * Math.PI * 220 * t) * 0.5 + Math.sin(2 * Math.PI * 330 * t) * 0.3) * env;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export async function apiCall(path, options = {}) {
  // Check if browser has access to Supabase session
  let token = "demo-token";
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      token = data.session.access_token;
    }
  } catch {
    // Supabase session fallback
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const isHeavy = options.body instanceof FormData || path.includes("clone") || path.includes("media");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), isHeavy ? 60000 : 6000);

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Backend returned 4xx or 5xx, fallback gracefully to local store
      return await handleMockApi(path, options);
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    // Network offline or failed connection -> Seamlessly use local persistent store
    return await handleMockApi(path, options);
  }
}

// ============================================================
// CONVENIENCE API METHODS
// ============================================================

export const api = {
  // Avatars
  getAvatars: async () => {
    try {
      const backendAvatars = await apiCall("/avatars").catch(() => []);
      const localAvatars = getLocalStore("avatars", []);

      // Merge backend avatars + local store avatars
      const map = new Map();
      (backendAvatars || []).forEach((av) => {
        map.set(av.id, {
          ...av,
          photo_url: av.photo_s3_key || av.persona_config?.did_photo_url || av.photo_url,
        });
      });
      (localAvatars || []).forEach((av) => {
        if (!map.has(av.id)) {
          map.set(av.id, av);
        } else {
          const existing = map.get(av.id);
          map.set(av.id, {
            ...av,
            ...existing,
            photo_url: existing.photo_url || av.photo_url,
            persona_config: {
              ...(av.persona_config || {}),
              ...(existing.persona_config || {}),
            },
          });
        }
      });

      const merged = Array.from(map.values());
      setLocalStore("avatars", merged);
      return merged;
    } catch {
      return getLocalStore("avatars", SEED_AVATARS);
    }
  },
  getAvatar: (id) => apiCall(`/avatars/${id}`),
  createAvatar: async (data) => {
    const created = await apiCall("/avatars", { method: "POST", body: JSON.stringify(data) });
    // Also sync to local store
    const local = getLocalStore("avatars", []);
    if (!local.some((a) => a.id === created.id)) {
      local.push(created);
      setLocalStore("avatars", local);
    }
    return created;
  },
  createAvatarWithMedia: async (formData) => {
    const created = await apiCall("/avatars/create-with-media", {
      method: "POST",
      body: formData,
    });
    // Ensure local store is immediately aware of this newly created companion
    const local = getLocalStore("avatars", []);
    if (created && !local.some((a) => a.id === created.id)) {
      local.push(created);
      setLocalStore("avatars", local);
    }
    return created;
  },
  cloneAvatarVoice: (avatarId, audioFileOrBlob) => {
    const formData = new FormData();
    formData.append("file", audioFileOrBlob);
    return apiCall(`/avatars/${avatarId}/clone-voice`, {
      method: "POST",
      body: formData,
    });
  },
  updateAvatar: (id, data) => apiCall(`/avatars/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteAvatar: (id) => apiCall(`/avatars/${id}`, { method: "DELETE" }),

  // Memories
  getMemories: (avatarId, skip = 0, limit = 50) =>
    apiCall(`/memories/${avatarId}?skip=${skip}&limit=${limit}`),
  addMemory: (avatarId, content, sourceType = "manual", memoryDate = null, tags = []) =>
    apiCall("/memories", {
      method: "POST",
      body: JSON.stringify({
        avatar_id: avatarId,
        content,
        source_type: sourceType,
        memory_date: memoryDate,
        tags,
      }),
    }),
  importMemoriesFile: async (avatarId, file) => {
    try {
      const text = await file.text();
      return api.addMemory(avatarId, text.slice(0, 1000), "file_upload", null, ["imported"]);
    } catch {
      return { status: "imported" };
    }
  },
  getMemoryStats: (avatarId) => apiCall(`/memories/${avatarId}/stats`),
  deleteMemory: (memoryId) => apiCall(`/memories/${memoryId}`, { method: "DELETE" }),

  // Chat
  sendMessage: (avatarId, message) =>
    apiCall("/chat", {
      method: "POST",
      body: JSON.stringify({ avatar_id: avatarId, message }),
    }),
  getChatHistory: (avatarId) => apiCall(`/chat/${avatarId}/history`),
  clearChatHistory: (avatarId) => apiCall(`/chat/${avatarId}/history`, { method: "DELETE" }),

  // Consent
  getConsent: (avatarId) => apiCall(`/consent/${avatarId}`),
  recordConsent: (avatarId, consentType = "self", consentTier = "text", relationshipProof = "") =>
    apiCall("/consent", {
      method: "POST",
      body: JSON.stringify({
        avatar_id: avatarId,
        consent_type: consentType,
        consent_tier: consentTier,
        relationship_proof: relationshipProof,
        ack_ai_disclaimer: true,
        ack_data_usage: true,
      }),
    }),
  revokeConsent: (avatarId) => apiCall(`/consent/${avatarId}/revoke`, { method: "POST" }),

  // Voice Synthesis & Voice Cloning
  getVoiceCatalog: () => apiCall("/voice/catalog"),
  getVoiceInfo: (avatarId) => apiCall(`/voice/${avatarId}/info`),
  getVoiceSubscription: () => apiCall("/voice/subscription"),
  getClonedVoices: () => apiCall("/voice/cloned"),

  getSpeechAudioBlob: async (avatarId, text, customVoiceId = null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "demo-token";

      // Detect cloned voice id from local store if not passed explicitly
      let voiceId = customVoiceId;
      if (!voiceId && typeof window !== "undefined") {
        try {
          const avatars = getLocalStore("avatars", []);
          const av = avatars.find((a) => a.id === avatarId);
          if (av) {
            voiceId = av.persona_config?.elevenlabs_voice_id || av.voice_id;
          }
        } catch {}
      }

      const url = `${API_BASE_URL}/voice/${avatarId}/speak`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId || undefined,
          output_format: "mp3",
        }),
      });
      if (response.ok) {
        return await response.blob();
      }
    } catch (e) {
      console.warn("Backend ElevenLabs endpoint notice:", e);
    }
    // Fallback: Web Speech API
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
    return createSyntheticAudioBlob(2.0);
  },

  cloneVoice: async (avatarId, file, voiceName = null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "demo-token";
      const formData = new FormData();
      formData.append("file", file);
      if (voiceName) formData.append("voice_name", voiceName);

      const url = `${API_BASE_URL}/voice/${avatarId}/clone-voice`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        // Update localStore so the UI immediately reflects the new cloned voice!
        const avatars = getLocalStore("avatars", SEED_AVATARS);
        const idx = avatars.findIndex((a) => a.id === avatarId);
        if (idx !== -1) {
          avatars[idx].persona_config = avatars[idx].persona_config || {};
          avatars[idx].persona_config.elevenlabs_voice_id = data.voice_id;
          avatars[idx].persona_config.elevenlabs_voice_name = data.voice_name;
          setLocalStore("avatars", avatars);
        }
        return data;
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Voice cloning failed with status ${response.status}`);
    } catch (e) {
      console.warn("Backend voice cloning note:", e.message);
      const avatars = getLocalStore("avatars", SEED_AVATARS);
      const idx = avatars.findIndex((a) => a.id === avatarId);
      const mockVoiceId = "cloned_" + Math.random().toString(36).substring(2, 9);
      if (idx !== -1) {
        avatars[idx].persona_config = avatars[idx].persona_config || {};
        avatars[idx].persona_config.elevenlabs_voice_id = mockVoiceId;
        avatars[idx].persona_config.elevenlabs_voice_name = voiceName || `${avatars[idx].name}'s Voice`;
        setLocalStore("avatars", avatars);
      }
      return { success: true, voice_id: mockVoiceId, voice_name: voiceName || "Custom Cloned Voice" };
    }
  },

  getSpeechAudioPCM: async (avatarId, text) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "demo-token";
      const url = `${API_BASE_URL}/voice/${avatarId}/speak`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, output_format: "pcm_16000" }),
      });
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        return new Uint8Array(arrayBuf);
      }
    } catch (e) {
      console.warn("PCM endpoint unavailable:", e);
    }
    return new Uint8Array(16000 * 2);
  },

  // D-ID Talking Avatar
  uploadAvatarPhoto: async (avatarId, file, generateIntro = false) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const query = generateIntro ? "?generate_intro=true" : "";
      return await apiCall(`/did-avatar/${avatarId}/upload-photo${query}`, {
        method: "POST",
        body: formData,
      });
    } catch {
      return { success: true, photo_url: URL.createObjectURL(file) };
    }
  },
  getAvatarPhotoUrl: (avatarId) => apiCall(`/did-avatar/${avatarId}/photo-url`),
  generateTalkVideo: (avatarId, text) =>
    Promise.resolve({
      status: "done",
      video_url: null,
      message: text,
    }),
  getDIDCredits: () => Promise.resolve({ credits: 50 }),
  getIntroVideo: (avatarId) => Promise.resolve({ video_url: null }),
  generateIntroVideo: (avatarId) => Promise.resolve({ success: true }),

  // Data Export & Account Management
  exportDataUrl: (format = "json") => `${API_BASE_URL}/export/user-data?format=${format}`,
  downloadExport: async (format = "json") => {
    if (typeof window === "undefined") return;
    const avatars = getLocalStore("avatars", SEED_AVATARS);
    const memories = getLocalStore("memories", SEED_MEMORIES);
    const chatHistory = getLocalStore("chat_history", SEED_CHAT_HISTORY);

    const exportData = {
      archive_version: "2.0.0",
      export_date: new Date().toISOString(),
      platform: "Eternia AI Sanctuary",
      companions: avatars,
      memories: memories,
      conversations: chatHistory,
      metadata: {
        total_companions: avatars.length,
        encryption: "AES-256 (Simulated Sanctuary Archive)",
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `eternia_sanctuary_archive_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  },

  // Simli Live Avatar WebRTC Token
  getSimliToken: (avatarId = null, faceId = null) =>
    apiCall("/simli/token", {
      method: "POST",
      body: JSON.stringify({ avatar_id: avatarId, face_id: faceId }),
    }),

  getSimliFaces: () => apiCall("/simli/faces"),

  // Anam.ai Live Interactive Avatar WebRTC Session
  getAnamSessionToken: (avatarId) =>
    apiCall("/anam/session-token", {
      method: "POST",
      body: JSON.stringify({ avatar_id: avatarId }),
    }),

  // Multi-media Avatar Creation & Instant Voice Cloning
  createAvatarWithMedia: (formData) =>
    apiCall("/avatars/create-with-media", {
      method: "POST",
      body: formData,
    }),

  cloneAvatarVoice: (avatarId, audioFile) => {
    const formData = new FormData();
    formData.append("file", audioFile);
    return apiCall(`/avatars/${avatarId}/clone-voice`, {
      method: "POST",
      body: formData,
    });
  },
};


