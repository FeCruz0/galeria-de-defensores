-- Migration: Phase 11 Features (Social, DMs, Spectators & Table Visibility)
-- Timestamp: 20260807000001

-- 1. Friendships Table
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  friend_id uuid references public.profiles on delete cascade not null,
  status text default 'pending'::text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint friendships_user_friend_unique unique (user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios visualizam proprias conexoes de amizade" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Usuarios criam solicitacoes de amizade" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Envolvidos atualizam solicitacao de amizade" ON public.friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Envolvidos deletam amizade" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 2. Direct Messages (DMs) Table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles on delete cascade not null,
  receiver_id uuid references public.profiles on delete cascade not null,
  content text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios visualizam proprias DMs" ON public.direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Usuarios enviam DMs para amigos" ON public.direct_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted' AND (
        (user_id = auth.uid() AND friend_id = receiver_id) OR
        (friend_id = auth.uid() AND user_id = receiver_id)
      )
    )
  );

CREATE POLICY "Destinatario atualiza status de leitura da DM" ON public.direct_messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- 3. Update tables schema for Spectators & Player Limits
ALTER TABLE public.tables 
  ADD COLUMN IF NOT EXISTS max_players integer DEFAULT 4 NOT NULL CHECK (max_players >= 1 AND max_players <= 20),
  ADD COLUMN IF NOT EXISTS allow_spectators boolean DEFAULT true NOT NULL;

-- 4. Update table_players schema for Member Roles
ALTER TABLE public.table_players 
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'player' NOT NULL CHECK (role IN ('player', 'spectator'));

-- 5. Updated RLS Policies for Tables & Chat
DROP POLICY IF EXISTS "Membros da mesa e o mestre podem visualizar a mesa" ON public.tables;
DROP POLICY IF EXISTS "Mesas públicas visíveis para todos e privadas para membros" ON public.tables;
CREATE POLICY "Mesas públicas visíveis para todos e privadas para membros" ON public.tables
  FOR SELECT USING (
    is_private = false OR
    auth.uid() = master_id OR 
    EXISTS (
      SELECT 1 FROM public.table_players 
      WHERE table_id = id AND player_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Membros da mesa podem ler mensagens" ON public.chat_messages;
DROP POLICY IF EXISTS "Membros e espectadores podem ler mensagens do chat" ON public.chat_messages;
CREATE POLICY "Membros e espectadores podem ler mensagens do chat" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tables 
      WHERE id = table_id AND master_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.table_players 
      WHERE table_id = table_id AND player_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.tables 
      WHERE id = table_id AND is_private = false AND allow_spectators = true
    )
  );

DROP POLICY IF EXISTS "Membros da mesa podem enviar mensagens" ON public.chat_messages;
DROP POLICY IF EXISTS "Apenas mestre e jogadores ativos podem enviar mensagens no chat" ON public.chat_messages;
CREATE POLICY "Apenas mestre e jogadores ativos podem enviar mensagens no chat" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM public.tables 
        WHERE id = table_id AND master_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.table_players 
        WHERE table_id = table_id AND player_id = auth.uid() AND role = 'player'
      )
    )
  );
