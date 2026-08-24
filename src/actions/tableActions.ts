'use server';

import { createTableSchema, updateTableSettingsSchema, updateMemberRoleSchema } from '@/lib/validations/table';
import * as tableService from '@/services/tableService';
import { createClient } from '../utils/supabase/server';
import { checkActionRateLimit } from '@/lib/rateLimit';
import { createSafeAction } from '@/lib/actionWrapper';

export const createTableAction = createSafeAction(
  createTableSchema,
  async (data, { user, supabase }) => {
    const newTable = await tableService.createTable({
      ...data,
      master_id: user.id
    }, supabase);

    if (!newTable) {
      return { success: false, error: 'Falha ao criar mesa de jogo no servidor.' };
    }

    return { success: true, table: newTable, data: newTable };
  },
  { requireAuth: true, rateLimitKey: 'table-actions', rateLimitMax: 10 }
);

export async function updateTableSettingsAction(tableId: string, updates: unknown) {
  const result = updateTableSettingsSchema.safeParse(updates);
  if (!result.success) {
    return { success: false, message: 'Configurações de mesa inválidas.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

  // Rate Limiting
  if (!(await checkActionRateLimit(user.id, 'table-actions', 10, 60000))) {
    return { success: false, message: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
  }

  // Security check: only master can update table settings
  const table = await tableService.fetchTableById(tableId, supabase);
  if (!table || table.master_id !== user.id) {
    return { success: false, message: 'Acesso não autorizado. Apenas o mestre pode alterar as configurações.' };
  }

  const updated = await tableService.updateTable(tableId, result.data, supabase);
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

  // Rate Limiting
  if (!(await checkActionRateLimit(user.id, 'table-actions', 10, 60000))) {
    return { success: false, message: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
  }

  // Security check: only master can update roles
  const table = await tableService.fetchTableById(result.data.table_id, supabase);
  if (!table || table.master_id !== user.id) {
    return { success: false, message: 'Acesso não autorizado. Apenas o mestre pode gerenciar cargos.' };
  }

  const res = await tableService.updateMemberRole(result.data.table_id, result.data.player_id, result.data.role, supabase);
  return res;
}

export async function joinTableAction(
  tableId: string,
  preferredRole: 'player' | 'spectator' = 'player',
  password?: string
) {
  if (!tableId) {
    return { success: false, message: 'Dados incompletos para ingressar na mesa.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

  // Rate Limiting
  if (!(await checkActionRateLimit(user.id, 'table-actions', 10, 60000))) {
    return { success: false, message: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
  }

  return await tableService.joinTable(tableId, user.id, preferredRole, password, supabase);
}

export async function kickTableMemberAction(tableId: string, playerId: string) {
  if (!tableId || !playerId) {
    return { success: false, message: 'Dados incompletos.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

  // Rate Limiting
  if (!(await checkActionRateLimit(user.id, 'table-actions', 10, 60000))) {
    return { success: false, message: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
  }

  // Security check: only master can kick members
  const table = await tableService.fetchTableById(tableId, supabase);
  if (!table || table.master_id !== user.id) {
    return { success: false, message: 'Acesso não autorizado. Apenas o mestre pode expulsar membros.' };
  }

  const ok = await tableService.kickTableMember(tableId, playerId, supabase);
  return { success: ok };
}
