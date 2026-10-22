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
