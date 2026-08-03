import { supabase } from '../lib/supabase';
import { Table, Character } from '../types/game';

export async function fetchTableById(id: string): Promise<Table | null> {
  const { data, error } = await supabase
    .from('tables')
    .select('*, rule_systems(name)')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching table by id:', error);
    return null;
  }
  return data as Table;
}

export async function fetchUserTables(userId: string): Promise<Table[]> {
  const { data, error } = await supabase
    .from('tables')
    .select('*, rule_systems(name)')
    .or(`master_id.eq.${userId},table_players.player_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user tables:', error);
    return [];
  }
  return (data || []) as Table[];
}

export async function createTable(tableData: Partial<Table>): Promise<Table | null> {
  const { data, error } = await supabase
    .from('tables')
    .insert([tableData])
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error creating table:', error);
    return null;
  }
  return data as Table;
}

export async function updateTable(id: string, updates: Partial<Table>): Promise<Table | null> {
  const { data, error } = await supabase
    .from('tables')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error updating table:', error);
    return null;
  }
  return data as Table;
}

export async function fetchTableCharacters(tableId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('table_id', tableId);

  if (error) {
    console.error('Error fetching table characters:', error);
    return [];
  }
  return (data || []) as Character[];
}

export async function distributeExperience(characterIds: string[], xpAmount: number): Promise<boolean> {
  if (!characterIds.length || xpAmount <= 0) return false;

  try {
    const { error } = await supabase.rpc('distribute_xp_to_characters', {
      target_ids: characterIds,
      xp_amount: xpAmount
    });

    if (error) {
      console.error('Error calling distribute_xp_to_characters RPC:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('RPC distribution error:', err);
    return false;
  }
}
