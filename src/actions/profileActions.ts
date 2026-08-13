'use server';

import { updateProfileSchema } from '../lib/validations/profile';
import { updateProfile, uploadAvatar } from '../services/profileService';
import { createClient } from '../utils/supabase/server';
import { Profile } from '../types/game';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function updateProfileAction(userId: string, rawPayload: unknown): Promise<ActionResult<Profile>> {
  const parsed = updateProfileSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
    return { success: false, error: errorMsg };
  }

  const supabase = await createClient();

  // Check if username is already taken by someone else
  if (parsed.data.username) {
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', parsed.data.username)
      .neq('id', userId)
      .maybeSingle();

    if (existingUser) {
      return { success: false, error: 'O nome de usuário já está sendo utilizado por outra conta.' };
    }
  }

  const updated = await updateProfile(userId, parsed.data, supabase);
  if (!updated) {
    return { success: false, error: 'Não foi possível atualizar as informações do perfil.' };
  }

  return { success: true, data: updated };
}

export async function uploadAvatarAction(formData: FormData): Promise<ActionResult<{ publicUrl: string }>> {
  const file = formData.get('avatar') as File | null;
  const userId = formData.get('userId') as string | null;

  if (!file || !userId) {
    return { success: false, error: 'Arquivo ou ID do usuário não fornecidos.' };
  }

  // Validate file size and type
  const maxBytes = 2 * 1024 * 1024; // 2MB
  if (file.size > maxBytes) {
    return { success: false, error: 'A imagem deve ter no máximo 2MB.' };
  }
  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'O arquivo enviado deve ser uma imagem.' };
  }

  const supabase = await createClient();
  const publicUrl = await uploadAvatar(userId, file, supabase);

  if (!publicUrl) {
    return { success: false, error: 'Falha ao salvar a imagem no servidor.' };
  }

  return { success: true, data: { publicUrl } };
}
