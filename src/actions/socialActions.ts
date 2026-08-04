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
  sendDirectMessage 
} from '../services/socialService';

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function sendFriendRequestAction(currentUserId: string, rawPayload: unknown): Promise<ActionResult> {
  const parsed = sendFriendRequestSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
    return { success: false, error: errorMsg };
  }

  const { targetInput } = parsed.data;

  // Search user profile by username or id
  const targetUser = await searchUserProfile(targetInput);
  if (!targetUser) {
    return { success: false, error: 'Usuário não encontrado' };
  }

  if (targetUser.id === currentUserId) {
    return { success: false, error: 'Você não pode enviar uma solicitação para si mesmo' };
  }

  const friendship = await sendFriendRequest(currentUserId, targetUser.id);
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

  if (action === 'reject') {
    const ok = await deleteFriendship(friendshipId);
    if (!ok) return { success: false, error: 'Erro ao recusar solicitação' };
    return { success: true };
  }

  const status = action === 'accept' ? 'accepted' : 'blocked';
  const ok = await updateFriendshipStatus(friendshipId, status);
  if (!ok) {
    return { success: false, error: 'Erro ao atualizar status de amizade' };
  }

  return { success: true };
}

export async function sendDirectMessageAction(senderId: string, rawPayload: unknown): Promise<ActionResult> {
  const parsed = sendDirectMessageSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
    return { success: false, error: errorMsg };
  }

  const { receiverId, content } = parsed.data;

  const msg = await sendDirectMessage(senderId, receiverId, content);
  if (!msg) {
    return { success: false, error: 'Erro ao enviar mensagem privada' };
  }

  return { success: true, data: msg };
}
