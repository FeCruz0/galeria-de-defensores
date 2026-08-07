import { createClient } from '../utils/supabase/client';
import { TableNPC } from '../types/game';
import { SupabaseClient } from '@supabase/supabase-js';

function getSupabase(customClient?: SupabaseClient) {
  return customClient || createClient();
}

export async function fetchTableNpcs(tableId: string, customClient?: SupabaseClient): Promise<TableNPC[]> {
  const supabase = getSupabase(customClient);
  const { data, error } = await supabase
    .from('table_npcs')
    .select('*')
    .eq('table_id', tableId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching table NPCs:', error);
    return [];
  }

  return (data || []) as TableNPC[];
}

export async function createNpc(npcData: Partial<TableNPC>, customClient?: SupabaseClient): Promise<{ npc: TableNPC | null; error?: string }> {
  const supabase = getSupabase(customClient);
  const { data, error } = await supabase
    .from('table_npcs')
    .insert([npcData])
    .select()
    .single();

  if (error) {
    console.error('Error creating NPC:', error);
    return { npc: null, error: error.message };
  }

  return { npc: data as TableNPC };
}

export async function updateNpc(npcId: string, updates: Partial<TableNPC>, customClient?: SupabaseClient): Promise<TableNPC | null> {
  const supabase = getSupabase(customClient);
  const { data, error } = await supabase
    .from('table_npcs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', npcId)
    .select()
    .single();

  if (error) {
    console.error('Error updating NPC:', error);
    return null;
  }

  return data as TableNPC;
}

export async function deleteNpc(npcId: string, customClient?: SupabaseClient): Promise<boolean> {
  const supabase = getSupabase(customClient);
  const { error } = await supabase
    .from('table_npcs')
    .delete()
    .eq('id', npcId);

  if (error) {
    console.error('Error deleting NPC:', error);
    return false;
  }

  return true;
}
