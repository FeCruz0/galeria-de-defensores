# Galeria de Defensores

Galeria de Defensores is a fullstack web application designed for managing character sheets, editing custom RPG systems (Sandbox), and playing multiplayer sessions for the 3D&T Alpha / Gaiden RPG systems. Built with **Next.js, TypeScript, Tailwind CSS, and Supabase**.

## Features

- **Character Management**: Create, edit, and manage character sheets with automatic bonus, scale configurations, and experience points conversions.
- **Dynamic Rules & Sandbox**: Define custom attributes and resources. Import and export system configurations via JSON.
- **Dynamic Resources Engine**: Any custom resource (e.g. PV, PM, or custom counters like PT) is dynamically rendered on the sheet, automatically calculating its maximum limit using its mathematical formula (e.g., `R * 5`, `T * 3`) and attributes values, with quick `+/-1` and `+/-5` interactive adjustment buttons.
- **Interactive Damage Types Card**: Select separate damage types for Force (Melee) and Fire Power (Ranged) dynamically fetched from the rules system options, positioned directly under the attribute controls for high visibility.
- **Dynamic layout for Qualities**: Qualities (Advantages/Disadvantages, Skills, and Specializations) are rendered as horizontal full-width panels stacked vertically. Each section dynamically wraps items inside a responsive sub-grid layout (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), maximizing spatial utilization.
- **Inline Modifier Badges**: Modular advantages and disadvantages display their selected sub-modifiers inline (e.g., `"Ataque Especial: Amplo, Teleguiado"`), facilitating readability without opening details.
- **Vantagem Única Dynamic Catalog**: Resolves system-specific catalogs dynamically: displays generic customizable categories (Humano, Semi-Humano, Youkai, Construto, Morto-Vivo) for 3DeT Gaiden, and detailed races for 3D&T Alpha.
- **Collapsible Ability Creator**: The Add Ability form is collapsed by default, featuring a togglable header button to maximize vertical viewing room.
- **3D Virtual Dice Roller**: Real-time 3D CSS dice rolling animation overlay that simulates d6 physics and bounces on the screen, showing glowing total summaries before resolving rolls in multiplayer tables or character sheet pages.
- **Multi-Component Custom Rolls**: Build advanced custom rolls with multiple dice pools (e.g., `1d6 + 1d20 - 1d4`), assign action type classifications (Attack, Defense, Magic, Test, Initiative), set PM costs, and automatically deduct PM resources on execution.
- **Multiplayer Invitation System**: Table masters can invite players by username, triggering interactive notifications on the recipient's dashboard to accept or decline.
- **Interactive Advantages & Disadvantages Details**: Clickable info indicators next to Vantagem Única choices open rich glassmorphic overlays summarizing costs, requirements, and constraints with a built-in click-outside listener.
- **Complete 3DeT Gaiden Catalog**: Fully synchronized database of 57 advantages, 30 disadvantages, and 12 skills complete with modular option sub-modifiers matching the legacy rules client.
- **Deletion Controls**: Direct deletion buttons on the dashboard for characters, tables (if user is master, utilizing PostgreSQL cascade cleanup), custom rule systems, and a quick table-leaving button for players.
- **Uniqueness Validations**: Client and database constraints preventing duplicate character names under the same user, and preventing duplicate rule system names.
- **Debounced Autosave**: Automatic background synchronization to the Supabase database.
- **Multiplayer Tables**: Live RPG tables with chat connection, real-time message sync, fast quick-sheet drawers, and real-time dice rolls output to the chat.
- **Multiplayer Experience Distribution (PEs)**: Table masters can distribute Experience Points (PEs) to selected active characters in the session simultaneously, with real-time updates and notification banners.
- **Shared Campaign Journal**: Includes a public section (editable only by the GM, visible to players in real-time) and private personal note sections for players to document notes and logs.
- **Status & Temporary Condition Modifiers**: Interactive toggle grid on quick sheet drawer supporting rules-integrated effects like *Defendendo* (doubles armor in defense rolls), *Indefeso* (sets H and A to 0, sets FD to 0), and *Paralisado* (sets H to 0 for tests and dodges).
- **Equippable Inventory & Modifiers**: Supporting weapons, shields, and armor that dynamically modify attributes, PV/PM maximums, and active status indicators.
- **Custom Status Conditions (CRUD)**: Table GMs can create and delete custom status conditions specific to their tables, selecting custom Lucide icons and Tailwind colors. Players can toggle these custom status indicators on their characters in real-time.
- **Lobby Chat & Realtime Broadcast**: Global real-time lobby chat connected via Supabase Realtime with dynamic slowmode rate limits proportional to message size.
- **Friends & Direct Messages (DMs)**: Friendships system (request, accept, decline, search users by ID/username) with private real-time direct messaging.
- **Public Tables Explorer & Spectator Mode**: Global public tables exploration tab in Dashboard under "Mesas de Jogo", customizable player limits (`max_players`), passive read-only Spectator Mode in VTT session, real-time online presence tracking (Supabase Presence), and GM moderation controls (Promote, Demote, Kick/Ban).
- **Ink-Saving A4 Print & PDF Export**: Highly optimized classic black-and-white high-contrast printable A4 sheet layout for characters, automatically hiding dark-themed interactive screen layouts (`print:hidden`) and displaying a cleanly structured printable view containing all attributes, bonuses, qualities, spells, and equipment list.
- **Secure Row Level Security (RLS)**: Secure policies on all tables ensuring players can only see and write what they own.
- **Unit Testing**: Suite of unit tests covering the rules calculation engine, validations, custom roll constraints, and service layer abstractions.

## Tech Stack

1. **Frontend & Backend (API)**: Next.js (App Router) + TypeScript + React
2. **Styling & Typography**: Tailwind CSS + Lucide Icons + Google Fonts Outfit (sans-serif)
3. **Database & Realtime**: Supabase (PostgreSQL, Row Level Security - RLS, and Realtime replication)
4. **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Set up the environment variables:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

2. Run the application (choose option A or B):

   **Option A: Running Locally with npm**
   - Install dependencies:
     ```bash
     npm install
     ```
   - Run the development server:
     ```bash
     npm run dev
     ```

   **Option B: Running with Docker (Recommended for testing)**
   - Start the container:
     ```bash
     docker compose up --build
     ```

3. Open [http://localhost:3000](http://localhost:3000) to view the application.

## Database Setup & Migrations

1. Execute the base SQL script in [supabase/schema.sql](supabase/schema.sql) using the SQL Editor in your Supabase dashboard. It sets up all the tables, relations, triggers, and Row Level Security (RLS) policies.
2. If you are updating an existing database setup, execute the following SQL migration script to add the new catalog columns, scale constraints, notifications policy, uniqueness checks, and reload the schema cache:
   ```sql
   -- 1. Make user_id optional in rule_systems (for native systems)
   ALTER TABLE public.rule_systems ALTER COLUMN user_id DROP NOT NULL;

   -- 2. Add catalog columns to rule_systems
   ALTER TABLE public.rule_systems 
     ADD COLUMN IF NOT EXISTS advantages jsonb default '[]'::jsonb not null,
     ADD COLUMN IF NOT EXISTS disadvantages jsonb default '[]'::jsonb not null,
     ADD COLUMN IF NOT EXISTS skills jsonb default '[]'::jsonb not null,
     ADD COLUMN IF NOT EXISTS damage_types jsonb default '[]'::jsonb not null,
     ADD COLUMN IF NOT EXISTS dice_config jsonb default '{"count": 1, "faces": 6}'::jsonb not null,
     ADD COLUMN IF NOT EXISTS is_base_system boolean default false not null;

   -- 3. Add scale column to characters
   ALTER TABLE public.characters 
     ADD COLUMN IF NOT EXISTS scale integer default 0 not null;

   -- 4. Enable RLS policy for sending invitations (insert notifications)
   CREATE POLICY "Usuários podem criar convites/notificações para outros" ON public.notifications
     FOR INSERT WITH CHECK (auth.uid() = sender_id);

   -- 5. Add unique constraints for rule systems and character names per user
   ALTER TABLE public.rule_systems 
     ADD CONSTRAINT rule_systems_name_unique UNIQUE (name);

   ALTER TABLE public.characters 
     ADD CONSTRAINT characters_user_id_name_unique UNIQUE (user_id, name);

    -- 6. Reload PostgREST schema cache
    NOTIFY pgrst, 'reload schema';

    -- 7. Add status_effects column and RLS update policy for GM on characters table
    ALTER TABLE public.characters
      ADD COLUMN IF NOT EXISTS status_effects jsonb default '[]'::jsonb not null;

    CREATE POLICY "Mestre da mesa pode atualizar personagens vinculados" ON public.characters
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.tables
          WHERE id = table_id AND master_id = auth.uid()
        )
      );

    -- 8. Create table_status_conditions table and policies
    CREATE TABLE IF NOT EXISTS public.table_status_conditions (
      id uuid default uuid_generate_v4() primary key,
      table_id uuid references public.tables on delete cascade not null,
      name text not null,
      description text,
      color_class text default 'border-slate-800 bg-slate-900/20 text-slate-400' not null,
      icon text default 'Shield' not null,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
    );

    ALTER TABLE public.table_status_conditions enable row level security;

    CREATE POLICY "Membros da mesa podem visualizar condições customizadas" ON public.table_status_conditions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.tables 
          WHERE id = table_id AND master_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.table_players 
          WHERE table_id = table_id AND player_id = auth.uid()
        )
      );

    CREATE POLICY "Apenas o mestre gerencia condições customizadas" ON public.table_status_conditions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.tables
          WHERE id = table_id AND master_id = auth.uid()
        )
      );

    -- 9. Secure PL/pgSQL block to safely enable Supabase Realtime tracking for all tables
    DO $$
    DECLARE
      pub_exists boolean;
    BEGIN
      SELECT exists(SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') INTO pub_exists;
      
      IF pub_exists THEN
        -- Adiciona chat_messages se não estiver na publicação
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_rel pr
          JOIN pg_class c ON pr.prrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
          AND n.nspname = 'public'
          AND c.relname = 'chat_messages'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD table public.chat_messages;
        END IF;

        -- Adiciona characters se não estiver na publicação
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_rel pr
          JOIN pg_class c ON pr.prrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
          AND n.nspname = 'public'
          AND c.relname = 'characters'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD table public.characters;
        END IF;

        -- Adiciona campaign_journals se não estiver na publicação
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_rel pr
          JOIN pg_class c ON pr.prrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
          AND n.nspname = 'public'
          AND c.relname = 'campaign_journals'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD table public.campaign_journals;
        END IF;

        -- Adiciona table_status_conditions se não estiver na publicação
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_rel pr
          JOIN pg_class c ON pr.prrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
          AND n.nspname = 'public'
          AND c.relname = 'table_status_conditions'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD table public.table_status_conditions;
        END IF;
      END IF;
    END $$;

    -- 10. Phase 11 Migrations: Social Tables, Spectator Roles, and Player Limits
    ALTER TABLE public.tables 
      ADD COLUMN IF NOT EXISTS max_players integer DEFAULT 4 NOT NULL CHECK (max_players >= 1 AND max_players <= 20),
      ADD COLUMN IF NOT EXISTS allow_spectators boolean DEFAULT true NOT NULL;

    ALTER TABLE public.table_players 
      ADD COLUMN IF NOT EXISTS role text DEFAULT 'player' NOT NULL CHECK (role IN ('player', 'spectator'));
   ```

## Running Tests

To run the unit tests:
```bash
npx vitest run
```

## License

This project is licensed under the MIT License.
