/**
 * Centralized API client for communicating with the Eternia FastAPI backend.
 * Automatically injects Supabase JWT access tokens into request headers.
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

export async function apiCall(path, options = {}) {
  // Get active Supabase auth session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "demo-token";

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // If body is FormData (file upload), let browser set Content-Type with boundary
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: { code: "SERVER_ERROR", message: "Server error occurred", status: response.status } };
      }

      const err = errorData?.error || errorData;
      throw new ApiError(
        err.code || "REQUEST_FAILED",
        err.message || `Request failed with status ${response.status}`,
        response.status,
        err.details || {}
      );
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError("NETWORK_ERROR", error.message || "Network connection error", 0);
  }
}

// ============================================================
// CONVENIENCE API METHODS
// ============================================================

export const api = {
  // Avatars
  getAvatars: () => apiCall("/avatars"),
  getAvatar: (id) => apiCall(`/avatars/${id}`),
  createAvatar: (data) => apiCall("/avatars", { method: "POST", body: JSON.stringify(data) }),
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
  importMemoriesFile: (avatarId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiCall(`/memories/${avatarId}/import`, {
      method: "POST",
      body: formData,
    });
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

  // ElevenLabs Voice Synthesis
  getVoiceCatalog: () => apiCall("/voice/catalog"),
  getVoiceInfo: (avatarId) => apiCall(`/voice/${avatarId}/info`),
  getSpeechAudioBlob: async (avatarId, text) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "demo-token";
    const url = `${API_BASE_URL}/voice/${avatarId}/speak`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Speech synthesis failed with status ${response.status}`);
    }
    return await response.blob();
  },

  // D-ID Talking Avatar
  uploadAvatarPhoto: async (avatarId, file, generateIntro = false) => {
    const formData = new FormData();
    formData.append("file", file);
    const query = generateIntro ? "?generate_intro=true" : "";
    return apiCall(`/did-avatar/${avatarId}/upload-photo${query}`, {
      method: "POST",
      body: formData,
    });
  },
  getAvatarPhotoUrl: (avatarId) => apiCall(`/did-avatar/${avatarId}/photo-url`),
  generateTalkVideo: (avatarId, text, voiceProvider = "microsoft", voiceId = "en-US-JennyNeural") =>
    apiCall(`/did-avatar/${avatarId}/generate-talk`, {
      method: "POST",
      body: JSON.stringify({
        text,
        voice_provider: voiceProvider,
        voice_id: voiceId,
      }),
    }),
  getDIDCredits: () => apiCall("/did-avatar/credits"),
  getIntroVideo: (avatarId) => apiCall(`/did-avatar/${avatarId}/intro-video`),
  generateIntroVideo: (avatarId) =>
    apiCall(`/did-avatar/${avatarId}/generate-intro`, { method: "POST" }),

  // Data Export & Account Management
  exportDataUrl: (format = "zip") => `${API_BASE_URL}/export/user-data?format=${format}`,
  downloadExport: async (format = "zip") => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const url = `${API_BASE_URL}/export/user-data?format=${format}`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error("Failed to export data archive");
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `eternia_archive.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  },
};
