import { describe, it, expect } from 'vitest';
import { getMaxPv, getMaxPm, calculateScore, executeCustomRoll } from '../lib/rules';
import { validateUniqueNameAndKey, validateFormula } from '../lib/validations';
import { Character } from '../types/game';

describe('Motor de Regras 3D&T Alpha', () => {
  it('deve calcular PV e PM máximos baseado na Resistência', () => {
    expect(getMaxPv(0)).toBe(1);
    expect(getMaxPv(2)).toBe(10);
    expect(getMaxPv(5)).toBe(25);

    expect(getMaxPm(0)).toBe(1);
    expect(getMaxPm(3)).toBe(15);
  });

  it('deve calcular a pontuação gasta de um personagem corretamente', () => {
    const mockCharacter: Character = {
      id: 'char-id',
      user_id: 'user-id',
      name: 'Guerreiro de Exemplo',
      points_total: 10,
      points_spent: 0,
      concept: 'Guerreiro',
      attributes_values: {
        F: 2,
        H: 2,
        R: 2,
        A: 1,
        PdF: 0,
      },
      resources_current: {
        PV: 10,
        PM: 10,
      },
      advantages: [
        { id: 'adv-1', name: 'Aceleração', description: 'Corre rápido', cost: '1' },
      ],
      disadvantages: [
        { id: 'disadv-1', name: 'Mala de Grupo', description: 'Chato', cost: '-1' },
      ],
      skills: [
        { id: 'skill-1', name: 'Combate', description: 'Luta', cost: '1' },
      ],
      specializations: [
        { id: 'spec-1', name: 'Espadas', description: '', cost: '0' },
        { id: 'spec-2', name: 'Escudos', description: '', cost: '0' },
        { id: 'spec-3', name: 'Machados', description: '', cost: '0' }, // 3 specs = +1 point
      ],
      spells: [],
      inventory: [],
      custom_rolls: [],
      damage_type_forca: 'Corte',
      damage_type_pdf: 'Perfuração',
      saved_points: 1,
      experience: 0,
      annotations: '',
      is_hidden: false,
      image_url: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Total esperado: 7 + 1 - 1 (desvantagens) + 1 + 1 + 1 = 10
    expect(calculateScore(mockCharacter)).toBe(10);
  });

  it('deve calcular vantagens modulares, desvantagens e a regra de 1pt/3 opções', () => {
    const char: Character = {
      id: 'char-id',
      user_id: 'user-id',
      name: 'Defensor Teste',
      points_total: 10,
      points_spent: 0,
      concept: 'Mago',
      attributes_values: { F: 1, H: 2, R: 2, A: 0, PdF: 0 },
      resources_current: { PV: 10, PM: 10 },
      advantages: [
        {
          id: 'ae-1',
          name: 'ATAQUE ESPECIAL',
          description: 'Ataque forte',
          cost: 'Modular',
          isModular: true,
          baseCostPt: 1,
          modifiers: [
            { id: 'ae_amplo', name: 'Amplo', costPt: 1, description: '' },
            { id: 'ae_critico', name: 'Crítico', costPt: 1, description: '' }
          ],
          selectedModifiers: ['ae_amplo'] // Custo esperado: 1 (base) + 1 (amplo) = 2
        },
        {
          id: 'manobras-1',
          name: 'MANOBRAS ESPECIAIS',
          description: 'Manobras',
          cost: 'Modular',
          isModular: true,
          baseCostPt: 1,
          modifiers: [
            { id: 'm1', name: 'M1', costPt: 1, description: '' },
            { id: 'm2', name: 'M2', costPt: 1, description: '' },
            { id: 'm3', name: 'M3', costPt: 1, description: '' },
            { id: 'm4', name: 'M4', costPt: 1, description: '' }
          ],
          selectedModifiers: ['m1', 'm2', 'm3', 'm4'] // Custo esperado: 1 (base) + ceil(4/3) = 1 + 2 = 3
        }
      ],
      disadvantages: [
        { id: 'dis-1', name: 'Má Fama', description: 'Mal falado', cost: '-1' } // Custo esperado: -1
      ],
      skills: [],
      specializations: [],
      spells: [],
      inventory: [],
      custom_rolls: [],
      damage_type_forca: 'Corte',
      damage_type_pdf: 'Perfuração',
      saved_points: 0,
      experience: 0,
      annotations: '',
      is_hidden: false,
      image_url: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Atributos: 1+2+2 = 5
    // Vantagens: 2 (Ataque Especial) + 3 (Manobras Especiais) = 5
    // Desvantagens: -1u
    // Total esperado: 5 + 5 - 1 = 9
    expect(calculateScore(char)).toBe(9);
  });

  it('deve executar uma rolagem customizada aplicando atributos e modificadores corretos', () => {
    const roll = {
      id: 'roll-1',
      name: 'Ataque de Espada',
      description: 'Ataque físico',
      components: [
        {
          id: 'c-1',
          count: 1,
          faces: 6,
          bonus: 0,
          isNegative: false,
          canCrit: false,
          critMultiplier: 2
        }
      ],
      globalModifier: 2,
      primaryAttribute: 'F',
      secondaryAttribute: 'H',
      accumulateCrit: false
    };

    const attrs = { F: 3, H: 2, R: 2, A: 1, PdF: 0 };
    const result = executeCustomRoll(roll as any, attrs);
    // 1d6 + globalModifier (2) + F (3) + H (2) = dado (1~6) + 7
    expect(result.total).toBeGreaterThanOrEqual(8);
    expect(result.total).toBeLessThanOrEqual(13);
    expect(result.modifiers).toBe(7); // global (2) + F (3) + H (2)
  });
});

describe('Validação de Unicidade na Sandbox', () => {
  const items = [
    { id: '1', key: 'F', name: 'Força' },
    { id: '2', key: 'H', name: 'Habilidade' },
  ];

  it('deve rejeitar chaves ou nomes duplicados (case-insensitive)', () => {
    expect(validateUniqueNameAndKey(items, 'f', 'Nova').valid).toBe(false);
    expect(validateUniqueNameAndKey(items, 'F', 'Nova').valid).toBe(false);
    expect(validateUniqueNameAndKey(items, 'NewKey', 'força').valid).toBe(false);
  });

  it('deve aceitar chaves e nomes únicos', () => {
    expect(validateUniqueNameAndKey(items, 'R', 'Resistência').valid).toBe(true);
  });

  it('deve ignorar o próprio item em edições', () => {
    expect(validateUniqueNameAndKey(items, 'F', 'Força', '1').valid).toBe(true);
  });
});

describe('Validação de Fórmulas de Recursos', () => {
  it('deve aceitar fórmulas válidas e rejeitar inválidas', () => {
    expect(validateFormula('R * 5', ['R']).valid).toBe(true);
    expect(validateFormula('H + F * 2', ['H', 'F']).valid).toBe(true);
    expect(validateFormula('X * 5', ['R']).valid).toBe(false); // X não existe
    expect(validateFormula('R * / 5', ['R']).valid).toBe(false); // sintaxe errada
  });
});
