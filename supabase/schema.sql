-- ==============================================================================
-- SCHEMA SQL: GALERIA DE DEFENSORES ONLINE (SUPABASE / POSTGRESQL)
-- ==============================================================================

-- Habilitar a extensão para UUIDs
create extension if not exists "uuid-ossp";

-- 1. Tabela de Perfis de Usuários (profiles)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  email text,
  avatar_url text,
  about text default '' not null,
  cep text default '' not null,
  country text default '' not null,
  state text default '' not null,
  city text default '' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Sistemas de Regras Customizados (Sandbox)
-- 2. Tabela de Sistemas de Regras Customizados (Sandbox)
create table public.rule_systems (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade, -- Null para sistemas base (Alpha/Gaiden)
  name text unique not null,
  description text,
  is_active boolean default true not null,
  attributes jsonb not null, -- Atributos dinâmicos ex: F, H, R, A, PdF
  resources jsonb not null,  -- Recursos dinâmicos ex: PV, PM
  advantages jsonb default '[]'::jsonb not null, -- Catálogo de Vantagens do sistema
  disadvantages jsonb default '[]'::jsonb not null, -- Catálogo de Desvantagens do sistema
  skills jsonb default '[]'::jsonb not null, -- Catálogo de Perícias do sistema
  damage_types jsonb default '[]'::jsonb not null, -- Tipos de dano permitidos
  dice_config jsonb default '{"count": 1, "faces": 6}'::jsonb not null, -- Configuração dos dados
  is_base_system boolean default false not null, -- Impede exclusão/modificação de regras nativas
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de Mesas Multiplayer (tables)
create table public.tables (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text default '' not null,
  master_id uuid references auth.users on delete cascade not null,
  rule_system_id uuid references public.rule_systems on delete set null,
  is_private boolean default false not null,
  password text,
  rules_mod jsonb default '{}'::jsonb not null,
  custom_damage_types jsonb default '[]'::jsonb not null,
  custom_unique_advantages jsonb default '[]'::jsonb not null,
  last_visual_roll jsonb, -- Guarda o estado da última rolagem física/visual da mesa
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Relação de Jogadores na Mesa (table_players)
create table public.table_players (
  table_id uuid references public.tables on delete cascade not null,
  player_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (table_id, player_id)
);

-- 5. Tabela de Personagens (characters)
create table public.characters (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  rule_system_id uuid references public.rule_systems on delete set null,
  table_id uuid references public.tables on delete set null, -- Vinculado a uma mesa se aplicável
  name text default 'Defensor' not null,
  scale integer default 0 not null, -- 0=Ningen, 1=Sugoi, 2=Kiodai, 3=Kami
  points_total integer default 0 not null,
  points_spent integer default 0 not null,
  concept text default '' not null, -- Conceito (Mago, Guerreiro, etc)
  attributes_values jsonb not null, -- Valores de atributos { F: 2, H: 3, ... }
  resources_current jsonb not null, -- Valores de recursos { PV: 15, PM: 15 }
  advantages jsonb default '[]'::jsonb not null, -- Lista de Vantagens
  disadvantages jsonb default '[]'::jsonb not null, -- Lista de Desvantagens
  skills jsonb default '[]'::jsonb not null, -- Perícias
  specializations jsonb default '[]'::jsonb not null, -- Especializações
  spells jsonb default '[]'::jsonb not null, -- Magias
  inventory jsonb default '[]'::jsonb not null, -- Itens do inventário
  unique_advantage jsonb, -- Vantagem Única / Raça
  custom_rolls jsonb default '[]'::jsonb not null, -- Rolagens customizadas rápidas
  damage_type_forca text default 'Corte' not null,
  damage_type_pdf text default 'Corte' not null,
  saved_points integer default 0 not null,
  experience integer default 0 not null,
  annotations text default '' not null,
  is_hidden boolean default false not null,
  image_url text default '' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, name)
);

-- 6. Mensagens do Chat em Tempo Real (chat_messages)
create type public.message_type as enum ('TEXT', 'ROLL', 'SYSTEM', 'IMAGE');

create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  table_id uuid references public.tables on delete cascade not null,
  sender_id uuid references auth.users on delete cascade not null,
  sender_name text not null,
  sender_avatar text,
  image_url text,
  content text not null,
  type public.message_type default 'TEXT'::public.message_type not null,
  roll_result jsonb, -- Detalhes da rolagem
  reply_to_message_id uuid references public.chat_messages on delete set null,
  reply_to_sender_name text,
  reply_to_content text,
  reply_to_type public.message_type,
  is_edited boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Notificações do Sistema e Convites (notifications)
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  sender_id uuid references auth.users on delete set null,
  title text not null,
  message text not null,
  type text not null, -- ex: 'INVITE', 'SYSTEM'
  table_id uuid references public.tables on delete cascade,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- AUTOMATIZAÇÕES & TRIGGERS
-- ==============================================================================

-- Trigger para perfis de usuário criados automaticamente via Auth do Supabase
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Habilitar RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.rule_systems enable row level security;
alter table public.tables enable row level security;
alter table public.table_players enable row level security;
alter table public.characters enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;

-- 1. Políticas de Perfis (profiles)
create policy "Perfis visíveis para todos" on public.profiles
  for select using (true);

create policy "Usuários podem atualizar seus próprios perfis" on public.profiles
  for update using (auth.uid() = id);

-- 2. Políticas de Sistemas de Regras (rule_systems)
create policy "Sistemas de regras ativos são públicos" on public.rule_systems
  for select using (is_active = true);

create policy "Usuários gerenciam seus próprios sistemas de regras" on public.rule_systems
  for all using (auth.uid() = user_id);

-- 3. Políticas de Mesas (tables)
create policy "Membros da mesa e o mestre podem visualizar a mesa" on public.tables
  for select using (
    auth.uid() = master_id or 
    exists (
      select 1 from public.table_players 
      where table_id = id and player_id = auth.uid()
    )
  );

create policy "Apenas o mestre pode atualizar ou excluir a mesa" on public.tables
  for all using (auth.uid() = master_id);

-- 4. Políticas de Membros da Mesa (table_players)
create policy "Membros e mestre podem visualizar membros" on public.table_players
  for select using (
    auth.uid() is not null
  );

create policy "Mestre ou convidado com convite pendente podem inserir membro" on public.table_players
  for insert with check (
    exists (
      select 1 from public.tables 
      where id = table_id and master_id = auth.uid()
    ) or (
      auth.uid() = player_id and
      exists (
        select 1 from public.notifications
        where table_id = table_id and user_id = auth.uid() and type = 'INVITE' and is_read = false
      )
    )
  );

create policy "Apenas o mestre pode atualizar membros" on public.table_players
  for update using (
    exists (
      select 1 from public.tables 
      where id = table_id and master_id = auth.uid()
    )
  );

create policy "Apenas o mestre pode deletar membros" on public.table_players
  for delete using (
    exists (
      select 1 from public.tables 
      where id = table_id and master_id = auth.uid()
    )
  );

-- 5. Políticas de Personagens (characters)
create policy "Personagens públicos visíveis para todos" on public.characters
  for select using (is_hidden = false);

create policy "Usuários gerenciam seus próprios personagens" on public.characters
  for all using (auth.uid() = user_id);

-- 6. Políticas de Chat (chat_messages)
create policy "Membros da mesa podem ler mensagens" on public.chat_messages
  for select using (
    exists (
      select 1 from public.tables 
      where id = table_id and master_id = auth.uid()
    ) or
    exists (
      select 1 from public.table_players 
      where table_id = table_id and player_id = auth.uid()
    )
  );

create policy "Membros da mesa podem enviar mensagens" on public.chat_messages
  for insert with check (
    auth.uid() = sender_id and (
      exists (
        select 1 from public.tables 
        where id = table_id and master_id = auth.uid()
      ) or
      exists (
        select 1 from public.table_players 
        where table_id = table_id and player_id = auth.uid()
      )
    )
  );

create policy "Remetente pode editar ou excluir sua própria mensagem" on public.chat_messages
  for update using (auth.uid() = sender_id);

-- 7. Políticas de Notificações (notifications)
create policy "Usuários visualizam e gerenciam suas próprias notificações" on public.notifications
  for all using (auth.uid() = user_id);

create policy "Usuários podem criar convites/notificações para outros" on public.notifications
  for insert with check (auth.uid() = sender_id);

-- ==============================================================================
-- FUNÇÕES DE CONTROLE DE MESA (RPC)
-- ==============================================================================

-- Função RPC para distribuir XP em lote de forma atômica e segura
create or replace function public.distribute_xp_to_characters(
  p_table_id uuid,
  p_character_ids uuid[],
  p_xp_amount int
)
returns void as $$
declare
  v_master_id uuid;
  v_table_name text;
  v_master_username text;
  v_char record;
  v_new_xp int;
  v_extra_points int;
  v_chat_content text;
  v_char_names text[] := array[]::text[];
begin
  -- 1. Verificar se quem chama é o mestre da mesa
  select master_id, name into v_master_id, v_table_name
  from public.tables
  where id = p_table_id;
  
  if v_master_id is null or v_master_id <> auth.uid() then
    raise exception 'Apenas o mestre da mesa pode distribuir experiência.';
  end if;

  select username into v_master_username
  from public.profiles
  where id = auth.uid();

  -- 2. Atualizar cada personagem
  for v_char in 
    select id, name, user_id, coalesce(experience, 0) as experience, coalesce(saved_points, 0) as saved_points
    from public.characters
    where id = any(p_character_ids) and table_id = p_table_id
  loop
    v_new_xp := v_char.experience + p_xp_amount;
    v_extra_points := v_new_xp / 10;
    v_new_xp := v_new_xp % 10;

    update public.characters
    set 
      experience = v_new_xp,
      saved_points = saved_points + v_extra_points,
      points_total = points_total + v_extra_points,
      updated_at = now()
    where id = v_char.id;

    -- Inserir notificação para o jogador dono do personagem
    insert into public.notifications (user_id, sender_id, title, message, type, table_id, is_read)
    values (
      v_char.user_id,
      auth.uid(),
      'Experiência Recebida',
      'Você recebeu ' || p_xp_amount || ' PE(s) do Mestre na mesa "' || v_table_name || '"!',
      'SYSTEM',
      p_table_id,
      false
    );

    v_char_names := array_append(v_char_names, v_char.name);
  end loop;

  -- 3. Publicar mensagem do sistema no chat
  v_chat_content := coalesce(v_master_username, 'O Mestre') || ' distribuiu ' || p_xp_amount || ' PE(s) para os personagens: ' || array_to_string(v_char_names, ', ') || '.';
  
  insert into public.chat_messages (table_id, sender_id, sender_name, content, type)
  values (
    p_table_id,
    auth.uid(),
    coalesce(v_master_username, 'Mestre'),
    v_chat_content,
    'SYSTEM'
  );
end;
$$ language plpgsql security definer;

-- Restrições para garantir integridade física das fichas (não permitir valores negativos)
alter table public.characters
  add constraint check_saved_points_nonnegative check (saved_points >= 0),
  add constraint check_points_total_nonnegative check (points_total >= 0),
  add constraint check_experience_nonnegative check (experience >= 0);

-- 8. Tabela de Diário de Campanha (campaign_journals)
create table public.campaign_journals (
  id uuid default uuid_generate_v4() primary key,
  table_id uuid references public.tables on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  is_public boolean default false not null,
  content text default '' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_table_journal unique (table_id, user_id, is_public)
);

-- Ativar RLS
alter table public.campaign_journals enable row level security;

-- Políticas de Segurança RLS
create policy "Jogadores/mestre podem ler diários públicos e seus próprios diários privados" on public.campaign_journals
  for select using (
    (is_public = true and (
      exists (
        select 1 from public.tables 
        where id = table_id and master_id = auth.uid()
      ) or
      exists (
        select 1 from public.table_players 
        where table_id = table_id and player_id = auth.uid()
      )
    )) or
    (is_public = false and auth.uid() = user_id)
  );

create policy "Jogadores/mestre podem criar diários" on public.campaign_journals
  for insert with check (
    auth.uid() = user_id and (
      (is_public = true and exists (
        select 1 from public.tables
        where id = table_id and master_id = auth.uid()
      )) or
      (is_public = false and (
        exists (
          select 1 from public.tables 
          where id = table_id and master_id = auth.uid()
        ) or
        exists (
          select 1 from public.table_players 
          where table_id = table_id and player_id = auth.uid()
        )
      ))
    )
  );

create policy "Apenas o próprio autor pode editar/excluir seus diários" on public.campaign_journals
  for all using (
    auth.uid() = user_id
  );

-- 9. Coluna status_effects na tabela characters
alter table public.characters
  add column status_effects jsonb default '[]'::jsonb not null;

-- Política de RLS para permitir que o mestre da mesa atualize os personagens vinculados a ela
create policy "Mestre da mesa pode atualizar personagens vinculados" on public.characters
  for update using (
    exists (
      select 1 from public.tables
      where id = table_id and master_id = auth.uid()
    )
  );



