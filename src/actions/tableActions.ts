'use server';

import { createTableSchema, updateTableSettingsSchema, updateMemberRoleSchema } from '@/lib/validations/table';
import * as tableService from '@/services/tableService';

export async function createTableAction(formData: unknown) {
  const result = createTableSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  const newTable = await tableService.createTable(result.data);
  if (!newTable) {
    return { success: false, error: 'Falha ao criar mesa de jogo no servidor.' };
  }

  return { success: true, table: newTable };
}

export async function updateTableSettingsAction(tableId: string, updates: unknown) {
  const result = updateTableSettingsSchema.safeParse(updates);
  if (!result.success) {
    return { success: false, message: 'Configurações de mesa inválidas.' };
  }

  const updated = await tableService.updateTable(tableId, result.data);
  if (!updated) {
    return { success: false, message: 'Falha ao atualizar configurações da mesa.' };
  }

  return { success: true, table: updated };
}

export async function updateMemberRoleAction(data: unknown) {
  const result = updateMemberRoleSchema.safeParse(data);
  if (!result.success) {
    return { success: false, message: 'Payload de atualização de cargo inválido.' };
  }

  const res = await tableService.updateMemberRole(result.data.table_id, result.data.player_id, result.data.role);
  return res;
}

export async function joinTableAction(tableId: string, userId: string, preferredRole: 'player' | 'spectator' = 'player') {
  if (!tableId || !userId) {
    return { success: false, message: 'Dados incompletos para ingressar na mesa.' };
  }

  return await tableService.joinTable(tableId, userId, preferredRole);
}

export async function kickTableMemberAction(tableId: string, playerId: string) {
  if (!tableId || !playerId) {
    return { success: false, message: 'Dados incompletos.' };
  }

  const ok = await tableService.kickTableMember(tableId, playerId);
  return { success: ok };
}
