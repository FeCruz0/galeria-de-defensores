import { z } from 'zod';

export const createTableSchema = z.object({
  name: z.string().min(3, 'O nome da mesa deve ter pelo menos 3 caracteres.').max(60, 'Nome muito longo.'),
  description: z.string().max(500, 'A descrição deve ter no máximo 500 caracteres.').optional().default(''),
  master_id: z.string().uuid('ID de mestre inválido.'),
  rule_system_id: z.string().uuid('ID de sistema de regras inválido.').nullable().optional(),
  is_private: z.boolean().default(false),
  password: z.string().nullable().optional(),
  max_players: z.number().int().min(1, 'Mínimo de 1 jogador.').max(20, 'Máximo de 20 jogadores.').default(4),
  allow_spectators: z.boolean().default(true),
  has_separated_chat: z.boolean().default(true),
});

export const updateTableSettingsSchema = z.object({
  name: z.string().min(3, 'O nome da mesa deve ter pelo menos 3 caracteres.').max(60).optional(),
  description: z.string().max(500).optional(),
  is_private: z.boolean().optional(),
  password: z.string().nullable().optional(),
  max_players: z.number().int().min(1).max(20).optional(),
  allow_spectators: z.boolean().optional(),
  has_separated_chat: z.boolean().optional(),
});

export const updateMemberRoleSchema = z.object({
  table_id: z.string().uuid(),
  player_id: z.string().uuid(),
  role: z.enum(['player', 'spectator']),
});
