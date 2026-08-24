'use server';

import { registerSchema } from '../lib/validations/auth';
import { createSafeAction } from '../lib/actionWrapper';
import { translateAuthError } from '../lib/authErrors';

export const registerUserAction = createSafeAction(
  registerSchema,
  async ({ username, email, password }, { supabase }) => {
    // Verificar se o nome de usuário já está em uso
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();

    if (existingUser) {
      return { success: false, error: 'Este nome de usuário já está sendo utilizado por outra conta.' };
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim(),
        },
      },
    });

    if (error) {
      return { success: false, error: translateAuthError(error) };
    }

    return { success: true };
  },
  { requireAuth: false }
);
