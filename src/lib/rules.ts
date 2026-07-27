import { Character, AdvantageItem, CustomRoll, RollResult, InventoryItem } from '../types/game';

/**
 * Retorna o valor máximo de Pontos de Vida (PV) baseado na Resistência do personagem.
 */
export function getMaxPv(resistencia: number, advantages?: AdvantageItem[]): number {
  let extraR = 0;
  if (advantages) {
    const extraPvPoints = advantages
      .filter(adv => {
        const n = adv.name.toLowerCase();
        return n.includes('pontos de vida extra') || n.includes('pv extra') || n.includes('vida extra');
      })
      .reduce((sum, adv) => sum + Math.abs(computedCostPt(adv)), 0);
    extraR = extraPvPoints * 2;
  }
  return Math.max((resistencia + extraR) * 5, 1);
}

/**
 * Retorna o valor máximo de Pontos de Magia (PM) baseado na Resistência do personagem.
 */
export function getMaxPm(resistencia: number, advantages?: AdvantageItem[]): number {
  let extraR = 0;
  if (advantages) {
    const extraPmPoints = advantages
      .filter(adv => {
        const n = adv.name.toLowerCase();
        return n.includes('pontos de magia extra') || n.includes('pm extra') || n.includes('magia extra');
      })
      .reduce((sum, adv) => sum + Math.abs(computedCostPt(adv)), 0);
    extraR = extraPmPoints * 2;
  }
  return Math.max((resistencia + extraR) * 5, 1);
}

/**
 * Calcula o custo computado em pontos de uma vantagem, desvantagem ou perícia.
 */
export function computedCostPt(item: AdvantageItem): number {
  if (item.appliedCostPt !== undefined && typeof item.appliedCostPt === 'number') {
    return item.appliedCostPt;
  }
  if (!item.isModular) {
    const match = item.cost.match(/-?\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  const baseCost = item.baseCostPt || 0;
  const selectedCount = item.selectedModifiers?.length || 0;
  const lowerName = item.name.toLowerCase();

  // Regra específica para Manobras Especiais, Qualidades Especiais, Sentidos Especiais e Status Negativos: 1PT a cada 3 opções
  if (
    lowerName === 'manobras especiais' ||
    lowerName === 'qualidades especiais' ||
    lowerName === 'sentidos especiais' ||
    lowerName === 'status negativos'
  ) {
    return baseCost + Math.ceil(selectedCount / 3.0);
  }

  const selectedCost = (item.modifiers || [])
    .filter(m => item.selectedModifiers?.includes(m.id))
    .reduce((sum, m) => sum + (m.costPt || 0), 0);

  const total = baseCost + selectedCost;

  // Ataque Especial não pode custar menos de 1 ponto, mesmo com modificadores negativos.
  if (lowerName === 'ataque especial') {
    return Math.max(total, 1);
  }

  return total;
}

/**
 * Calcula a pontuação total gasta no personagem com base nas regras do 3D&T Alpha.
 */
export function calculateScore(character: Character): number {
  // Somatória dos valores de todos os atributos
  const attributesSum = Object.values(character.attributes_values).reduce(
    (sum, val) => sum + (val || 0),
    0
  );

  // Somatória do custo de vantagens
  const advantagesSum = character.advantages.reduce(
    (sum, item) => sum + computedCostPt(item),
    0
  );

  // Somatória do custo de desvantagens
  const disadvantagesSum = (character.disadvantages || []).reduce(
    (sum, item) => sum + computedCostPt(item),
    0
  );

  // Somatória do custo de perícias
  const skillsSum = (character.skills || []).reduce(
    (sum, item) => sum + computedCostPt(item),
    0
  );

  // Custo de especializações (1 ponto a cada 3 especializações)
  const specializationsSum = Math.floor((character.specializations?.length || 0) / 3);

  // Custo da Vantagem Única
  const uniqueAdvantageCost = character.unique_advantage?.cost || 0;

  return (
    attributesSum +
    advantagesSum +
    disadvantagesSum +
    skillsSum +
    specializationsSum +
    uniqueAdvantageCost +
    (character.saved_points || 0)
  );
}

/**
 * Executa uma rolagem customizada aplicando atributos e modificadores de acordo com as regras de 3D&T.
 */
export function executeCustomRoll(
  roll: CustomRoll,
  attributesValues: Record<string, number>,
  diceOverride?: number[],
  statusEffects?: string[],
  equippedModifiers?: Record<string, number>
): RollResult {
  let totalSum = 0;
  const parts: string[] = [];
  let isCriticalSummary = false;
  let totalCrits = 0;
  const allDice: number[] = [];

  const combatNameCheck = 
    roll.name.toLowerCase().includes('ataque') || 
    roll.name.toLowerCase().includes('defesa') || 
    roll.name.toLowerCase().includes('pdf') ||
    roll.name.toLowerCase().includes(' f ');

  let overrideIndex = 0;

  // 1. Processar dados de componentes
  (roll.components || []).forEach(comp => {
    let compTotal = 0;
    const rolls: number[] = [];

    for (let i = 0; i < comp.count; i++) {
      const die = (diceOverride && overrideIndex < diceOverride.length)
        ? diceOverride[overrideIndex++]
        : Math.floor(Math.random() * comp.faces) + 1;

      const currentCanCrit = comp.canCrit || combatNameCheck;
      const isCrit = currentCanCrit && (
        (comp.critRangeStart !== undefined && die >= comp.critRangeStart) ||
        (comp.critRangeStart === undefined && die === comp.faces)
      );

      if (isCrit) {
        totalCrits++;
        isCriticalSummary = true;
      }

      rolls.push(die);
      allDice.push(die);
      compTotal += die;
    }

    const finalCompTotal = comp.isNegative ? -compTotal : compTotal;
    totalSum += finalCompTotal + comp.bonus;

    const signPrefix = comp.isNegative ? '- ' : (parts.length > 0 ? '+ ' : '');
    const formattedRolls = rolls.map(d => {
      const isMax = (d === comp.faces && comp.canCrit);
      return isMax ? `${d}!` : `${d}`;
    }).join(',');

    const diceStr = `${comp.count}d${comp.faces} [${formattedRolls}]`;
    const bonusStr = comp.bonus !== 0 ? ` + ${comp.bonus}` : '';

    parts.push(`${signPrefix}${diceStr}${bonusStr}`);
  });

  // 2. Resolver Atributos & Críticos
  const effects = statusEffects || [];
  const modifiedAttrs = getModifiedAttributes(attributesValues, effects, equippedModifiers);
  const isDefenseRoll = roll.type === 'DEFENSE' || roll.name.toLowerCase().includes('defesa');

  const primaryVal = modifiedAttrs[roll.primaryAttribute] || 0;
  const secondaryVal = modifiedAttrs[roll.secondaryAttribute] || 0;

  const isArmorPrimary = roll.primaryAttribute === 'A' || roll.primaryAttribute.toLowerCase() === 'armadura';
  const isArmorSecondary = roll.secondaryAttribute === 'A' || roll.secondaryAttribute.toLowerCase() === 'armadura';

  const displayPrimary = (isArmorPrimary && isDefenseRoll && effects.includes('defending')) ? primaryVal * 2 : primaryVal;
  const displaySecondary = (isArmorSecondary && isDefenseRoll && effects.includes('defending')) ? secondaryVal * 2 : secondaryVal;

  // Calcular Multiplicador de Crítico
  let critMultiplier = 1;
  if (isCriticalSummary) {
    critMultiplier = roll.accumulateCrit ? 1 + totalCrits : 2;
  }

  const finalPrimary = displayPrimary * critMultiplier;
  totalSum += finalPrimary + displaySecondary + roll.globalModifier;

  // 3. Formatar Atributos
  if (roll.primaryAttribute !== 'none' && primaryVal !== 0) {
    const pName = roll.primaryAttribute.slice(0, 3).toUpperCase();
    const doubledInfo = (isArmorPrimary && isDefenseRoll && effects.includes('defending')) ? ' x2' : '';
    const critInfo = critMultiplier > 1 ? ` x${critMultiplier}!` : '';
    const prefix = parts.length > 0 ? '+ ' : '';
    parts.push(`${prefix}${pName} [${primaryVal}${doubledInfo}${critInfo}]`);
  }

  if (roll.secondaryAttribute !== 'none' && secondaryVal !== 0) {
    const sName = roll.secondaryAttribute.slice(0, 3).toUpperCase();
    const doubledInfo = (isArmorSecondary && isDefenseRoll && effects.includes('defending')) ? ' x2' : '';
    const prefix = parts.length > 0 ? '+ ' : '';
    parts.push(`${prefix}${sName} [${secondaryVal}${doubledInfo}]`);
  }

  // 4. Modificador Global
  if (roll.globalModifier !== 0) {
    const prefix = roll.globalModifier > 0 ? (parts.length > 0 ? '+ ' : '') : '- ';
    parts.push(`${prefix}[${Math.abs(roll.globalModifier)}]`);
  }

  // 5. String final de detalhes
  const finalString = `${parts.join(' ').replace(/\s+/g, ' ').trim()} = ${totalSum}`;

  return {
    total: totalSum,
    dices: allDice,
    modifiers: roll.globalModifier + displayPrimary + displaySecondary,
    isCrit: isCriticalSummary,
    componentsText: finalString
  };
}

/**
 * Calcula os bônus acumulados de equipamentos equipados.
 */
export function getEquippedItemsModifiers(inventory?: InventoryItem[]): Record<string, number> {
  const modifiers: Record<string, number> = { F: 0, H: 0, R: 0, A: 0, PdF: 0 };
  if (!inventory) return modifiers;

  inventory.forEach(item => {
    if (item.is_equipped && item.bonus_attribute && item.bonus_value) {
      const attr = item.bonus_attribute.toUpperCase();
      let key = attr;
      if (attr === 'FORÇA' || attr === 'FORCA') key = 'F';
      else if (attr === 'HABILIDADE') key = 'H';
      else if (attr === 'RESISTÊNCIA' || attr === 'RESISTENCIA') key = 'R';
      else if (attr === 'ARMADURA') key = 'A';
      else if (attr === 'PODER DE FOGO' || attr === 'PDF') key = 'PdF';

      if (key in modifiers) {
        modifiers[key] += item.bonus_value;
      }
    }
  });

  return modifiers;
}

/**
 * Calcula os atributos modificados por equipamentos e condições de status ativos.
 */
export function getModifiedAttributes(
  attributesValues: Record<string, number>,
  statusEffects?: string[],
  equippedModifiers?: Record<string, number>
): Record<string, number> {
  const modified = { ...attributesValues };

  // Somar bônus de equipamentos primeiro
  if (equippedModifiers) {
    Object.keys(equippedModifiers).forEach(key => {
      const abbrev = key.toUpperCase();
      if (abbrev in modified) {
        modified[abbrev] = (modified[abbrev] || 0) + equippedModifiers[key];
      }

      const fullName = abbrev === 'F' ? 'Força' :
                       abbrev === 'H' ? 'Habilidade' :
                       abbrev === 'R' ? 'Resistência' :
                       abbrev === 'A' ? 'Armadura' :
                       abbrev === 'PdF' ? 'Poder de Fogo' : '';
      if (fullName && fullName in modified) {
        modified[fullName] = (modified[fullName] || 0) + equippedModifiers[key];
      }
    });
  }

  const effects = statusEffects || [];

  if (effects.includes('helpless')) {
    modified['H'] = 0;
    modified['Habilidade'] = 0;
    modified['A'] = 0;
    modified['Armadura'] = 0;
  } else if (effects.includes('paralyzed')) {
    modified['H'] = 0;
    modified['Habilidade'] = 0;
  }

  return modified;
}

/**
 * Calcula os modificadores aplicados a ações/rolagens rápidas baseadas no sistema 3D&T, considerando os status.
 */
export function getQuickRollModifiers(
  actionName: string,
  attributesValues: Record<string, number>,
  statusEffects?: string[],
  equippedModifiers?: Record<string, number>
): number {
  const effects = statusEffects || [];
  const modified = getModifiedAttributes(attributesValues, effects, equippedModifiers);

  const fVal = modified['F'] || modified['Força'] || modified['Forca'] || 0;
  const hVal = modified['H'] || modified['Habilidade'] || 0;
  const aVal = modified['A'] || modified['Armadura'] || 0;

  if (actionName === 'Ataque') {
    return fVal + hVal;
  }
  if (actionName === 'Defesa') {
    if (effects.includes('defending')) {
      return (aVal * 2) + hVal;
    }
    return aVal + hVal;
  }
  if (actionName === 'Esquiva' || actionName === 'Iniciativa') {
    return hVal;
  }
  return 0;
}

/**
 * Realiza a conversão de PEs acumulados para Pontos Guardados (10 XP = 1 Ponto Guardado).
 */
export function convertXpToPoints(
  experience: number,
  addedXp: number,
  savedPoints: number
): { experience: number; saved_points: number } {
  const newXp = Math.max((experience || 0) + addedXp, 0);
  const extraPoints = Math.floor(newXp / 10);
  const finalXp = newXp % 10;
  const finalSavedPoints = (savedPoints || 0) + extraPoints;
  return {
    experience: finalXp,
    saved_points: finalSavedPoints
  };
}
