'use server';

import { 
  sendFriendRequestSchema, 
  respondFriendRequestSchema, 
  sendDirectMessageSchema 
} from '../lib/validations/social';
import { 
  searchUserProfile, 
  sendFriendRequest, 
  updateFriendshipStatus, 
  deleteFriendship, 
  sendDirectMessage,
  Friendship,
  DirectMessage 
} from '../services/socialService';
import { createClient } from '../utils/supabase/server';
import { checkActionRateLimit } from '../lib/rateLimit';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function sendFriendRequestAction(rawPayload: unknown): Promise<ActionResult<Friendship>> {
  const parsed = sendFriendRequestSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
    return { success: false, error: errorMsg };
  }

  const { targetInput } = parsed.data;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  // Rate Limiting
  if (!(await checkActionRateLimit(user.id, 'social-actions', 10, 60000))) {
    return { success: false, error: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
  }

  // Search user profile by username or id
  const targetUser = await searchUserProfile(targetInput, supabase);
  if (!targetUser) {
    return { success: false, error: 'Usuário não encontrado' };
  }

  if (targetUser.id === user.id) {
    return { success: false, error: 'Você não pode enviar uma solicitação para si mesmo' };
  }

  const friendship = await sendFriendRequest(user.id, targetUser.id, supabase);
  if (!friendship) {
    return { success: false, error: 'Solicitação de amizade já existente ou erro ao enviar' };
  }

  return { success: true, data: friendship };
}

export async function respondFriendRequestAction(rawPayload: unknown): Promise<ActionResult> {
  const parsed = respondFriendRequestSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
    return { success: false, error: errorMsg };
  }

  const { friendshipId, action } = parsed.data;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  // Rate Limiting
  if (!(await checkActionRateLimit(user.id, 'social-actions', 10, 60000))) {
    return { success: false, error: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
  }

  // Security: Verify if user is part of this friendship relation
  const { data: friendship, error: fsError } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', friendshipId)
    .maybeSingle();

  if (fsError || !friendship) {
    return { success: false, error: 'Relação de amizade não encontrada.' };
  }

  if (friendship.user_id !== user.id && friendship.friend_id !== user.id) {
    return { success: false, error: 'Acesso não autorizado.' };
  }

  if (action === 'reject') {
    const ok = await deleteFriendship(friendshipId, supabase);
    if (!ok) return { success: false, error: 'Erro ao recusar solicitação' };
    return { success: true };
  }

  const status = action === 'accept' ? 'accepted' : 'blocked';
  const ok = await updateFriendshipStatus(friendshipId, status, supabase);
  if (!ok) {
    return { success: false, error: 'Erro ao atualizar status de amizade' };
  }

  return { success: true };
}

export async function sendDirectMessageAction(rawPayload: unknown): Promise<ActionResult<DirectMessage>> {
  const parsed = sendDirectMessageSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
    return { success: false, error: errorMsg };
  }

  const { receiverId, content } = parsed.data;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Usuário não autenticado.' };
  }

  // Rate Limiting
  if (!(await checkActionRateLimit(user.id, 'social-actions', 10, 60000))) {
    return { success: false, error: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
  }

  const msg = await sendDirectMessage(user.id, receiverId, content, supabase);
  if (!msg) {
    return { success: false, error: 'Erro ao enviar mensagem privada' };
  }

  return { success: true, data: msg };
}
