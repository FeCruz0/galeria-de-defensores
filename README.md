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
- **Secure Row Level Security (RLS)**: Secure policies on all tables ensuring players can only see and write what they own.
- **Unit Testing**: Suite of unit tests covering the rules calculation engine, validations, and custom roll constraints.

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
   ```

## Running Tests

To run the unit tests:
```bash
npx vitest run
```

## License

This project is licensed under the MIT License.
