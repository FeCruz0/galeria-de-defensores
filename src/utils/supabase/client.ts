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
  return client;
}
