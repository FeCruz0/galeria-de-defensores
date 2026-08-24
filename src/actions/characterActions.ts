'use server';

import { createCharacterSchema } from '../lib/validations/character';
import { createSafeAction } from '../lib/actionWrapper';

export const createCharacterAction = createSafeAction(
  createCharacterSchema,
  async ({ name, concept, points_total, rule_system_id }, { user, supabase }) => {
    // 1. Buscar o sistema de regras no banco
    const { data: selectedSys, error: sysError } = await supabase
      .from('rule_systems')
      .select('*')
      .eq('id', rule_system_id)
      .single();

    if (sysError || !selectedSys) {
      return { success: false, error: 'Sistema de regras não encontrado.' };
    }

    const systemAttrs = selectedSys.attributes || {};
    const systemRes = selectedSys.resources || {};

    // 2. Inicializar atributos a zero
    const attributes_values: Record<string, number> = {};
    Object.keys(systemAttrs).forEach((key) => {
      attributes_values[key] = 0;
    });

    // 3. Inicializar recursos correntes a 1 (mínimo)
    const resources_current: Record<string, number> = {};
    Object.keys(systemRes).forEach((key) => {
      resources_current[key] = 1;
    });

    const defaultDamageType =
      selectedSys.damage_types && Array.isArray(selectedSys.damage_types) && selectedSys.damage_types.length > 0
        ? selectedSys.damage_types[0]
        : 'Corte';

    // 4. Verificar duplicados por nome do personagem para o mesmo usuário
    const { data: duplicate } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .maybeSingle();

    if (duplicate) {
      return { success: false, error: `Você já possui um personagem com o nome "${name}"! Por favor, escolha um nome diferente.` };
    }

    // 5. Inserir personagem
    const { data, error } = await supabase
      .from('characters')
      .insert({
        user_id: user.id,
        rule_system_id,
        name: name.trim(),
        concept: concept.trim(),
        points_total,
        points_spent: 0,
        attributes_values,
        resources_current,
        advantages: [],
        disadvantages: [],
        skills: [],
        specializations: [],
        spells: [],
        inventory: [],
        custom_rolls: [],
        damage_type_forca: defaultDamageType,
        damage_type_pdf: defaultDamageType,
        saved_points: points_total,
        experience: 0,
        annotations: '',
        is_hidden: false,
        image_url: ''
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir personagem:', error);
      return { success: false, error: 'Falha ao salvar o personagem no banco de dados.' };
    }

    return { success: true, data };
  },
  { requireAuth: true, rateLimitKey: 'character-creation', rateLimitMax: 5 }
);
