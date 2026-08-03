import { z } from 'zod';

export const CharacterMutationSchema = z.object({
  id: z.string().min(1, 'ID do personagem é obrigatório'),
  user_id: z.string().min(1, 'ID de usuário é obrigatório'),
  name: z.string().min(1, 'Nome do personagem é obrigatório'),
  scale: z.number().int().min(0).max(3).default(0),
  points_total: z.number().min(0, 'Pontos totais devem ser não negativos'),
  points_spent: z.number().min(0),
  concept: z.string().default(''),
  attributes_values: z.record(z.string(), z.number()),
  resources_current: z.record(z.string(), z.number()),
  advantages: z.array(z.any()).default([]),
  disadvantages: z.array(z.any()).default([]),
  skills: z.array(z.any()).default([]),
  specializations: z.array(z.any()).default([]),
  spells: z.array(z.any()).default([]),
  inventory: z.array(z.any()).default([]),
  custom_rolls: z.array(z.any()).default([]),
  damage_type_forca: z.string().default(''),
  damage_type_pdf: z.string().default(''),
  saved_points: z.number().min(0).default(0),
  experience: z.number().min(0).default(0),
  status_effects: z.array(z.string()).default([]),
  annotations: z.string().default(''),
  is_hidden: z.boolean().default(false),
  image_url: z.string().default(''),
  table_id: z.string().optional(),
  rule_system_id: z.string().optional(),
});

export const DiceRollActionSchema = z.object({
  tableId: z.string().min(1, 'ID da mesa é obrigatório'),
  characterId: z.string().optional(),
  senderId: z.string().min(1, 'ID do remetente é obrigatório'),
  senderName: z.string().min(1, 'Nome do remetente é obrigatório'),
  diceCount: z.number().int().min(1).max(20),
  diceFaces: z.number().int().min(2).max(100),
  attributeBonus: z.number().default(0),
  channel: z.enum(['ON', 'OFF']).default('ON'),
});

export const XPDistributionSchema = z.object({
  characterIds: z.array(z.string().min(1)).min(1, 'Selecione pelo menos um personagem'),
  xpAmount: z.number().int().positive('Quantidade de XP deve ser positiva'),
});

export type CharacterMutationPayload = z.infer<typeof CharacterMutationSchema>;
export type DiceRollActionPayload = z.infer<typeof DiceRollActionSchema>;
export type XPDistributionPayload = z.infer<typeof XPDistributionSchema>;
