import { z } from 'zod';

export const sendFriendRequestSchema = z.object({
  targetInput: z.string().min(3, 'O ID ou nome de usuário deve ter pelo menos 3 caracteres').max(100),
});

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;

export const respondFriendRequestSchema = z.object({
  friendshipId: z.string().uuid('ID de amizade inválido'),
  action: z.enum(['accept', 'reject', 'block']),
});

export type RespondFriendRequestInput = z.infer<typeof respondFriendRequestSchema>;

export const sendDirectMessageSchema = z.object({
  receiverId: z.string().uuid('ID de destinatário inválido'),
  content: z.string().min(1, 'A mensagem não pode ser vazia').max(1000, 'A mensagem excedeu o limite de 1000 caracteres'),
});

export type SendDirectMessageInput = z.infer<typeof sendDirectMessageSchema>;

export function calculateLobbyCooldown(textLength: number): number {
  const minSeconds = 5;
  const maxSeconds = 30;
  const calculated = minSeconds + Math.floor(textLength / 25);
  return Math.max(minSeconds, Math.min(maxSeconds, calculated));
}
