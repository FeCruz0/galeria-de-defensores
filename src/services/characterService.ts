import { supabase } from '../lib/supabase';
import { Character } from '../types/game';

export async function fetchCharacterById(id: string): Promise<Character | null> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching character by id:', error);
    return null;
  }
  return data as Character;
}

export async function fetchUserCharacters(userId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user characters:', error);
    return [];
  }
  return (data || []) as Character[];
}

export async function createCharacter(characterData: Partial<Character>): Promise<Character | null> {
  const { data, error } = await supabase
    .from('characters')
    .insert([characterData])
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error creating character:', error);
    return null;
  }
  return data as Character;
}

export async function updateCharacter(id: string, updates: Partial<Character>): Promise<Character | null> {
  const { data, error } = await supabase
    .from('characters')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error updating character:', error);
    return null;
  }
  return data as Character;
}

export async function deleteCharacter(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting character:', error);
    return false;
  }
  return true;
}
