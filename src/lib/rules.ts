import { Character, AdvantageItem, CustomRoll, RollResult } from '../types/game';

/**
 * Retorna o valor máximo de Pontos de Vida (PV) baseado na Resistência do personagem.
 */
export function getMaxPv(resistencia: number): number {
  return Math.max(resistencia * 5, 1);
}

/**
 * Retorna o valor máximo de Pontos de Magia (PM) baseado na Resistência do personagem.
 */
export function getMaxPm(resistencia: number): number {
  return Math.max(resistencia * 5, 1);
}

/**
 * Calcula o custo computado em pontos de uma vantagem, desvantagem ou perícia.
 */
export function computedCostPt(item: AdvantageItem): number {
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
  diceOverride?: number[]
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
  const primaryVal = attributesValues[roll.primaryAttribute] || 0;
  const secondaryVal = attributesValues[roll.secondaryAttribute] || 0;

  // Calcular Multiplicador de Crítico
  let critMultiplier = 1;
  if (isCriticalSummary) {
    critMultiplier = roll.accumulateCrit ? 1 + totalCrits : 2;
  }

  const finalPrimary = primaryVal * critMultiplier;
  totalSum += finalPrimary + secondaryVal + roll.globalModifier;

  // 3. Formatar Atributos
  if (roll.primaryAttribute !== 'none' && primaryVal !== 0) {
    const pName = roll.primaryAttribute.slice(0, 3).toUpperCase();
    const critInfo = critMultiplier > 1 ? ` x${critMultiplier}!` : '';
    const prefix = parts.length > 0 ? '+ ' : '';
    parts.push(`${prefix}${pName} [${primaryVal}${critInfo}]`);
  }

  if (roll.secondaryAttribute !== 'none' && secondaryVal !== 0) {
    const sName = roll.secondaryAttribute.slice(0, 3).toUpperCase();
    const prefix = parts.length > 0 ? '+ ' : '';
    parts.push(`${prefix}${sName} [${secondaryVal}]`);
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
    modifiers: roll.globalModifier + primaryVal + secondaryVal,
    isCrit: isCriticalSummary,
    componentsText: finalString
  };
}
