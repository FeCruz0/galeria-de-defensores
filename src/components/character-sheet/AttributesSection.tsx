'use client';

import React from 'react';
import { Heart, Zap, Shield, Dices } from 'lucide-react';
import { Character, RuleSystem } from '@/types/game';
import { computedCostPt } from '@/lib/rules';

interface AttributesSectionProps {
  systemDef: RuleSystem;
  character: Character;
  modifiedAttrs: Record<string, number>;
  pointsAvailable: number;
  handleTriggerAttributeRoll: (key: string, name: string, val: number) => void;
  handleAttributeChange: (key: string, diff: number) => void;
  handleResourceChange: (key: string, diff: number, max: number) => void;
  showToast: (msg: string) => void;
  themeConfig: {
    cardBgClass: string;
    borderClass: string;
  };
}

function evaluateResourceFormula(
  formula: string | undefined,
  baseAttributeKey: string,
  attributesValues: Record<string, number>,
  resourceKey: string,
  advantages: any[]
): number {
  const defaultFormula = `${baseAttributeKey} * 5`;
  const clean = (formula || defaultFormula).replace(/\s+/g, '');
  if (!clean) return 1;

  let extraR = 0;
  if (resourceKey === 'PV') {
    const extraPvPoints = (advantages || [])
      .filter(adv => {
        const n = adv.name.toLowerCase();
        return n.includes('pontos de vida extra') || n.includes('pv extra') || n.includes('vida extra');
      })
      .reduce((sum, adv) => sum + Math.abs(computedCostPt(adv)), 0);
    extraR = extraPvPoints * 2;
  } else if (resourceKey === 'PM') {
    const extraPmPoints = (advantages || [])
      .filter(adv => {
        const n = adv.name.toLowerCase();
        return n.includes('pontos de magia extra') || n.includes('pm extra') || n.includes('magia extra');
      })
      .reduce((sum, adv) => sum + Math.abs(computedCostPt(adv)), 0);
    extraR = extraPmPoints * 2;
  }

  const adjustedAttributes = { ...attributesValues };
  const rKeys = Array.from(new Set(['R', 'Resistência', 'Resistencia', baseAttributeKey].filter(Boolean)));
  rKeys.forEach(k => {
    if (adjustedAttributes[k] !== undefined) {
      adjustedAttributes[k] = adjustedAttributes[k] + extraR;
    }
  });

  let evalStr = clean;
  Object.keys(adjustedAttributes).forEach(k => {
    const regex = new RegExp(`\\b${k}\\b`, 'g');
    evalStr = evalStr.replace(regex, String(adjustedAttributes[k] || 0));
  });

  try {
    // eslint-disable-next-line no-new-func
    const evaluator = new Function(`return (${evalStr})`);
    const result = evaluator();
    if (typeof result === 'number' && !isNaN(result)) {
      return Math.max(1, Math.floor(result));
    }
  } catch (err) {
    console.error('Erro ao avaliar formula do recurso:', err);
  }

  const rVal = adjustedAttributes[baseAttributeKey] || adjustedAttributes['R'] || adjustedAttributes['Resistência'] || 0;
  return rVal === 0 ? 1 : rVal * 5;
}

function sortAttributeKeys(keys: string[], attributes: Record<string, any>): string[] {
  const defaultOrder = ['F', 'H', 'R', 'A', 'PdF'];
  return [...keys].sort((a, b) => {
    const orderA = attributes[a]?.displayOrder;
    const orderB = attributes[b]?.displayOrder;
    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    const indexA = defaultOrder.indexOf(a);
    const indexB = defaultOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
}

export default function AttributesSection({
  systemDef,
  character,
  modifiedAttrs,
  pointsAvailable,
  handleTriggerAttributeRoll,
  handleAttributeChange,
  handleResourceChange,
  showToast,
  themeConfig
}: AttributesSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Section: Atributos & Estatísticas */}
      <div className={`${themeConfig.cardBgClass} border ${themeConfig.borderClass} rounded-2xl p-6 shadow-xl space-y-5 transition-colors duration-300`}>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Atributos</h2>
        
        <div className="space-y-4">
          {sortAttributeKeys(Object.keys(systemDef.attributes), systemDef.attributes).map((key) => {
            const attr = systemDef.attributes[key];
            const value = character.attributes_values[key] ?? 0;
            const modValue = modifiedAttrs[key] ?? value;
            const bonus = modValue - value;
            return (
              <div key={key} className="flex justify-between items-center bg-slate-800/20 border border-slate-800/60 rounded-xl p-3">
                <button
                  type="button"
                  onClick={() => handleTriggerAttributeRoll(key, attr.name, modValue)}
                  className="flex items-center gap-1.5 font-medium text-slate-300 hover:text-purple-400 group cursor-pointer transition-colors text-left"
                  title={`Testar Atributo ${attr.name}`}
                >
                  <Dices className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors shrink-0" />
                  <span>{attr.name}</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAttributeChange(key, -1)}
                    className="w-7 h-7 bg-slate-850 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-lg flex items-center justify-center text-sm"
                  >
                    -
                  </button>
                  <span className="w-16 text-center font-bold text-slate-200 text-base flex justify-center items-center gap-1 font-mono">
                    {value}
                    {bonus > 0 && (
                      <span className="text-[10px] text-emerald-400 font-bold font-sans shrink-0">(+{bonus})</span>
                    )}
                    {bonus < 0 && (
                      <span className="text-[10px] text-rose-500 font-bold font-sans shrink-0">({bonus})</span>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      if (pointsAvailable < 1) {
                        showToast("Saldo de Pontos Guardados insuficiente.");
                      } else {
                        handleAttributeChange(key, 1);
                      }
                    }}
                    className={`w-7 h-7 border text-slate-300 font-bold rounded-lg flex items-center justify-center text-sm transition-all ${
                      pointsAvailable < 1
                        ? 'opacity-40 bg-slate-800/20 border-slate-850 cursor-not-allowed'
                        : 'bg-slate-850 hover:bg-slate-700 border-slate-700 cursor-pointer active:scale-95'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Recursos (PV / PM) */}
      <div className={`${themeConfig.cardBgClass} border ${themeConfig.borderClass} rounded-2xl p-6 shadow-xl space-y-6 transition-colors duration-300`}>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Recursos</h2>
        
        {Object.keys(systemDef.resources || {})
          .sort((a, b) => {
            if (a === 'PV' && b === 'PM') return -1;
            if (a === 'PM' && b === 'PV') return 1;
            return a.localeCompare(b);
          })
          .map((key) => {
            const res = systemDef.resources[key];
            const maxVal = evaluateResourceFormula(res.formula, res.baseAttributeKey, modifiedAttrs, key, character.advantages);
            const currentVal = character.resources_current[key] ?? maxVal;

            let colorClass = "from-rose-600 to-rose-500";
            let textColorClass = "text-rose-400";
            let Icon = Heart;

            if (key === 'PM' || res.name.toLowerCase().includes('magia') || res.name.toLowerCase().includes('mana')) {
              colorClass = "from-cyan-600 to-cyan-500";
              textColorClass = "text-cyan-400";
              Icon = Zap;
            } else if (key !== 'PV') {
              colorClass = "from-emerald-600 to-emerald-500";
              textColorClass = "text-emerald-400";
              Icon = Shield;
            }

            return (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className={`flex items-center gap-1.5 ${textColorClass} font-semibold`}>
                    <Icon className="w-4 h-4" />
                    {res.name}
                  </span>
                  <span className="font-bold text-slate-200">
                    {currentVal} / {maxVal}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${colorClass} transition-all duration-300`}
                    style={{ width: `${Math.min(100, maxVal > 0 ? (currentVal / maxVal) * 100 : 0)}%` }}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button 
                    onClick={() => handleResourceChange(key, -5, maxVal)}
                    className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold transition-colors duration-200 cursor-pointer"
                  >
                    -5
                  </button>
                  <button 
                    onClick={() => handleResourceChange(key, -1, maxVal)}
                    className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold transition-colors duration-200 cursor-pointer"
                  >
                    -1
                  </button>
                  <button 
                    onClick={() => handleResourceChange(key, 1, maxVal)}
                    className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold transition-colors duration-200 cursor-pointer"
                  >
                    +1
                  </button>
                  <button 
                    onClick={() => handleResourceChange(key, 5, maxVal)}
                    className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold transition-colors duration-200 cursor-pointer"
                  >
                    +5
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
