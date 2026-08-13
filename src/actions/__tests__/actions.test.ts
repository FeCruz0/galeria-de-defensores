import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveCharacterAction, rollDiceServerAction, distributeXpServerAction } from '../gameActions';
import { Character } from '../../types/game';

// Mock Supabase Server client
let mockUser: any = null;
let mockTableResponse: any = null;
let mockMemberResponse: any = null;
let mockCharacterResponse: any = null;

vi.mock('../../utils/supabase/server', () => {
  return {
    createClient: () => {
      return {
        auth: {
          getUser: async () => ({ data: { user: mockUser } })
        },
        from: (table: string) => {
          return {
            select: (columns?: string) => {
              return {
                eq: (col1: string, val1: any) => {
                  // Chainable eq for table_players check
                  const eqChain = {
                    maybeSingle: async () => {
                      if (table === 'tables') return { data: mockTableResponse };
                      if (table === 'table_players') return { data: mockMemberResponse };
                      return { data: null };
                    }
                  };
                  return {
                    maybeSingle: async () => {
                      if (table === 'tables') return { data: mockTableResponse };
                      if (table === 'table_players') return { data: mockMemberResponse };
                      return { data: null };
                    },
                    eq: (col2: string, val2: any) => eqChain
                  };
                }
              };
            },
            update: (updates: any) => {
              return {
                eq: (col1: string, val1: any) => {
                  return {
                    select: (cols?: string) => {
                      return {
                        single: async () => {
                          return { data: { ...mockCharacterResponse, ...updates }, error: null };
                        }
                      };
                    }
                  };
                }
              };
            },
            insert: (payload: any) => {
              return {
                select: (cols?: string) => {
                  return {
                    single: async () => {
                      return { data: { id: 'msg-1' }, error: null };
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
});

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

  beforeEach(() => {
    mockUser = null;
    mockTableResponse = null;
    mockMemberResponse = null;
    mockCharacterResponse = mockValidCharacter;
  });

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

    it('should reject updates if user is not authenticated', async () => {
      mockUser = null;
      const result = await saveCharacterAction(mockValidCharacter);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Usuário não autenticado');
    });

    it('should reject updates if user is not the owner of the character', async () => {
      mockUser = { id: 'other-user' }; // Not 'user-1'
      const result = await saveCharacterAction(mockValidCharacter);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Acesso não autorizado');
    });

    it('should allow GMs to save other users characters linked to their table', async () => {
      mockUser = { id: 'gm-user' };
      const charLinkedToTable = {
        ...mockValidCharacter,
        table_id: 'table-123'
      };
      // GM owns the table
      mockTableResponse = { master_id: 'gm-user' };

      const result = await saveCharacterAction(charLinkedToTable);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
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

    it('should reject rolls if user is not authenticated', async () => {
      mockUser = null;
      const validRoll = {
        tableId: 'table-1',
        senderId: 'user-1',
        senderName: 'Jogador',
        diceCount: 1,
        diceFaces: 6,
        attributeBonus: 0
      };
      const result = await rollDiceServerAction(validRoll);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Usuário não autenticado');
    });

    it('should reject rolls if user is not member or master of the table', async () => {
      mockUser = { id: 'unauthorized-user' };
      mockTableResponse = null; // not master
      mockMemberResponse = null; // not member
      const validRoll = {
        tableId: 'table-1',
        senderId: 'unauthorized-user',
        senderName: 'Jogador',
        diceCount: 1,
        diceFaces: 6,
        attributeBonus: 0
      };
      const result = await rollDiceServerAction(validRoll);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Acesso não autorizado');
    });

    it('should allow rolls if user is a member of the table', async () => {
      mockUser = { id: 'member-user' };
      mockTableResponse = null;
      mockMemberResponse = { role: 'player' };
      const validRoll = {
        tableId: 'table-1',
        senderId: 'member-user',
        senderName: 'Jogador',
        diceCount: 1,
        diceFaces: 6,
        attributeBonus: 0
      };
      const result = await rollDiceServerAction(validRoll);
      expect(result.success).toBe(true);
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

    it('should reject XP distribution if user is not authenticated', async () => {
      mockUser = null;
      const validXp = {
        characterIds: ['char-1'],
        xpAmount: 5
      };
      const result = await distributeXpServerAction(validXp);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Usuário não autenticado');
    });
  });
});
