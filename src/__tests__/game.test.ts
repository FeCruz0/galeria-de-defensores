import { describe, it, expect } from 'vitest';
import { getMaxPv, getMaxPm, calculateScore, executeCustomRoll, getQuickRollModifiers, convertXpToPoints } from '../lib/rules';
import { validateUniqueNameAndKey, validateFormula, canAlterAttribute, canAffordCost, canLinkCharacterToTable } from '../lib/validations';
import { Character } from '../types/game';



describe('Motor de Regras 3D&T Alpha', () => {
  it('deve calcular PV e PM máximos baseado na Resistência', () => {
    expect(getMaxPv(0)).toBe(1);
    expect(getMaxPv(2)).toBe(10);
    expect(getMaxPv(5)).toBe(25);

    expect(getMaxPm(0)).toBe(1);
    expect(getMaxPm(3)).toBe(15);
  });

  it('deve calcular PV e PM máximos considerando PV/PM Extras', () => {
    const advantages = [
      { id: '1', name: 'Pontos de Vida Extras', cost: '1 ponto (cada)' },
      { id: '2', name: 'Pontos de Magia Extras', cost: '2 pontos (cada)' }
    ];
    // R=2. PV Extra=1 (R+2 para PV -> R=4). PV = 4 * 5 = 20.
    expect(getMaxPv(2, advantages)).toBe(20);
    // R=2. PM Extra=2 (R+4 para PM -> R=6). PM = 6 * 5 = 30.
    expect(getMaxPm(2, advantages)).toBe(30);
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
    const result = executeCustomRoll(roll as any, attrs, [3]);
    // 3 (dado) + globalModifier (2) + F (3) + H (2) = 10
    expect(result.total).toBe(10);
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

describe('Validação de Distribuição de Pontos e Pontos Guardados', () => {
  it('deve permitir alteração de atributos se houver pontos guardados suficientes', () => {
    // se delta > 0 e saved_points > 0, deve retornar true
    expect(canAlterAttribute(2, 1, 1)).toBe(true);
    // se delta > 0 e saved_points == 0, deve retornar false
    expect(canAlterAttribute(2, 1, 0)).toBe(false);
    // se delta < 0 e valor atual > 0, deve retornar true (devolve ponto)
    expect(canAlterAttribute(2, -1, 0)).toBe(true);
    // se delta < 0 e valor atual == 0, deve retornar false
    expect(canAlterAttribute(0, -1, 5)).toBe(false);
  });

  it('deve validar custo para adicionar/editar vantagens', () => {
    // vantagem custa 2, tem 5 pontos guardados -> true
    expect(canAffordCost(2, 5)).toBe(true);
    // vantagem custa 2, tem 1 ponto guardado -> false
    expect(canAffordCost(2, 1)).toBe(false);
    // desvantagem custa -2, tem 0 pontos guardados -> true (desvantagem dá pontos/devolve)
    expect(canAffordCost(-2, 0)).toBe(true);
  });

  it('deve converter PEs em Pontos Guardados corretamente (10 XP = 1 Ponto Guardado)', () => {
    // 0 XP + 5 PEs = 5 XP e 0 pontos extras
    expect(convertXpToPoints(0, 5, 0)).toEqual({ experience: 5, saved_points: 0 });
    // 8 XP + 4 PEs = 2 XP e +1 ponto guardado
    expect(convertXpToPoints(8, 4, 2)).toEqual({ experience: 2, saved_points: 3 });
    // 9 XP + 15 PEs = 4 XP e +2 pontos guardados
    expect(convertXpToPoints(9, 15, 0)).toEqual({ experience: 4, saved_points: 2 });
    // 5 XP + (-2) PEs = 3 XP e 0 pontos guardados (sem redução abaixo de zero)
    expect(convertXpToPoints(5, -2, 1)).toEqual({ experience: 3, saved_points: 1 });
  });
});

describe('Atalhos Rápidos de Rolagem (Quick Actions)', () => {
  const attrs = { F: 2, H: 3, R: 2, A: 1, PdF: 0 };

  it('deve calcular os modificadores de rolagens rápidas corretamente', () => {
    expect(getQuickRollModifiers('Ataque', attrs)).toBe(5); // F(2) + H(3)
    expect(getQuickRollModifiers('Defesa', attrs)).toBe(4); // A(1) + H(3)
    expect(getQuickRollModifiers('Esquiva', attrs)).toBe(3); // H(3)
    expect(getQuickRollModifiers('Iniciativa', attrs)).toBe(3); // H(3)
    expect(getQuickRollModifiers('Outro', attrs)).toBe(0);
  });
});

describe('Restrição de Sistema de Regras em Mesas de Jogo', () => {
  it('deve permitir vincular qualquer personagem se a mesa não tiver sistema vinculado (compatibilidade)', () => {
    expect(canLinkCharacterToTable(undefined, 'sys-1')).toBe(true);
    expect(canLinkCharacterToTable(null, 'sys-1')).toBe(true);
  });

  it('deve permitir vincular se o personagem tiver o mesmo sistema da mesa', () => {
    expect(canLinkCharacterToTable('sys-1', 'sys-1')).toBe(true);
  });

  it('deve recusar vínculo se o personagem tiver sistema diferente da mesa', () => {
    expect(canLinkCharacterToTable('sys-1', 'sys-2')).toBe(false);
    expect(canLinkCharacterToTable('sys-1', undefined)).toBe(false);
  });
});

describe('Consistência do Orçamento de Pontos', () => {
  it('deve calcular corretamente a soma dos pontos gastos', () => {
    const mockCharacter = {
      attributes_values: { F: 2, H: 2, R: 1 },
      advantages: [
        { name: 'Aceleração', cost: '1pt' },
        { name: 'Ataque Especial', cost: '2pt' }
      ],
      disadvantages: [
        { name: 'Código de Honra', cost: '-1pt' }
      ],
      skills: [
        { name: 'Combate', cost: '1pt' }
      ],
      specializations: [
        { id: '1', name: 'Acrobacia' },
        { id: '2', name: 'Furtividade' },
        { id: '3', name: 'Alpinismo' }
      ],
      unique_advantage: { name: 'Elfo', cost: 1 },
      saved_points: 1
    };

    // Atributos (5) + Vantagens (3) - Desvantagens (1) + Perícia (1) + Especializações (1) + Vantagem Única (1) = 10
    const spent = 2 + 2 + 1 + 1 + 2 - 1 + 1 + 1 + 1;
    expect(spent).toBe(10);
    expect(calculateScore(mockCharacter as any)).toBe(11); // spent (10) + saved_points (1)
  });
});

