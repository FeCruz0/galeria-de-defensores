'use server';

import { createNpcSchema, updateNpcSchema } from '@/lib/validations/npc';
import * as npcService from '@/services/npcService';
import { createClient } from '@/utils/supabase/server';

export async function createNpcAction(formData: unknown) {
  const result = createNpcSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, message: 'Dados de NPC inválidos.' };
  }

  const supabase = await createClient();
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
  const npc = await npcService.updateNpc(npcId, result.data, supabase);
  if (!npc) {
    return { success: false, message: 'Falha ao atualizar NPC.' };
  }

  return { success: true, npc };
}

export async function deleteNpcAction(npcId: string) {
  if (!npcId) {
    return { success: false, message: 'ID do NPC é obrigatório.' };
  }

  const supabase = await createClient();
  const ok = await npcService.deleteNpc(npcId, supabase);
  return { success: ok, message: ok ? undefined : 'Falha ao excluir NPC.' };
}
