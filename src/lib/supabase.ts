import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isValidUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');

const supabaseUrl = isValidUrl ? rawUrl : 'https://placeholder-project.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-key';

if (!isValidUrl) {
  console.warn('Supabase URL or Anon Key is missing or invalid. Ensure .env.local is configured.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
