import { describe, it, expect } from 'vitest';
import { getMaxPv, getMaxPm, calculateScore, computedCostPt, executeCustomRoll, getQuickRollModifiers, convertXpToPoints, getModifiedAttributes, getEquippedItemsModifiers, executeAttributeTest } from '../lib/rules';
import { validateUniqueNameAndKey, validateFormula, canAlterAttribute, canAffordCost, canLinkCharacterToTable, validateDamageType } from '../lib/validations';
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
      { id: '1', name: 'Pontos de Vida Extras', description: '', cost: '1 ponto (cada)' },
      { id: '2', name: 'Pontos de Magia Extras', description: '', cost: '2 pontos (cada)' }
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
      scale: 0,
      status_effects: [],
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
      scale: 0,
      status_effects: [],
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

  it('deve priorizar appliedCostPt se especificado no item de vantagem', () => {
    const item: AdvantageItem = {
      id: 'custom-cost-1',
      name: 'Magia Branca (Gaiden)',
      description: '',
      cost: '1 a 3',
      appliedCostPt: 3
    };
    expect(computedCostPt(item)).toBe(3);
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

describe('Marcadores de Status & Efeitos Temporários', () => {
  const attrs = { F: 2, H: 3, R: 2, A: 2, PdF: 1 };

  it('deve manter atributos intocados se nenhum status estiver ativo', () => {
    const modified = getModifiedAttributes(attrs, []);
    expect(modified.H).toBe(3);
    expect(modified.A).toBe(2);
  });

  it('deve zerar Habilidade e Armadura se o status Indefeso (helpless) estiver ativo', () => {
    const modified = getModifiedAttributes(attrs, ['helpless']);
    expect(modified.H).toBe(0);
    expect(modified.A).toBe(0);
  });

  it('deve zerar Habilidade se o status Paralisado (paralyzed) estiver ativo', () => {
    const modified = getModifiedAttributes(attrs, ['paralyzed']);
    expect(modified.H).toBe(0);
    expect(modified.A).toBe(2);
  });

  it('deve dobrar Armadura no cálculo de FD com o status Defendendo (defending)', () => {
    // getQuickRollModifiers('Defesa', attrs, ['defending']) => A(2)*2 + H(3) = 7
    expect(getQuickRollModifiers('Defesa', attrs, ['defending'])).toBe(7);
  });

  it('deve zerar FD com o status Indefeso (helpless)', () => {
    // getQuickRollModifiers('Defesa', attrs, ['helpless']) => A(0)*2 + H(0) = 0
    expect(getQuickRollModifiers('Defesa', attrs, ['helpless'])).toBe(0);
  });

  it('deve dobrar Armadura em rolagens customizadas de Defesa se Defendendo', () => {
    const roll = {
      id: 'roll-def',
      name: 'Esquiva e Defesa',
      description: '',
      components: [],
      globalModifier: 0,
      primaryAttribute: 'A',
      secondaryAttribute: 'H',
      accumulateCrit: false,
      type: 'DEFENSE'
    };
    
    // Sem status: A(2) + H(3) = 5
    const normalResult = executeCustomRoll(roll as any, attrs, []);
    expect(normalResult.total).toBe(5);

    // Com defendendo: A(2)*2 + H(3) = 7
    const defendingResult = executeCustomRoll(roll as any, attrs, [], ['defending']);
    expect(defendingResult.total).toBe(7);
    expect(defendingResult.componentsText).toContain('A [2 x2]');
  });
});

describe('Inventário Equipável e Modificadores de Equipamentos', () => {
  const baseAttrs = { F: 1, H: 2, R: 2, A: 1, PdF: 0 };

  it('deve retornar modificadores zerados se o inventário for vazio ou indefinido', () => {
    expect(getEquippedItemsModifiers([])).toEqual({ F: 0, H: 0, R: 0, A: 0, PdF: 0 });
    expect(getEquippedItemsModifiers(undefined)).toEqual({ F: 0, H: 0, R: 0, A: 0, PdF: 0 });
  });

  it('deve acumular modificadores de itens marcados como equipados', () => {
    const inventory = [
      { id: '1', name: 'Espada Longa', description: '', quantity: 1, is_equipped: true, bonus_attribute: 'F', bonus_value: 1 },
      { id: '2', name: 'Escudo de Madeira', description: '', quantity: 1, is_equipped: true, bonus_attribute: 'A', bonus_value: 1 },
      { id: '3', name: 'Armadura Pesada', description: '', quantity: 1, is_equipped: false, bonus_attribute: 'A', bonus_value: 2 }, // não equipado
      { id: '4', name: 'Anel do Poder', description: '', quantity: 1, is_equipped: true, bonus_attribute: 'F', bonus_value: 2 }
    ];

    const mods = getEquippedItemsModifiers(inventory);
    expect(mods.F).toBe(3); // 1 + 2
    expect(mods.A).toBe(1); // apenas o escudo (1)
    expect(mods.R).toBe(0);
  });

  it('deve aplicar modificadores de equipamentos aos atributos modificados', () => {
    const equippedMods = { F: 2, A: 1, H: 0, R: 0, PdF: 0 };
    const modified = getModifiedAttributes(baseAttrs, [], equippedMods);

    expect(modified.F).toBe(3); // base(1) + equip(2)
    expect(modified.A).toBe(2); // base(1) + equip(1)
    expect(modified.H).toBe(2); // inalterado
  });

  it('deve aumentar PV e PM máximos baseado na Resistência modificada', () => {
    const inventory = [
      { id: '1', name: 'Anel de Vitalidade', description: '', quantity: 1, is_equipped: true, bonus_attribute: 'R', bonus_value: 1 }
    ];

    const equippedMods = getEquippedItemsModifiers(inventory);
    const modified = getModifiedAttributes(baseAttrs, [], equippedMods);
    const charR = modified.R || 0; // 2 + 1 = 3

    const maxPv = getMaxPv(charR); // 3 * 5 = 15
    const maxPm = getMaxPm(charR); // 3 * 5 = 15

    expect(maxPv).toBe(15);
    expect(maxPm).toBe(15);
  });

  it('deve manter calculateScore intacto mesmo com itens equipados', () => {
    const char = {
      attributes_values: { F: 2, H: 2, R: 1, A: 0, PdF: 0 },
      advantages: [],
      disadvantages: [],
      skills: [],
      specializations: [],
      unique_advantage: null,
      saved_points: 0,
      inventory: [
        { id: '1', name: 'Espada Lendária', description: '', quantity: 1, is_equipped: true, bonus_attribute: 'F', bonus_value: 5 } // +5 F
      ]
    };

    // F(2) + H(2) + R(1) = 5
    expect(calculateScore(char as any)).toBe(5);
  });
});

describe('Validação de Tipos de Dano', () => {
  const existing = ['Corte', 'Perfuração', 'Fogo'];

  it('deve rejeitar tipos de dano vazios ou duplicados (case-insensitive)', () => {
    expect(validateDamageType(existing, '').valid).toBe(false);
    expect(validateDamageType(existing, '  ').valid).toBe(false);
    expect(validateDamageType(existing, 'corte').valid).toBe(false);
    expect(validateDamageType(existing, 'FOGO').valid).toBe(false);
  });

  it('deve aceitar novos tipos de dano válidos', () => {
    expect(validateDamageType(existing, 'Psíquico').valid).toBe(true);
    expect(validateDamageType(existing, 'Elétrico').valid).toBe(true);
  });
});

describe('Mecânica de Rolagem de Atributo Base (executeAttributeTest)', () => {
  it('deve realizar teste ROLL_UNDER no 3D&T Alpha (1d6 <= Atributo)', () => {
    const config = {
      type: 'ROLL_UNDER' as const,
      diceCount: 1,
      diceFaces: 6,
      allowCritical: true,
      critSuccessValue: 1,
      critFailureValue: 6
    };

    // Dado 3 <= Habilidade 4 -> SUCESSO
    const resSuccess = executeAttributeTest('H', 'Habilidade', 4, config, 0, [3]);
    expect(resSuccess.success).toBe(true);
    expect(resSuccess.isCritSuccess).toBe(false);
    expect(resSuccess.isCritFailure).toBe(false);

    // Dado 5 <= Habilidade 4 -> FALHA
    const resFail = executeAttributeTest('H', 'Habilidade', 4, config, 0, [5]);
    expect(resFail.success).toBe(false);

    // Dado 1 -> SUCESSO CRÍTICO
    const resCrit = executeAttributeTest('H', 'Habilidade', 4, config, 0, [1]);
    expect(resCrit.success).toBe(true);
    expect(resCrit.isCritSuccess).toBe(true);

    // Dado 6 -> FALHA CRÍTICA
    const resBlunder = executeAttributeTest('H', 'Habilidade', 4, config, 0, [6]);
    expect(resBlunder.success).toBe(false);
    expect(resBlunder.isCritFailure).toBe(true);
  });

  it('deve realizar teste ROLL_OVER (1d6 + Atributo >= Dificuldade)', () => {
    const config = {
      type: 'ROLL_OVER' as const,
      diceCount: 1,
      diceFaces: 6,
      allowCritical: true,
      critSuccessValue: 6,
      critFailureValue: 1,
      defaultTargetNumber: 6
    };

    // Força 2 + Dado 4 = 6 >= Dificuldade 6 -> SUCESSO
    const res = executeAttributeTest('F', 'Força', 2, config, 0, [4]);
    expect(res.total).toBe(6);
    expect(res.success).toBe(true);
  });

  it('deve realizar teste DICE_POOL (N dados d6 por ponto de Atributo)', () => {
    const config = {
      type: 'DICE_POOL' as const,
      diceCount: 1,
      diceFaces: 6,
      allowCritical: false,
      critSuccessValue: 5 // Sucesso se dado >= 5
    };

    // Habilidade 3 -> rola 3d6: [2, 5, 6] -> 2 sucessos
    const res = executeAttributeTest('H', 'Habilidade', 3, config, 0, [2, 5, 6]);
    expect(res.total).toBe(2);
    expect(res.success).toBe(true);
  });
});

