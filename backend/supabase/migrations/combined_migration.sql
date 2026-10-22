-- ============================================================
-- Eternia AI Companion Platform — Migration 001: Initial Schema
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS
-- ============================================================
-- Extends Supabase auth.users with app-specific profile data.
-- Linked via auth.users.id = public.users.id
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT UNIQUE NOT NULL,
    full_name       TEXT,
    avatar_url      TEXT,
    plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'presence', 'legacy')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-create profile on signup via Supabase auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'full_name'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. AVATARS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.avatars (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    relationship         TEXT NOT NULL,
    subject_type         TEXT NOT NULL CHECK (subject_type IN ('living', 'deceased')),
    bio                  TEXT CHECK (char_length(bio) <= 2000),
    personality_traits   TEXT[] DEFAULT '{}',
    catchphrases         TEXT[] DEFAULT '{}',
    voice_status         TEXT NOT NULL DEFAULT 'none' CHECK (voice_status IN ('none', 'placeholder', 'cloned')),
    consent_status       TEXT NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending', 'verified', 'revoked')),
    photo_s3_key         TEXT,
    voice_s3_key         TEXT,
    speaker_embedding_key TEXT,
    memory_count         INTEGER NOT NULL DEFAULT 0,
    persona_config       JSONB DEFAULT '{}',
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avatars_owner ON public.avatars(owner_id);
CREATE INDEX IF NOT EXISTS idx_avatars_active ON public.avatars(is_active) WHERE is_active = TRUE;

-- ============================================================
-- 3. MEMORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.memories (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    avatar_id           UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
    uploaded_by         UUID NOT NULL REFERENCES public.users(id),
    content             TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
    source_type         TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source_type IN (
                            'manual', 'journal', 'chat_export',
                            'photo_caption', 'voice_transcript', 'user_contributed'
                        )),
    memory_date         TIMESTAMPTZ,
    tags                TEXT[] DEFAULT '{}',
    confidence_score    FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    qdrant_point_id     TEXT,
    extracted_entities  TEXT[] DEFAULT '{}',
    extracted_metadata  JSONB DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_avatar ON public.memories(avatar_id);
CREATE INDEX IF NOT EXISTS idx_memories_source ON public.memories(source_type);
CREATE INDEX IF NOT EXISTS idx_memories_date ON public.memories(memory_date);

-- Trigger to maintain avatar.memory_count
CREATE OR REPLACE FUNCTION public.update_memory_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.avatars SET memory_count = memory_count + 1, updated_at = NOW()
        WHERE id = NEW.avatar_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.is_active = TRUE AND NEW.is_active = FALSE) THEN
        UPDATE public.avatars SET memory_count = memory_count - 1, updated_at = NOW()
        WHERE id = COALESCE(OLD.avatar_id, NEW.avatar_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_memory_change ON public.memories;
CREATE TRIGGER on_memory_change
    AFTER INSERT OR UPDATE OR DELETE ON public.memories
    FOR EACH ROW EXECUTE FUNCTION public.update_memory_count();

-- ============================================================
-- 4. CONSENT LOGS (Append-Only — NO UPDATE or DELETE allowed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.consent_logs (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    avatar_id            UUID NOT NULL REFERENCES public.avatars(id),
    granted_by           UUID NOT NULL REFERENCES public.users(id),
    consent_type         TEXT NOT NULL CHECK (consent_type IN ('self', 'family_attestation', 'revocation')),
    consent_tier         TEXT NOT NULL DEFAULT 'text' CHECK (consent_tier IN ('text', 'voice', 'full_avatar')),
    relationship_proof   TEXT,
    ack_ai_disclaimer    BOOLEAN NOT NULL DEFAULT FALSE,
    ack_data_usage       BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address           INET,
    user_agent           TEXT,
    status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'revoked')),
    cooling_period_ends  TIMESTAMPTZ,
    granted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard function preventing UPDATE and DELETE on consent_logs
CREATE OR REPLACE FUNCTION public.prevent_consent_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Consent logs are append-only. Modifications or deletions are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_consent_update ON public.consent_logs;
CREATE TRIGGER prevent_consent_update
    BEFORE UPDATE ON public.consent_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_consent_modification();

DROP TRIGGER IF EXISTS prevent_consent_delete ON public.consent_logs;
CREATE TRIGGER prevent_consent_delete
    BEFORE DELETE ON public.consent_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_consent_modification();

CREATE INDEX IF NOT EXISTS idx_consent_avatar ON public.consent_logs(avatar_id);

-- ============================================================
-- 5. MEDIA FILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.media_files (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    avatar_id            UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
    uploaded_by          UUID NOT NULL REFERENCES public.users(id),
    file_type            TEXT NOT NULL CHECK (file_type IN ('photo', 'voice', 'document')),
    s3_key               TEXT NOT NULL,
    original_filename    TEXT,
    content_type         TEXT,
    file_size_bytes      BIGINT CHECK (file_size_bytes >= 0),
    processing_metadata  JSONB DEFAULT '{}',
    status               TEXT NOT NULL DEFAULT 'uploaded'
                         CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_avatar ON public.media_files(avatar_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON public.media_files(file_type);

-- ============================================================
-- 6. CHAT SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    avatar_id         UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES public.users(id),
    message_count     INTEGER NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at   TIMESTAMPTZ,
    ended_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_avatar ON public.chat_sessions(avatar_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.chat_sessions(user_id);

-- ============================================================
-- 7. CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id         UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role               TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content            TEXT NOT NULL,
    is_grounded        BOOLEAN DEFAULT TRUE,
    memories_used      INTEGER DEFAULT 0,
    confidence_score   FLOAT CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    memory_ids_cited   TEXT[] DEFAULT '{}',
    retrieval_metadata JSONB DEFAULT '{}',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.chat_messages(created_at);

-- ============================================================
-- 8. FAMILY SHARES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.family_shares (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    avatar_id       UUID NOT NULL REFERENCES public.avatars(id) ON DELETE CASCADE,
    owner_id        UUID NOT NULL REFERENCES public.users(id),
    shared_with_id  UUID NOT NULL REFERENCES public.users(id),
    permission      TEXT NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'contributor')),
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(avatar_id, shared_with_id)
);

CREATE INDEX IF NOT EXISTS idx_shares_avatar ON public.family_shares(avatar_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON public.family_shares(shared_with_id);
-- ============================================================
-- Eternia AI Companion Platform — Migration 002: RLS Policies
-- ============================================================

-- Enable Row-Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_shares ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 1. USERS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- ============================================================
-- 2. AVATARS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Owners can CRUD own avatars" ON public.avatars;
CREATE POLICY "Owners can CRUD own avatars"
    ON public.avatars FOR ALL
    USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Shared users can view avatars" ON public.avatars;
CREATE POLICY "Shared users can view avatars"
    ON public.avatars FOR SELECT
    USING (
        id IN (
            SELECT avatar_id FROM public.family_shares
            WHERE shared_with_id = auth.uid() AND status = 'accepted'
        )
    );

-- ============================================================
-- 3. MEMORIES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Owners can CRUD memories" ON public.memories;
CREATE POLICY "Owners can CRUD memories"
    ON public.memories FOR ALL
    USING (
        avatar_id IN (
            SELECT id FROM public.avatars WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Contributors can add memories" ON public.memories;
CREATE POLICY "Contributors can add memories"
    ON public.memories FOR INSERT
    WITH CHECK (
        avatar_id IN (
            SELECT avatar_id FROM public.family_shares
            WHERE shared_with_id = auth.uid()
            AND permission = 'contributor'
            AND status = 'accepted'
        )
    );

DROP POLICY IF EXISTS "Shared users can view memories" ON public.memories;
CREATE POLICY "Shared users can view memories"
    ON public.memories FOR SELECT
    USING (
        avatar_id IN (
            SELECT avatar_id FROM public.family_shares
            WHERE shared_with_id = auth.uid() AND status = 'accepted'
        )
    );

-- ============================================================
-- 4. CONSENT LOGS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Owners can insert consent logs" ON public.consent_logs;
CREATE POLICY "Owners can insert consent logs"
    ON public.consent_logs FOR INSERT
    WITH CHECK (auth.uid() = granted_by);

DROP POLICY IF EXISTS "Owners can view consent logs" ON public.consent_logs;
CREATE POLICY "Owners can view consent logs"
    ON public.consent_logs FOR SELECT
    USING (
        avatar_id IN (
            SELECT id FROM public.avatars WHERE owner_id = auth.uid()
        )
    );

-- ============================================================
-- 5. MEDIA FILES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Owners can CRUD media files" ON public.media_files;
CREATE POLICY "Owners can CRUD media files"
    ON public.media_files FOR ALL
    USING (
        avatar_id IN (
            SELECT id FROM public.avatars WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Shared users can view media files" ON public.media_files;
CREATE POLICY "Shared users can view media files"
    ON public.media_files FOR SELECT
    USING (
        avatar_id IN (
            SELECT avatar_id FROM public.family_shares
            WHERE shared_with_id = auth.uid() AND status = 'accepted'
        )
    );

-- ============================================================
-- 6. CHAT SESSIONS & MESSAGES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can CRUD own sessions" ON public.chat_sessions;
CREATE POLICY "Users can CRUD own sessions"
    ON public.chat_sessions FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can access own session messages" ON public.chat_messages;
CREATE POLICY "Users can access own session messages"
    ON public.chat_messages FOR ALL
    USING (
        session_id IN (
            SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
        )
    );

-- ============================================================
-- 7. FAMILY SHARES POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Owners can manage family shares" ON public.family_shares;
CREATE POLICY "Owners can manage family shares"
    ON public.family_shares FOR ALL
    USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Recipients can view and accept shares" ON public.family_shares;
CREATE POLICY "Recipients can view and accept shares"
    ON public.family_shares FOR SELECT
    USING (auth.uid() = shared_with_id);

CREATE POLICY "Recipients can update share status"
    ON public.family_shares FOR UPDATE
    USING (auth.uid() = shared_with_id)
    WITH CHECK (auth.uid() = shared_with_id);
