import { z } from 'zod';

// Esquemas de validação básicos com Zod
export const attributeDefinitionSchema = z.object({
  id: z.string().uuid('ID inválido'),
  key: z.string().min(1, 'Chave é obrigatória').max(10, 'Chave muito longa'),
  name: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome muito longo'),
});

export const resourceDefinitionSchema = z.object({
  id: z.string().uuid('ID inválido'),
  key: z.string().min(1, 'Chave é obrigatória').max(10, 'Chave muito longa'),
  name: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome muito longo'),
  baseAttributeKey: z.string().min(1, 'Atributo base é obrigatório'),
});

export const ruleSystemSchema = z.object({
  name: z.string().min(3, 'Nome do sistema deve ter pelo menos 3 caracteres').max(100),
  description: z.string().max(500).optional(),
  attributes: z.record(z.string(), z.any()),
  resources: z.record(z.string(), z.any()),
});

export const characterSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  concept: z.string().max(100).optional(),
  points_total: z.number().int().nonnegative(),
  points_spent: z.number().int().nonnegative(),
  attributes_values: z.record(z.string(), z.number().int()),
  resources_current: z.record(z.string(), z.number().int()),
  saved_points: z.number().int().nonnegative(),
  experience: z.number().int().nonnegative(),
  annotations: z.string().optional(),
});

interface UniqueItem {
  id: string;
  key: string;
  name: string;
}

/**
 * Valida a unicidade case-insensitive de chaves e nomes entre atributos e recursos
 * do mesmo sistema de regras customizado.
 */
export function validateUniqueNameAndKey(
  items: UniqueItem[],
  newKey: string,
  newName: string,
  currentId?: string
): { valid: boolean; error?: string } {
  const normKey = newKey.trim().toLowerCase();
  const normName = newName.trim().toLowerCase();

  for (const item of items) {
    if (currentId && item.id === currentId) {
      continue;
    }
    if (item.key.trim().toLowerCase() === normKey) {
      return { valid: false, error: `A chave "${newKey}" já está em uso.` };
    }
    if (item.name.trim().toLowerCase() === normName) {
      return { valid: false, error: `O nome "${newName}" já está em uso.` };
    }
  }

  return { valid: true };
}

/**
 * Valida se uma fórmula matemática de recurso é estruturalmente correta
 * e se refere apenas a chaves de atributos válidas.
 */
export function validateFormula(formula: string, attributeKeys: string[]): { valid: boolean; error?: string } {
  const clean = formula.replace(/\s+/g, '');
  if (!clean) {
    return { valid: false, error: 'A fórmula não pode ser vazia.' };
  }

  // Tokenizar em palavras, números e operadores
  const tokens = clean.match(/[a-zA-Z]+|[0-9]+|[\+\-\*\/\(\)\.]/g);
  if (!tokens || tokens.join('') !== clean) {
    return { valid: false, error: 'A fórmula contém caracteres não permitidos.' };
  }

  for (const token of tokens) {
    if (/^[a-zA-Z]+$/.test(token)) {
      if (!attributeKeys.includes(token)) {
        return { valid: false, error: `O atributo "${token}" referenciado na fórmula não existe.` };
      }
    }
  }

  // Validar avaliação sintática
  try {
    let evalStr = clean;
    attributeKeys.forEach(k => {
      const regex = new RegExp(`\\b${k}\\b`, 'g');
      evalStr = evalStr.replace(regex, '1');
    });

    if (!/^[0-9\+\-\*\/\(\)\.]+$/.test(evalStr)) {
      return { valid: false, error: 'Fórmula em formato inválido.' };
    }

    // eslint-disable-next-line no-new-func
    const testEval = new Function(`return (${evalStr})`);
    const result = testEval();
    if (typeof result !== 'number' || isNaN(result)) {
      return { valid: false, error: 'A fórmula não produz um número válido.' };
    }
  } catch (err) {
    return { valid: false, error: 'A fórmula matemática possui erros de sintaxe.' };
  }

  return { valid: true };
}

/**
 * Verifica se um atributo pode ser alterado com base nos pontos guardados (savedPoints).
 * Incrementar (delta > 0) custa 1 ponto.
 * Decrementar (delta < 0) só é possível se o valor atual for maior que 0.
 */
export function canAlterAttribute(currentValue: number, delta: number, savedPoints: number): boolean {
  if (delta > 0) {
    return savedPoints >= 1;
  }
  if (delta < 0) {
    return currentValue > 0;
  }
  return true;
}

/**
 * Verifica se o personagem pode pagar o custo em pontos de uma vantagem ou modificador.
 * Custos positivos exigem que savedPoints seja maior ou igual ao custo.
 * Custos negativos (desvantagens) são sempre aceitos (pois devolvem/adicionam pontos).
 */
export function canAffordCost(costPt: number, savedPoints: number): boolean {
  if (costPt > 0) {
    return savedPoints >= costPt;
  }
  return true;
}

/**
 * Verifica se um personagem pode ser vinculado a uma mesa com base no sistema de regras.
 * Se a mesa não possuir sistema de regras (legado), o vínculo é permitido por compatibilidade.
 * Se a mesa possuir sistema de regras, o personagem deve ter exatamente o mesmo rule_system_id.
 */
export function canLinkCharacterToTable(
  tableRuleSystemId: string | undefined | null,
  characterRuleSystemId: string | undefined | null
): boolean {
  if (!tableRuleSystemId) return true;
  return tableRuleSystemId === characterRuleSystemId;
}

/**
 * Valida se o novo tipo de dano é válido e não duplicado.
 */
export function validateDamageType(
  existingTypes: string[],
  newType: string
): { valid: boolean; error?: string } {
  const clean = newType.trim();
  if (!clean) {
    return { valid: false, error: 'O tipo de dano não pode ser vazio.' };
  }
  if (existingTypes.some(t => t.trim().toLowerCase() === clean.toLowerCase())) {
    return { valid: false, error: `O tipo de dano "${clean}" já existe.` };
  }
  return { valid: true };
}
