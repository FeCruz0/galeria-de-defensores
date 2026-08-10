import { supabase as staticSupabase } from '../lib/supabase';
import { Profile } from '../types/game';
import { SupabaseClient } from '@supabase/supabase-js';

function getSupabase(customClient?: SupabaseClient) {
  return customClient || staticSupabase;
}

export async function fetchProfileById(userId: string, customClient?: SupabaseClient): Promise<Profile | null> {
  const supabase = getSupabase(customClient);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data as Profile;
}

export async function updateProfile(
  userId: string, 
  updates: Partial<Profile>, 
  customClient?: SupabaseClient
): Promise<Profile | null> {
  const supabase = getSupabase(customClient);
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }
  return data as Profile;
}

export async function uploadAvatar(
  userId: string,
  file: File,
  customClient?: SupabaseClient
): Promise<string | null> {
  const supabase = getSupabase(customClient);
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('Error uploading avatar file:', uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
