import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const isValidUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

  const supabaseUrl = isValidUrl ? rawUrl : 'https://placeholder-project.supabase.co';
  const supabaseAnonKey = rawKey || 'placeholder-key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
