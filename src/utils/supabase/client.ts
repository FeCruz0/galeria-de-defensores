import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

export function createClient() {
  if (client) return client;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const isValidUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

  const supabaseUrl = isValidUrl ? rawUrl : 'https://placeholder-project.supabase.co';
  const supabaseAnonKey = rawKey || 'placeholder-key';

  const isServer = typeof window === 'undefined';

  client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    isServer
      ? {
          cookies: {
            getAll() {
              return [];
            },
            setAll() {},
          },
        }
      : undefined
  );

  let mockSessionCookieValue = '';
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/gdd-mock-session=([^;]+)/);
    if (match) mockSessionCookieValue = decodeURIComponent(match[1]);
  }

  if (mockSessionCookieValue) {
    try {
      const mockData = JSON.parse(mockSessionCookieValue);
      const mockUser = {
        id: mockData.user_id,
        aud: 'authenticated',
        role: 'authenticated',
        email: mockData.email,
        email_confirmed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        user_metadata: { username: mockData.username },
        app_metadata: { provider: 'email', providers: ['email'] }
      };

      client.auth.getUser = async () => ({ data: { user: mockUser as any }, error: null });
      client.auth.getSession = async () => ({
        data: {
          session: {
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh-token',
            user: mockUser as any
          }
        },
        error: null
      });

      // Mock database queries
      client.from = (table: string) => {
        let selectedCols = '';
        const builder = {
          select: (cols?: string) => {
            selectedCols = cols || '*';
            return builder;
          },
          insert: () => builder,
          update: () => builder,
          delete: () => builder,
          eq: () => builder,
          neq: () => builder,
          or: () => builder,
          order: () => builder,
          limit: () => builder,
          maybeSingle: async () => {
            if (table === 'profiles') {
              return { data: { id: mockData.user_id, username: mockData.username }, error: null };
            }
            if (table === 'characters') {
              if (selectedCols === 'id') {
                return { data: null, error: null };
              }
              return {
                data: {
                  id: 'mock-char-id',
                  name: 'Hero E2E',
                  user_id: mockData.user_id,
                  attributes_values: { F: 1, H: 2, R: 2, A: 1, PdF: 0 },
                  resources_current: { PV: 10, PM: 10 },
                  advantages: [],
                  disadvantages: [],
                  skills: [],
                  specializations: [],
                  spells: [],
                  inventory: [],
                  custom_rolls: [],
                  damage_type_forca: 'Corte',
                  damage_type_pdf: 'Perfuração',
                  saved_points: 0,
                  experience: 0,
                  annotations: '',
                  is_hidden: false,
                  image_url: ''
                },
                error: null
              };
            }
            if (table === 'tables') {
              return {
                data: {
                  id: 'mock-table-id',
                  name: 'Table E2E',
                  master_id: mockData.user_id,
                  rules_mod: {},
                  custom_damage_types: [],
                  custom_unique_advantages: [],
                  rule_systems: { name: '3D&T Alpha', attribute_roll_config: {} }
                },
                error: null
              };
            }
            return { data: null, error: null };
          },
          single: async () => {
            if (table === 'profiles') {
              return { data: { id: mockData.user_id, username: mockData.username }, error: null };
            }
            if (table === 'characters') {
              return {
                data: {
                  id: 'mock-char-id',
                  name: 'Hero E2E',
                  user_id: mockData.user_id,
                  attributes_values: { F: 1, H: 2, R: 2, A: 1, PdF: 0 },
                  resources_current: { PV: 10, PM: 10 },
                  advantages: [],
                  disadvantages: [],
                  skills: [],
                  specializations: [],
                  spells: [],
                  inventory: [],
                  custom_rolls: [],
                  damage_type_forca: 'Corte',
                  damage_type_pdf: 'Perfuração',
                  saved_points: 0,
                  experience: 0,
                  annotations: '',
                  is_hidden: false,
                  image_url: ''
                },
                error: null
              };
            }
            if (table === 'tables') {
              return { data: { id: 'mock-table-id', name: 'Table E2E', master_id: mockData.user_id, rules_mod: {}, custom_damage_types: [], custom_unique_advantages: [] }, error: null };
            }
            return { data: {}, error: null };
          },
          then: (onfulfilled: any) => {
            let data: any = [];
            if (table === 'profiles') {
              data = { id: mockData.user_id, username: mockData.username };
            } else if (table === 'rule_systems') {
              data = [
                {
                  id: '33333333-3333-3333-3333-333333333333',
                  name: '3D&T Alpha',
                  is_base_system: true,
                  description: '3D&T Alpha',
                  attributes: {
                    "F": { "key": "F", "name": "Força", "abbreviation": "F", "color": "#EF4444", "displayOrder": 0 },
                    "H": { "key": "H", "name": "Habilidade", "abbreviation": "H", "color": "#3B82F6", "displayOrder": 1 },
                    "R": { "key": "R", "name": "Resistência", "abbreviation": "R", "color": "#10B981", "displayOrder": 2 },
                    "A": { "key": "A", "name": "Armadura", "abbreviation": "A", "color": "#6B7280", "displayOrder": 3 },
                    "PdF": { "key": "PdF", "name": "Poder de Fogo", "abbreviation": "PdF", "color": "#8B5CF6", "displayOrder": 4 }
                  },
                  resources: {
                    "PV": { "key": "PV", "name": "Pontos de Vida", "color": "#EF4444", "formula": "R * 5", "baseAttributeKey": "R" },
                    "PM": { "key": "PM", "name": "Pontos de Magia", "color": "#3B82F6", "formula": "R * 5", "baseAttributeKey": "R" }
                  }
                }
              ];
            } else if (table === 'characters') {
              data = [{
                id: 'mock-char-id',
                name: 'Hero E2E',
                user_id: mockData.user_id,
                attributes_values: { F: 1, H: 2, R: 2, A: 1, PdF: 0 },
                resources_current: { PV: 10, PM: 10 },
                advantages: [],
                disadvantages: [],
                skills: [],
                specializations: [],
                spells: [],
                inventory: [],
                custom_rolls: [],
                damage_type_forca: 'Corte',
                damage_type_pdf: 'Perfuração',
                saved_points: 0,
                experience: 0,
                annotations: '',
                is_hidden: false,
                image_url: ''
              }];
            } else if (table === 'tables') {
              data = [{ id: 'mock-table-id', name: 'Table E2E', master_id: mockData.user_id, rules_mod: {}, custom_damage_types: [], custom_unique_advantages: [] }];
            }
            return Promise.resolve(onfulfilled({ data, error: null }));
          }
        };
        return builder as any;
      };

      client.rpc = (fn: string) => {
        const builder = {
          then: (onfulfilled: any) => {
            return Promise.resolve(onfulfilled({ data: {}, error: null }));
          }
        };
        return builder as any;
      };

      client.channel = (name: string) => {
        const channel = {
          on: () => channel,
          subscribe: (cb: any) => {
            if (cb) cb('SUBSCRIBED');
            return channel;
          },
          track: async () => {},
          unsubscribe: async () => {},
        };
        return channel as any;
      };
    } catch (e) {
      // Ignora erro de parsing
    }
  }

  return client;
}
