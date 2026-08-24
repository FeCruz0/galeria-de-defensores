import { z } from 'zod';

export const createCharacterSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome do personagem deve ter pelo menos 2 caracteres')
    .max(50, 'Nome do personagem deve ter no máximo 50 caracteres'),
  concept: z
    .string()
    .min(2, 'Conceito deve ter pelo menos 2 caracteres')
    .max(50, 'Conceito deve ter no máximo 50 caracteres'),
  points_total: z
    .number()
    .int()
    .min(5)
    .max(12),
  rule_system_id: z
    .string()
    .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, 'ID de sistema de regras inválido.')
});
