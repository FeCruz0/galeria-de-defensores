import { describe, it, expect } from 'vitest';
import { saveCharacterAction, rollDiceServerAction, distributeXpServerAction } from '../gameActions';
import { Character } from '../../types/game';

describe('Server Actions & Anti-Cheat Validation Suite', () => {
  const mockValidCharacter: Character = {
    id: 'char-action-1',
    user_id: 'user-1',
    name: 'Guerreiro Válido',
    scale: 0,
    points_total: 10,
    points_spent: 5,
    concept: 'Guerreiro',
    attributes_values: { F: 2, H: 2, R: 1, A: 0, PdF: 0 },
    resources_current: { PV: 5, PM: 5 },
    advantages: [],
    disadvantages: [],
    skills: [],
    specializations: [],
    spells: [],
    inventory: [],
    custom_rolls: [],
    damage_type_forca: 'Corte',
    damage_type_pdf: 'Perfuração',
    saved_points: 0,
    experience: 0,
    status_effects: [],
    annotations: '',
    is_hidden: false,
    image_url: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('saveCharacterAction Validation', () => {
    it('should reject character updates when points_spent exceeds points_total (Anti-Cheat)', async () => {
      const cheatedCharacter: Character = {
        ...mockValidCharacter,
        attributes_values: { F: 5, H: 5, R: 5, A: 5, PdF: 5 }, // Total: 25 pts
        points_total: 10
      };

      const result = await saveCharacterAction(cheatedCharacter);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Orçamento de pontos excedido');
    });

    it('should reject payloads with invalid structure', async () => {
      const invalidPayload = { name: 12345 };
      const result = await saveCharacterAction(invalidPayload);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Dados inválidos');
    });
  });

  describe('rollDiceServerAction Validation', () => {
    it('should reject roll actions with negative or zero dice count', async () => {
      const invalidRoll = {
        tableId: 'table-1',
        senderId: 'user-1',
        senderName: 'Mestre',
        diceCount: 0,
        diceFaces: 6,
        attributeBonus: 2
      };

      const result = await rollDiceServerAction(invalidRoll);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Parâmetros de rolagem inválidos');
    });
  });

  describe('distributeXpServerAction Validation', () => {
    it('should reject XP distribution with non-positive amounts', async () => {
      const invalidXp = {
        characterIds: ['char-1'],
        xpAmount: -5
      };

      const result = await distributeXpServerAction(invalidXp);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Parâmetros de distribuição inválidos');
    });
  });
});
