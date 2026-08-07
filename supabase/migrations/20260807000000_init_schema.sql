-- Migration: Initial Schema Setup
-- Timestamp: 20260807000000

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis publicos sao visiveis para todos" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuarios podem atualizar o proprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Rule Systems Table
CREATE TABLE IF NOT EXISTS public.rule_systems (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,
  name text unique not null,
  description text,
  attributes jsonb not null,
  resources jsonb not null,
  advantages jsonb default '[]'::jsonb not null,
  disadvantages jsonb default '[]'::jsonb not null,
  skills jsonb default '[]'::jsonb not null,
  damage_types jsonb default '[]'::jsonb not null,
  dice_config jsonb default '{"count": 1, "faces": 6}'::jsonb not null,
  is_base_system boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.rule_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sistemas base sao visiveis para todos" ON public.rule_systems FOR SELECT USING (is_base_system = true OR auth.uid() = user_id);
CREATE POLICY "Usuarios podem criar seus proprios sistemas" ON public.rule_systems FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios podem atualizar seus proprios sistemas" ON public.rule_systems FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuarios podem deletar seus proprios sistemas" ON public.rule_systems FOR DELETE USING (auth.uid() = user_id);

-- 3. Tables (VTT Rooms)
CREATE TABLE IF NOT EXISTS public.tables (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  master_id uuid references public.profiles on delete cascade not null,
  rule_system_id uuid references public.rule_systems on delete set null,
  is_private boolean default false not null,
  password text,
  has_separated_chat boolean default false not null,
  rules_mod jsonb default '{}'::jsonb not null,
  custom_damage_types text[] default '{}'::text[] not null,
  custom_unique_advantages jsonb default '[]'::jsonb not null,
  last_visual_roll jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- 4. Table Players Table
CREATE TABLE IF NOT EXISTS public.table_players (
  table_id uuid references public.tables on delete cascade not null,
  player_id uuid references public.profiles on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (table_id, player_id)
);

ALTER TABLE public.table_players ENABLE ROW LEVEL SECURITY;

-- 5. Characters Table
CREATE TABLE IF NOT EXISTS public.characters (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  rule_system_id uuid references public.rule_systems on delete restrict not null,
  table_id uuid references public.tables on delete set null,
  name text not null,
  concept text,
  scale integer default 0 not null,
  points_total integer default 5 not null check (points_total >= 0),
  experience integer default 0 not null check (experience >= 0),
  attributes_values jsonb not null,
  resources_current jsonb not null,
  advantages jsonb default '[]'::jsonb not null,
  disadvantages jsonb default '[]'::jsonb not null,
  skills jsonb default '[]'::jsonb not null,
  spells jsonb default '[]'::jsonb not null,
  items jsonb default '[]'::jsonb not null,
  status_effects jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint characters_user_id_name_unique unique (user_id, name)
);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam proprios personagens" ON public.characters FOR ALL USING (auth.uid() = user_id);

-- 6. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  table_id uuid references public.tables on delete cascade not null,
  sender_id uuid references public.profiles on delete set null not null,
  sender_name text not null,
  content text not null,
  type text default 'chat'::text not null check (type in ('chat', 'roll', 'system', 'action')),
  roll_result jsonb,
  channel text default 'ON'::text not null check (channel in ('ON', 'OFF')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  sender_id uuid references public.profiles on delete cascade not null,
  table_id uuid references public.tables on delete cascade,
  title text not null,
  message text not null,
  type text default 'INVITE'::text not null check (type in ('INVITE', 'SYSTEM', 'PE_DISTRIBUTION')),
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios visualizam proprias notificacoes" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios podem criar convites" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Usuarios atualizam proprias notificacoes" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuarios deletam proprias notificacoes" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- 8. Campaign Journals Table
CREATE TABLE IF NOT EXISTS public.campaign_journals (
  id uuid default uuid_generate_v4() primary key,
  table_id uuid references public.tables on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  title text not null,
  content text not null,
  is_public boolean default false not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.campaign_journals ENABLE ROW LEVEL SECURITY;

-- 9. Table Status Conditions Table
CREATE TABLE IF NOT EXISTS public.table_status_conditions (
  id uuid default uuid_generate_v4() primary key,
  table_id uuid references public.tables on delete cascade not null,
  name text not null,
  description text,
  color_class text default 'border-slate-800 bg-slate-900/20 text-slate-400'::text not null,
  icon text default 'Shield'::text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.table_status_conditions ENABLE ROW LEVEL SECURITY;
