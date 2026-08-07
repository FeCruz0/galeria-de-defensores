-- Migration: Future Roadmap Pre-allocations (Quick NPC Tracker, Audit Logs & B-Tree Indexes)
-- Timestamp: 20260807000002

-- 1. Table NPCs (Quick NPC Tracker for GM — Phase 11, Item 3)
CREATE TABLE IF NOT EXISTS public.table_npcs (
  id uuid default uuid_generate_v4() primary key,
  table_id uuid references public.tables on delete cascade not null,
  name text not null,
  concept text,
  attributes_values jsonb default '{"F":0,"H":0,"R":0,"A":0,"PdF":0}'::jsonb not null,
  resources_current jsonb default '{"PV":1,"PM":1}'::jsonb not null,
  annotations text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.table_npcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas o mestre gerencia NPCs da mesa" ON public.table_npcs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tables
      WHERE id = table_id AND master_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tables
      WHERE id = table_id AND master_id = auth.uid()
    )
  );

-- 2. Audit Logs (Security & Observability — Phase 12, Item 5)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e sistema registram logs de auditoria" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios visualizam proprios logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 3. Performance B-Tree Indexes on Critical Foreign Keys
CREATE INDEX IF NOT EXISTS idx_table_players_table_id ON public.table_players (table_id);
CREATE INDEX IF NOT EXISTS idx_table_players_player_id ON public.table_players (player_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_table_id ON public.chat_messages (table_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_users ON public.direct_messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_user_ids ON public.friendships (user_id, friend_id);
CREATE INDEX IF NOT EXISTS idx_characters_table_id ON public.characters (table_id);
CREATE INDEX IF NOT EXISTS idx_campaign_journals_table_id ON public.campaign_journals (table_id);
