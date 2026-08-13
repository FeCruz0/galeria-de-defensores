import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'O nome de usuário deve ter pelo menos 3 caracteres')
    .max(30, 'O nome de usuário deve ter no máximo 30 caracteres')
    .regex(/^[a-zA-Z0-9_\-]+$/, 'O nome de usuário deve conter apenas letras, números, sublinhados ou hífens'),
  email: z
    .string()
    .email('Endereço de e-mail inválido'),
  password: z
    .string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres')
    .regex(/[a-zA-Z]/, 'A senha deve conter pelo menos uma letra')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
    .regex(/[^a-zA-Z0-9]/, 'A senha deve conter pelo menos um caractere especial ou símbolo')
});
