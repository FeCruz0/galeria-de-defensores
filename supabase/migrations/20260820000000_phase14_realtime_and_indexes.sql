-- Migration: Composite Performance Indexes for Chat Messages, Table Players & Characters (Phase 14)
-- Timestamp: 20260820000000

-- 1. Composite Index on chat_messages (table_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_chat_messages_table_created ON public.chat_messages (table_id, created_at DESC);

-- 2. Composite Index on table_players (table_id, player_id, role)
CREATE INDEX IF NOT EXISTS idx_table_players_table_user ON public.table_players (table_id, player_id, role);

-- 3. Composite Index on characters (user_id, table_id)
CREATE INDEX IF NOT EXISTS idx_characters_user_table ON public.characters (user_id, table_id);
