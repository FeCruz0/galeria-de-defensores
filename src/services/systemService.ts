import { supabase } from '../lib/supabase';
import { RuleSystem } from '../types/game';

export async function fetchActiveSystems(): Promise<RuleSystem[]> {
  const { data, error } = await supabase
    .from('rule_systems')
    .select('*')
    .eq('is_active', true)
    .order('is_base_system', { ascending: false });

  if (error) {
    console.error('Error fetching active rule systems:', error);
    return [];
  }
  return (data || []) as RuleSystem[];
}

export async function fetchSystemById(id: string): Promise<RuleSystem | null> {
  const { data, error } = await supabase
    .from('rule_systems')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching rule system by id:', error);
    return null;
  }
  return data as RuleSystem;
}

export async function createCustomSystem(systemData: Partial<RuleSystem>): Promise<RuleSystem | null> {
  const { data, error } = await supabase
    .from('rule_systems')
    .insert([systemData])
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error creating custom rule system:', error);
    return null;
  }
  return data as RuleSystem;
}

export async function updateCustomSystem(id: string, updates: Partial<RuleSystem>): Promise<RuleSystem | null> {
  const { data, error } = await supabase
    .from('rule_systems')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error updating custom rule system:', error);
    return null;
  }
  return data as RuleSystem;
}

export async function deleteCustomSystem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('rule_systems')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting custom rule system:', error);
    return false;
  }
  return true;
}
