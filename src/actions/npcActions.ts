'use server';

import { createNpcSchema, updateNpcSchema } from '@/lib/validations/npc';
import * as npcService from '@/services/npcService';
import { createClient } from '@/utils/supabase/server';
import { checkActionRateLimit } from '@/lib/rateLimit';

export async function createNpcAction(formData: unknown) {
  const result = createNpcSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, message: 'Dados de NPC inválidos.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

  // Rate Limiting
  if (!(await checkActionRateLimit(user.id, 'npc-actions', 10, 60000))) {
    return { success: false, message: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
  }

  // Security check: Only master can create NPCs for this table
  const { data: table } = await supabase
    .from('tables')
    .select('master_id')
    .eq('id', result.data.table_id)
    .maybeSingle();

  if (!table || table.master_id !== user.id) {
    return { success: false, message: 'Acesso não autorizado. Apenas o mestre pode gerenciar NPCs.' };
  }

  const res = await npcService.createNpc(result.data, supabase);
  if (res.error || !res.npc) {
    return { success: false, message: res.error || 'Falha ao criar NPC no servidor.' };
  }

  return { success: true, npc: res.npc };
}

export async function updateNpcAction(npcId: string, updates: unknown) {
  if (!npcId) {
    return { success: false, message: 'ID do NPC é obrigatório.' };
  }

  const result = updateNpcSchema.safeParse(updates);
  if (!result.success) {
    return { success: false, message: 'Dados de atualização inválidos.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

  // Rate Limiting
  if (!(await checkActionRateLimit(user.id, 'npc-actions', 10, 60000))) {
    return { success: false, message: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
  }

  // Security check: Only master can update NPCs
  const { data: npc } = await supabase
    .from('table_npcs')
    .select('table_id')
    .eq('id', npcId)
    .maybeSingle();

  if (!npc) {
    return { success: false, message: 'NPC não encontrado.' };
  }

  const { data: table } = await supabase
    .from('tables')
    .select('master_id')
    .eq('id', npc.table_id)
    .maybeSingle();

  if (!table || table.master_id !== user.id) {
    return { success: false, message: 'Acesso não autorizado.' };
  }

  const updatedNpc = await npcService.updateNpc(npcId, result.data, supabase);
  if (!updatedNpc) {
    return { success: false, message: 'Falha ao atualizar NPC.' };
  }

  return { success: true, npc: updatedNpc };
}

export async function deleteNpcAction(npcId: string) {
  if (!npcId) {
    return { success: false, message: 'ID do NPC é obrigatório.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

  // Rate Limiting
  if (!(await checkActionRateLimit(user.id, 'npc-actions', 10, 60000))) {
    return { success: false, message: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
  }

  // Security check: Only master can delete NPCs
  const { data: npc } = await supabase
    .from('table_npcs')
    .select('table_id')
    .eq('id', npcId)
    .maybeSingle();

  if (!npc) {
    return { success: false, message: 'NPC não encontrado.' };
  }

  const { data: table } = await supabase
    .from('tables')
    .select('master_id')
    .eq('id', npc.table_id)
    .maybeSingle();

  if (!table || table.master_id !== user.id) {
    return { success: false, message: 'Acesso não autorizado.' };
  }

  const ok = await npcService.deleteNpc(npcId, supabase);
  return { success: ok, message: ok ? undefined : 'Falha ao excluir NPC.' };
}
