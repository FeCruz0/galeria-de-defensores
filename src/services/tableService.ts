import { supabase } from '../lib/supabase';
import { Table, Character, TablePlayer } from '../types/game';

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

export async function fetchAllPublicTables(): Promise<(Table & { player_count?: number })[]> {
  const { data, error } = await supabase
    .from('tables')
    .select('*, rule_systems(name), table_players(player_id, role)')
    .eq('is_private', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching public tables:', error);
    return [];
  }

  return (data || []).map((table: any) => {
    const activePlayers = (table.table_players || []).filter((p: any) => p.role === 'player').length;
    return {
      ...table,
      player_count: activePlayers,
    };
  });
}

export async function fetchTableMembers(tableId: string): Promise<TablePlayer[]> {
  const { data, error } = await supabase
    .from('table_players')
    .select('table_id, player_id, role, created_at, profiles(username, avatar_url)')
    .eq('table_id', tableId);

  if (error) {
    console.error('Error fetching table members:', error);
    return [];
  }

  return (data || []) as TablePlayer[];
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

export async function joinTable(
  tableId: string,
  userId: string,
  preferredRole: 'player' | 'spectator' = 'player'
): Promise<{ success: boolean; role: 'player' | 'spectator'; message?: string }> {
  // 1. Obter informações da mesa e contagem de jogadores
  const table = await fetchTableById(tableId);
  if (!table) {
    return { success: false, role: preferredRole, message: 'Mesa não encontrada.' };
  }

  const members = await fetchTableMembers(tableId);
  const existingMember = members.find(m => m.player_id === userId);
  if (existingMember) {
    return { success: true, role: existingMember.role, message: 'Você já faz parte desta mesa.' };
  }

  const activePlayersCount = members.filter(m => m.role === 'player').length;
  const maxLimit = table.max_players ?? 4;

  let assignedRole = preferredRole;
  if (preferredRole === 'player' && activePlayersCount >= maxLimit) {
    if (table.allow_spectators ?? true) {
      assignedRole = 'spectator';
    } else {
      return { success: false, role: 'player', message: 'A mesa atingiu o limite de jogadores e não aceita mais espectadores.' };
    }
  }

  const { error } = await supabase
    .from('table_players')
    .insert([{ table_id: tableId, player_id: userId, role: assignedRole }]);

  if (error) {
    console.error('Error joining table:', error);
    return { success: false, role: assignedRole, message: 'Erro ao ingressar na mesa.' };
  }

  return { success: true, role: assignedRole };
}

export async function updateMemberRole(
  tableId: string,
  playerId: string,
  newRole: 'player' | 'spectator'
): Promise<{ success: boolean; message?: string }> {
  if (newRole === 'player') {
    const table = await fetchTableById(tableId);
    const members = await fetchTableMembers(tableId);
    const activePlayersCount = members.filter(m => m.player_id !== playerId && m.role === 'player').length;
    const maxLimit = table?.max_players ?? 4;

    if (activePlayersCount >= maxLimit) {
      return { success: false, message: `Limite de ${maxLimit} jogadores atingido. Não é possível promover este membro a jogador.` };
    }
  }

  const { error } = await supabase
    .from('table_players')
    .update({ role: newRole })
    .eq('table_id', tableId)
    .eq('player_id', playerId);

  if (error) {
    console.error('Error updating member role:', error);
    return { success: false, message: 'Erro ao atualizar o cargo do membro.' };
  }

  return { success: true };
}

export async function kickTableMember(tableId: string, playerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('table_players')
    .delete()
    .eq('table_id', tableId)
    .eq('player_id', playerId);

  if (error) {
    console.error('Error kicking table member:', error);
    return false;
  }
  return true;
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
