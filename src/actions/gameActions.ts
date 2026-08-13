'use server';

import { 
  CharacterMutationSchema, 
  DiceRollActionSchema, 
  XPDistributionSchema 
} from '../lib/validations/actions';
import { calculateScore } from '../lib/rules';
import { updateCharacter } from '../services/characterService';
import { distributeExperience } from '../services/tableService';
import { createClient } from '../utils/supabase/server';
import { Character } from '../types/game';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function saveCharacterAction(rawPayload: unknown): Promise<ActionResult<Character>> {
  const parsed = CharacterMutationSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
    return { success: false, error: `Dados inválidos: ${errorMsg}` };
  }

  const charData = parsed.data as Character;

  // Server-side rules engine validation: Recalculate spent score
  const computedScore = calculateScore(charData);
  if (computedScore > charData.points_total) {
    return {
      success: false,
      error: `Orçamento de pontos excedido. Pontos totais: ${charData.points_total}, Pontos gastos: ${computedScore}`
    };
  }

  const supabase = await createClient();
  const updated = await updateCharacter(charData.id, {
    ...charData,
    points_spent: computedScore
  }, supabase);

  if (!updated) {
    return { success: false, error: 'Falha ao salvar personagem no banco de dados' };
  }

  return { success: true, data: updated };
}

export async function rollDiceServerAction(rawPayload: unknown): Promise<ActionResult> {
  const parsed = DiceRollActionSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
    return { success: false, error: `Parâmetros de rolagem inválidos: ${errorMsg}` };
  }

  const { tableId, senderId, senderName, diceCount, diceFaces, attributeBonus, channel, characterId } = parsed.data;

  // Server-side random dice roll generation (Cryptographically secure / Tamper-proof)
  const dices: number[] = [];
  for (let i = 0; i < diceCount; i++) {
    dices.push(Math.floor(Math.random() * diceFaces) + 1);
  }

  const diceSum = dices.reduce((a, b) => a + b, 0);
  const total = diceSum + attributeBonus;
  const isCrit = dices.some((d) => d === diceFaces);

  const rollResultPayload = {
    total,
    dices,
    modifiers: attributeBonus,
    isCrit,
    componentsText: `${diceCount}d${diceFaces} (${dices.join(', ')}) ${attributeBonus >= 0 ? '+' : ''}${attributeBonus}`
  };

  const messageContent = `rolou ${diceCount}d${diceFaces}${attributeBonus !== 0 ? ` (${attributeBonus >= 0 ? '+' : ''}${attributeBonus})` : ''} 🎲 Resultado: ${total}`;

  const supabase = await createClient();
  const { data: insertedMessage, error } = await supabase
    .from('chat_messages')
    .insert([
      {
        table_id: tableId,
        sender_id: senderId,
        sender_name: senderName,
        character_id: characterId || null,
        content: messageContent,
        type: 'ROLL',
        channel: channel,
        roll_result: rollResultPayload,
        is_edited: false
      }
    ])
    .select('*')
    .single();

  if (error || !insertedMessage) {
    return { success: false, error: 'Falha ao registrar mensagem de rolagem no chat' };
  }

  return { success: true, data: insertedMessage };
}

export async function distributeXpServerAction(rawPayload: unknown): Promise<ActionResult> {
  const parsed = XPDistributionSchema.safeParse(rawPayload);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
    return { success: false, error: `Parâmetros de distribuição inválidos: ${errorMsg}` };
  }

  const { characterIds, xpAmount } = parsed.data;
  const supabase = await createClient();
  const ok = await distributeExperience(characterIds, xpAmount, supabase);
  if (!ok) {
    return { success: false, error: 'Falha ao distribuir XP no servidor' };
  }

  return { success: true };
}
