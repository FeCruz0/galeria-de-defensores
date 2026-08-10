import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'O nome de usuário deve ter pelo menos 3 caracteres')
    .max(30, 'O nome de usuário deve ter no máximo 30 caracteres')
    .regex(/^[a-zA-Z0-9_\-]+$/, 'O nome de usuário deve conter apenas letras, números, sublinhados ou hífens'),
  avatar_url: z
    .string()
    .url('O avatar deve ser uma URL válida')
    .or(z.literal(''))
    .optional(),
  about: z
    .string()
    .max(500, 'A biografia deve ter no máximo 500 caracteres')
    .optional(),
  cep: z
    .string()
    .max(10, 'CEP inválido')
    .optional(),
  country: z
    .string()
    .max(50, 'País inválido')
    .optional(),
  state: z
    .string()
    .max(50, 'Estado inválido')
    .optional(),
  city: z
    .string()
    .max(100, 'Cidade inválida')
    .optional(),
});
