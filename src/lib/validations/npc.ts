import { z } from 'zod';

export const createNpcSchema = z.object({
  table_id: z.string().uuid('ID de mesa inválido.'),
  name: z.string().min(1, 'Nome do NPC é obrigatório.').max(100, 'Nome muito longo.'),
  concept: z.string().max(150, 'Conceito muito longo.').optional().nullable(),
  attributes_values: z.record(z.string(), z.number().min(0, 'Atributo não pode ser negativo.')),
  resources_current: z.record(z.string(), z.number().min(0, 'Recurso não pode ser negativo.')),
  annotations: z.string().max(1000, 'Anotações muito longas.').optional().nullable(),
});

export const updateNpcSchema = createNpcSchema.partial().omit({ table_id: true });

export type CreateNpcInput = z.infer<typeof createNpcSchema>;
export type UpdateNpcInput = z.infer<typeof updateNpcSchema>;
