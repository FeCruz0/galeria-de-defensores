'use client';

import React, { useState } from 'react';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import { Character, RuleSystem } from '@/types/game';

interface CustomRollsSectionProps {
  character: Character;
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  systemDef: RuleSystem;
  handleTriggerCustomRoll: (roll: any) => void;
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

export default function CustomRollsSection({
  character,
  setCharacter,
  systemDef,
  handleTriggerCustomRoll
}: CustomRollsSectionProps) {
  const [isAddingRoll, setIsAddingRoll] = useState(false);
  
  // Form states for creating custom rolls
  const [newRollName, setNewRollName] = useState('');
  const [newRollDesc, setNewRollDesc] = useState('');
  const [newRollGlobalMod, setNewRollGlobalMod] = useState(0);
  const [newRollPrimaryAttr, setNewRollPrimaryAttr] = useState('none');
  const [newRollSecondaryAttr, setNewRollSecondaryAttr] = useState('none');
  const [newRollAccumulateCrit, setNewRollAccumulateCrit] = useState(false);
  const [newRollType, setNewRollType] = useState<'ATTACK' | 'DEFENSE' | 'MAGIC' | 'TEST' | 'INITIATIVE' | 'OTHER'>('OTHER');
  const [newRollPmCost, setNewRollPmCost] = useState(0);
  
  const [newRollComponents, setNewRollComponents] = useState<any[]>([
    {
      id: crypto.randomUUID(),
      count: 1,
      faces: 6,
      bonus: 0,
      isNegative: false,
      canCrit: true,
      critMultiplier: 2
    }
  ]);

  const handleCreateCustomRoll = () => {
    if (!newRollName.trim()) return;

    const newRoll = {
      id: crypto.randomUUID(),
      name: newRollName.trim(),
      description: newRollDesc.trim(),
      components: newRollComponents,
      globalModifier: newRollGlobalMod,
      primaryAttribute: newRollPrimaryAttr,
      secondaryAttribute: newRollSecondaryAttr,
      accumulateCrit: newRollAccumulateCrit,
      pmCost: newRollPmCost,
      type: newRollType
    };

    setCharacter(prev => prev ? {
      ...prev,
      custom_rolls: [...(prev.custom_rolls || []), newRoll as any]
    } : null);

    // Reset form
    setNewRollName('');
    setNewRollDesc('');
    setNewRollGlobalMod(0);
    setNewRollPrimaryAttr('none');
    setNewRollSecondaryAttr('none');
    setNewRollAccumulateCrit(false);
    setNewRollComponents([
      {
        id: crypto.randomUUID(),
        count: 1,
        faces: 6,
        bonus: 0,
        isNegative: false,
        canCrit: true,
        critMultiplier: 2
      }
    ]);
    setNewRollType('OTHER');
    setNewRollPmCost(0);
    setIsAddingRoll(false);
  };

  const handleDeleteCustomRoll = (rollId: string) => {
    setCharacter(prev => prev ? {
      ...prev,
      custom_rolls: (prev.custom_rolls || []).filter(r => r.id !== rollId)
    } : null);
  };

  return (
    <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Rolagens Customizadas
        </h3>
        <button
          onClick={() => setIsAddingRoll(true)}
          className="text-xs text-amber-400 bg-amber-950/20 border border-amber-800/35 px-2.5 py-1 rounded-lg font-semibold hover:bg-amber-950/40 transition-all flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Rolagem
        </button>
      </div>

      {/* Formulário para Nova Rolagem */}
      {isAddingRoll && (
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
          <span className="text-xs font-bold text-slate-350 block">Nova Rolagem Avançada</span>
          
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newRollName}
              onChange={(e) => setNewRollName(e.target.value)}
              placeholder="Nome do ataque/ação (ex: Espada Flamejante)"
              maxLength={100}
              className="col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-slate-200"
            />
            
            <input
              type="text"
              value={newRollDesc}
              onChange={(e) => setNewRollDesc(e.target.value)}
              placeholder="Descrição do efeito"
              maxLength={500}
              className="col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-slate-200"
            />

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold block">Tipo de Ação</label>
              <select
                value={newRollType}
                onChange={(e: any) => setNewRollType(e.target.value)}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-305"
              >
                <option value="ATTACK">Ataque</option>
                <option value="DEFENSE">Defesa</option>
                <option value="MAGIC">Magia</option>
                <option value="TEST">Teste</option>
                <option value="INITIATIVE">Iniciativa</option>
                <option value="OTHER">Outros</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold block">Custo de PM</label>
              <input
                type="number"
                min="0"
                value={newRollPmCost}
                onChange={(e) => setNewRollPmCost(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold block">Atributo 1</label>
              <select
                value={newRollPrimaryAttr}
                onChange={(e) => setNewRollPrimaryAttr(e.target.value)}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-350"
              >
                <option value="none">Nenhum</option>
                {sortAttributeKeys(Object.keys(systemDef.attributes), systemDef.attributes).map(k => (
                  <option key={k} value={k}>{systemDef.attributes[k].name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold block">Atributo 2</label>
              <select
                value={newRollSecondaryAttr}
                onChange={(e) => setNewRollSecondaryAttr(e.target.value)}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-355"
              >
                <option value="none">Nenhum</option>
                {sortAttributeKeys(Object.keys(systemDef.attributes), systemDef.attributes).map(k => (
                  <option key={k} value={k}>{systemDef.attributes[k].name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold block">Mod. Global</label>
              <input
                type="number"
                value={newRollGlobalMod}
                onChange={(e) => setNewRollGlobalMod(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-slate-200"
              />
            </div>

            <div className="space-y-1 flex items-center justify-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRollAccumulateCrit}
                  onChange={(e) => setNewRollAccumulateCrit(e.target.checked)}
                  className="accent-amber-500 cursor-pointer"
                />
                <span className="text-xs text-slate-300">Acumular Críticos</span>
              </label>
            </div>
          </div>

          {/* Componentes de Dados */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Componentes de Dados</span>
              <button
                type="button"
                onClick={() => {
                  setNewRollComponents(prev => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      count: 1,
                      faces: 6,
                      bonus: 0,
                      isNegative: false,
                      canCrit: true,
                      critMultiplier: 2
                    }
                  ]);
                }}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
              >
                + Add Dados
              </button>
            </div>

            {newRollComponents.map((comp, idx) => (
              <div key={comp.id} className="grid grid-cols-4 sm:grid-cols-6 gap-2 bg-slate-950/20 border border-slate-900 rounded-xl p-2.5 items-center relative">
                {newRollComponents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewRollComponents(prev => prev.filter(c => c.id !== comp.id));
                    }}
                    className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-800/30 text-rose-400 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer"
                  >
                    ×
                  </button>
                )}

                <div className="space-y-0.5">
                  <label className="text-[8px] text-slate-500 uppercase font-semibold">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    value={comp.count}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                      setNewRollComponents(prev => prev.map(c => c.id === comp.id ? { ...c, count: val } : c));
                    }}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-1 text-center text-xs text-slate-200"
                  />
                </div>

                <div className="space-y-0.5 col-span-2">
                  <label className="text-[8px] text-slate-500 uppercase font-semibold block text-center">Tipo</label>
                  <select
                    value={comp.faces}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 6;
                      setNewRollComponents(prev => prev.map(c => c.id === comp.id ? { ...c, faces: val } : c));
                    }}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-1 text-center text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="4">d4</option>
                    <option value="6">d6</option>
                    <option value="8">d8</option>
                    <option value="10">d10</option>
                    <option value="12">d12</option>
                    <option value="20">d20</option>
                    <option value="100">d100</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[8px] text-slate-500 uppercase font-semibold block text-center">Bônus</label>
                  <input
                    type="number"
                    value={comp.bonus}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setNewRollComponents(prev => prev.map(c => c.id === comp.id ? { ...c, bonus: val } : c));
                    }}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-1 text-center text-xs text-slate-200"
                  />
                </div>

                <div className="space-y-0.5 col-span-2 sm:col-span-1 flex flex-col items-center">
                  <span className="text-[8px] text-slate-500 uppercase font-semibold block mb-0.5">Sinal</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewRollComponents(prev => prev.map(c => c.id === comp.id ? { ...c, isNegative: !c.isNegative } : c));
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      comp.isNegative 
                        ? 'bg-rose-950/20 border-rose-850 text-rose-400' 
                        : 'bg-emerald-950/20 border-emerald-850 text-emerald-400'
                    }`}
                  >
                    {comp.isNegative ? 'Subtrair (-)' : 'Somar (+)'}
                  </button>
                </div>

                <div className="space-y-0.5 col-span-2 sm:col-span-1 flex flex-col items-center">
                  <span className="text-[8px] text-slate-500 uppercase font-semibold block mb-0.5">Críticos</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewRollComponents(prev => prev.map(c => c.id === comp.id ? { ...c, canCrit: !c.canCrit } : c));
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      comp.canCrit 
                        ? 'bg-purple-950/20 border-purple-850 text-purple-400' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    {comp.canCrit ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsAddingRoll(false)}
              className="flex-1 bg-slate-805 hover:bg-slate-700 text-slate-350 border border-slate-800 rounded-xl py-2 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateCustomRoll}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-2 text-xs font-semibold cursor-pointer"
            >
              Salvar Rolagem
            </button>
          </div>
        </div>
      )}

      {/* Listagem de Rolagens Salvas */}
      <div className="space-y-2">
        {(character.custom_rolls || []).map((roll) => (
          <div key={roll.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4">
            <button
              onClick={() => handleTriggerCustomRoll(roll)}
              className="flex-1 text-left min-w-0 group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200 text-sm group-hover:text-amber-400 transition-colors">
                  {roll.name}
                </span>
                <span className="text-[9px] bg-slate-950/60 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                  {roll.components?.map((c: any) => `${c.count}d${c.faces}`).join(' + ')}
                  {roll.primaryAttribute !== 'none' && ` + ${systemDef.attributes[roll.primaryAttribute]?.name || roll.primaryAttribute}`}
                  {roll.secondaryAttribute !== 'none' && ` + ${systemDef.attributes[roll.secondaryAttribute]?.name || roll.secondaryAttribute}`}
                  {roll.globalModifier !== 0 && ` ${roll.globalModifier > 0 ? '+' : ''}${roll.globalModifier}`}
                </span>
                {roll.pmCost !== undefined && roll.pmCost > 0 && (
                  <span className="text-[9px] bg-cyan-950/40 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">
                    {roll.pmCost} PM
                  </span>
                )}
              </div>
              {roll.description && (
                <p className="text-xs text-slate-500 italic mt-0.5 truncate">{roll.description}</p>
              )}
            </button>
            <button
              onClick={() => handleDeleteCustomRoll(roll.id)}
              className="p-1.5 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!character.custom_rolls?.length && (
          <p className="text-xs text-slate-500 italic py-2">Nenhuma rolagem customizada criada.</p>
        )}
      </div>
    </div>
  );
}
