'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Shield, BookOpen, Info, Pencil, Trash2 } from 'lucide-react';
import { Character, AdvantageItem, ModifierOption } from '@/types/game';
import { computedCostPt } from '@/lib/rules';
import { canAffordCost } from '@/lib/validations';
import { alphaAdvantages, alphaDisadvantages, alphaSkills, alphaSpecializations } from '@/lib/catalogs/alpha-catalog';
import { gaidenAdvantages, gaidenDisadvantages, gaidenSkills } from '@/lib/catalogs/gaiden-catalog';

interface AdvantagesSectionProps {
  character: Character;
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  pointsAvailable: number;
  systemDef: any;
  showToast: (msg: string) => void;
  setEditingAbilityItem: (item: { item: AdvantageItem; type: 'advantages' | 'disadvantages' | 'skills' | 'specializations' } | null) => void;
  setActiveDescriptionItem: (item: { name: string; cost: string; description: string } | null) => void;
  themeConfig: {
    cardBgClass: string;
    borderClass: string;
  };
}

const typeBadgeColors: Record<string, string> = {
  advantages: 'text-purple-400 bg-purple-950/40 border-purple-800/30',
  disadvantages: 'text-rose-400 bg-rose-950/40 border-rose-800/30',
  skills: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/30',
  specializations: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30',
  unique_advantage: 'text-amber-400 bg-amber-950/40 border-amber-800/30'
};

const typeLabels: Record<string, string> = {
  advantages: 'Vantagem',
  disadvantages: 'Desvantagem',
  skills: 'Perícia',
  specializations: 'Especialização',
  unique_advantage: 'Vantagem Única'
};

const enrichAdvantages = (items: any[], isGai: boolean) => {
  const baseCatalog = isGai ? gaidenAdvantages : alphaAdvantages;
  return items.map(item => {
    const baseItem = baseCatalog.find(b => b.name.toLowerCase() === item.name.toLowerCase());
    if (baseItem && baseItem.isModular) {
      return {
        ...item,
        isModular: true,
        baseCostPt: item.baseCostPt !== undefined ? item.baseCostPt : (baseItem.baseCostPt || 0),
        modifiers: item.modifiers?.length ? item.modifiers : (baseItem.modifiers || [])
      };
    }
    return item;
  });
};

const enrichDisadvantages = (items: any[], isGai: boolean) => {
  const baseCatalog = isGai ? gaidenDisadvantages : alphaDisadvantages;
  return items.map(item => {
    const baseItem = baseCatalog.find(b => b.name.toLowerCase() === item.name.toLowerCase());
    if (baseItem && baseItem.isModular) {
      return {
        ...item,
        isModular: true,
        baseCostPt: item.baseCostPt !== undefined ? item.baseCostPt : (baseItem.baseCostPt || 0),
        modifiers: item.modifiers?.length ? item.modifiers : (baseItem.modifiers || [])
      };
    }
    return item;
  });
};

export default function AdvantagesSection({
  character,
  setCharacter,
  pointsAvailable,
  systemDef,
  showToast,
  setEditingAbilityItem,
  setActiveDescriptionItem,
  themeConfig
}: AdvantagesSectionProps) {
  const [isAddingAdvantageExpanded, setIsAddingAdvantageExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Manual addition form states
  const [newAdvName, setNewAdvName] = useState('');
  const [newAdvCost, setNewAdvCost] = useState('1');
  const [newAdvDesc, setNewAdvDesc] = useState('');
  const [advType, setAdvType] = useState<'advantages' | 'disadvantages' | 'skills' | 'specializations'>('advantages');

  // Modular catalog addition states
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<any>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  const isGaiden = systemDef.name?.toLowerCase().includes('gaiden') || false;

  const currentCatalog = useMemo(() => {
    if (systemDef.advantages?.length || systemDef.disadvantages?.length || systemDef.skills?.length) {
      return {
        advantages: enrichAdvantages(systemDef.advantages || [], isGaiden),
        disadvantages: enrichDisadvantages(systemDef.disadvantages || [], isGaiden),
        skills: systemDef.skills || [],
        specializations: systemDef.specializations || alphaSpecializations
      };
    }
    if (isGaiden) {
      return {
        advantages: gaidenAdvantages,
        disadvantages: gaidenDisadvantages,
        skills: gaidenSkills,
        specializations: alphaSpecializations
      };
    }
    return {
      advantages: alphaAdvantages,
      disadvantages: alphaDisadvantages,
      skills: alphaSkills,
      specializations: alphaSpecializations
    };
  }, [systemDef, isGaiden]);

  const allCatalogItems = useMemo(() => {
    const list: {
      name: string;
      description: string;
      cost: string;
      type: 'advantages' | 'disadvantages' | 'skills' | 'specializations' | 'unique_advantage';
      originalItem: any;
    }[] = [];

    (currentCatalog.advantages || []).forEach((item: any) => {
      list.push({
        name: item.name,
        description: item.description || '',
        cost: typeof item.cost === 'number' ? `${item.cost}pt` : String(item.cost || '0'),
        type: 'advantages',
        originalItem: item
      });
    });

    (currentCatalog.disadvantages || []).forEach((item: any) => {
      list.push({
        name: item.name,
        description: item.description || '',
        cost: typeof item.cost === 'number' ? `${item.cost}pt` : String(item.cost || '0'),
        type: 'disadvantages',
        originalItem: item
      });
    });

    (currentCatalog.skills || []).forEach((item: any) => {
      list.push({
        name: item.name,
        description: item.description || '',
        cost: typeof item.cost === 'number' ? `${item.cost}pt` : String(item.cost || '0'),
        type: 'skills',
        originalItem: item
      });
    });

    (currentCatalog.specializations || []).forEach((item: any) => {
      list.push({
        name: item.name,
        description: item.description || '',
        cost: typeof item.cost === 'number' ? `${item.cost}pt` : String(item.cost || '0'),
        type: 'specializations',
        originalItem: item
      });
    });

    return list;
  }, [currentCatalog]);

  const handleSelectCatalogItem = (item: any) => {
    setSearchQuery('');
    
    if (item.type === 'unique_advantage') {
      const oldCost = character.unique_advantage?.cost || 0;
      const newCost = parseInt(item.cost, 10) || 0;
      const diff = newCost - oldCost;
      if (!canAffordCost(diff, character.saved_points || 0)) {
        showToast("Saldo de Pontos Guardados insuficiente para esta Vantagem Única.");
        return;
      }
      setCharacter(prev => prev ? {
        ...prev,
        saved_points: (prev.saved_points || 0) - diff,
        unique_advantage: {
          id: crypto.randomUUID(),
          name: item.name,
          description: item.description,
          cost: newCost
        }
      } : null);
      return;
    }

    if (item.originalItem.isModular) {
      setSelectedCatalogItem(item.originalItem);
      setSelectedModifiers([]);
      setAdvType('advantages');
    } else {
      setNewAdvName(item.name);
      setNewAdvCost(item.cost.replace('pt', ''));
      setNewAdvDesc(item.description);
      setAdvType(item.type);
    }
  };

  const handleAddModularItem = () => {
    if (!selectedCatalogItem) return;

    const newItem: AdvantageItem = {
      id: crypto.randomUUID(),
      name: selectedCatalogItem.name,
      description: selectedCatalogItem.description,
      cost: 'Modular',
      isModular: true,
      baseCostPt: selectedCatalogItem.baseCostPt || 0,
      modifiers: selectedCatalogItem.modifiers || [],
      selectedModifiers: selectedModifiers
    };

    const costPt = computedCostPt(newItem);
    if (!canAffordCost(costPt, character.saved_points || 0)) {
      showToast("Saldo de Pontos Guardados insuficiente.");
      return;
    }

    setCharacter(prev => prev ? {
      ...prev,
      saved_points: (prev.saved_points || 0) - costPt,
      advantages: [...(prev.advantages || []), newItem]
    } : null);

    setSelectedCatalogItem(null);
    setSelectedModifiers([]);
  };

  const handleAddAdvantage = () => {
    if (!newAdvName.trim()) return;

    const newItem: AdvantageItem = {
      id: crypto.randomUUID(),
      name: newAdvName.trim(),
      cost: newAdvCost,
      description: newAdvDesc.trim()
    };

    const costPt = computedCostPt(newItem);
    if (!canAffordCost(costPt, character.saved_points || 0)) {
      showToast("Saldo de Pontos Guardados insuficiente.");
      return;
    }

    const targetList = character[advType] || [];

    setCharacter(prev => prev ? {
      ...prev,
      saved_points: (prev.saved_points || 0) - costPt,
      [advType]: [...targetList, newItem]
    } : null);

    setNewAdvName('');
    setNewAdvDesc('');
  };

  const handleDeleteAdvantage = (type: 'advantages' | 'disadvantages' | 'skills' | 'specializations', itemId: string) => {
    const targetList = character[type] || [];
    const itemToDelete = targetList.find(item => item.id === itemId);
    if (!itemToDelete) return;

    const costPt = computedCostPt(itemToDelete);
    if (costPt < 0 && (character.saved_points || 0) + costPt < 0) {
      showToast("Saldo de Pontos Guardados insuficiente para remover esta desvantagem.");
      return;
    }

    setCharacter(prev => prev ? {
      ...prev,
      saved_points: (prev.saved_points || 0) + costPt,
      [type]: targetList.filter(item => item.id !== itemId)
    } : null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Adicionar Vantagem / Perícia */}
      <div className={`${themeConfig.cardBgClass} border ${themeConfig.borderClass} rounded-2xl shadow-xl transition-all`}>
        <button
          onClick={() => setIsAddingAdvantageExpanded(!isAddingAdvantageExpanded)}
          className="w-full flex justify-between items-center p-6 text-left focus:outline-none cursor-pointer"
        >
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Plus className={`w-4 h-4 text-purple-400 transition-transform duration-300 ${isAddingAdvantageExpanded ? 'rotate-45' : ''}`} />
            Adicionar Habilidade / Vantagem
          </h2>
          <span className="text-xs font-semibold text-purple-400 bg-purple-950/40 border border-purple-800/20 px-2.5 py-1 rounded-lg hover:bg-purple-900/20 transition-all">
            {isAddingAdvantageExpanded ? 'Minimizar' : 'Mostrar Opções'}
          </span>
        </button>
        
        {isAddingAdvantageExpanded && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-800/40 space-y-4 animate-fade-in">
            {/* Campo de Busca no Catálogo */}
            <div className="relative">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Buscar no Catálogo do Sistema
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: Ataque Especial, Código de Honra..."
                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 text-slate-200"
              />
              {searchQuery && (
                <div className="absolute left-0 right-0 mt-1.5 bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                  {allCatalogItems
                    .filter((item: any) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item: any) => {
                      let isCatalogItemTooExpensive = false;
                      if (item.type === 'unique_advantage') {
                        const oldCost = character.unique_advantage?.cost || 0;
                        const newCost = parseInt(item.cost, 10) || 0;
                        const diff = newCost - oldCost;
                        isCatalogItemTooExpensive = diff > 0 && pointsAvailable < diff;
                      } else {
                        const costVal = parseInt(item.cost, 10) || 0;
                        isCatalogItemTooExpensive = costVal > 0 && pointsAvailable < costVal;
                      }
                      return (
                        <button
                          key={`${item.type}-${item.name}`}
                          onClick={() => {
                            if (isCatalogItemTooExpensive) {
                              showToast("Saldo de Pontos Guardados insuficiente.");
                            } else {
                              handleSelectCatalogItem(item);
                            }
                          }}
                          className={`w-full text-left px-4 py-2.5 border-b border-slate-900/60 last:border-b-0 transition-colors ${
                            isCatalogItemTooExpensive
                              ? 'opacity-40 hover:bg-rose-950/5'
                              : 'hover:bg-purple-950/20'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${isCatalogItemTooExpensive ? 'text-slate-500' : 'text-slate-200'}`}>{item.name}</span>
                              <span className={`text-[9px] border px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${typeBadgeColors[item.type]}`}>
                                {typeLabels[item.type]}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
                              isCatalogItemTooExpensive
                                ? 'text-rose-400 bg-rose-950/30 border-rose-900/20'
                                : 'text-purple-400 bg-purple-950/40 border-purple-800/20'
                            }`}>
                              {item.cost}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{item.description}</p>
                        </button>
                      );
                    })}
                  {allCatalogItems.filter((item: any) => item.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="p-4 text-xs text-slate-500 italic text-center">Nenhum resultado encontrado no catálogo.</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="border-t border-slate-800/60 my-4 pt-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">
                Ou criar manualmente:
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                value={newAdvName}
                onChange={(e) => setNewAdvName(e.target.value)}
                placeholder="Nome da habilidade"
                maxLength={100}
                className="bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                value={newAdvCost}
                onChange={(e) => setNewAdvCost(e.target.value)}
                placeholder="Custo (ex: 1, -1, 2)"
                className="bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500"
              />
              <select
                value={advType}
                onChange={(e: any) => setAdvType(e.target.value)}
                className="bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500 text-slate-300"
              >
                <option value="advantages">Vantagem</option>
                <option value="disadvantages">Desvantagem</option>
                <option value="skills">Perícia</option>
                <option value="specializations">Especialização</option>
              </select>
            </div>

            <textarea
              value={newAdvDesc}
              onChange={(e) => setNewAdvDesc(e.target.value)}
              placeholder="Descrição curta do efeito..."
              rows={2}
              maxLength={1000}
              className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500 mb-4"
            />

            <button
              onClick={() => {
                const parsedCost = parseInt(newAdvCost, 10) || 0;
                if (parsedCost > 0 && pointsAvailable < parsedCost) {
                  showToast("Saldo de Pontos Guardados insuficiente.");
                } else {
                  handleAddAdvantage();
                }
              }}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 transition-all border ${
                (parseInt(newAdvCost, 10) || 0) > 0 && pointsAvailable < (parseInt(newAdvCost, 10) || 0)
                  ? 'opacity-40 bg-slate-800/20 border-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border-purple-500/20 cursor-pointer active:scale-[0.99]'
              }`}
            >
              <Plus className="w-4 h-4" />
              Adicionar ao Personagem
            </button>
          </div>
        )}
      </div>

      {/* Listagem de Habilidades */}
      <div className="flex flex-col gap-6">
        
        {/* Vantagens & Desvantagens */}
        <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Vantagens & Desvantagens
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...(character.advantages || []), ...(character.disadvantages || [])].map((item) => (
              <div key={item.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-200 text-sm">
                    {item.name}
                    {item.isModular && item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <span className="text-xs text-slate-400 font-normal">
                        : {item.modifiers
                          ?.filter((m: any) => item.selectedModifiers?.includes(m.id))
                          .map((m: any) => m.name)
                          .join(', ')}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-purple-400 bg-purple-950/40 border border-purple-800/30 px-1.5 py-0.5 rounded-full font-bold">
                    {item.cost}
                  </span>
                  {item.description && (
                    <button
                      type="button"
                      onClick={() => setActiveDescriptionItem({
                        name: item.name,
                        cost: item.cost,
                        description: item.description
                      })}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-purple-400 rounded transition-all cursor-pointer"
                      title="Ver descrição completa"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingAbilityItem({
                      item,
                      type: (character.advantages || []).some(a => a.id === item.id) ? 'advantages' : 'disadvantages'
                    })}
                    className="p-1 hover:bg-purple-950/20 text-slate-500 hover:text-purple-400 rounded transition-all cursor-pointer"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAdvantage(
                      (character.advantages || []).some(a => a.id === item.id) ? 'advantages' : 'disadvantages',
                      item.id
                    )}
                    className="p-1 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {(!character.advantages?.length && !character.disadvantages?.length) && (
              <p className="text-xs text-slate-500 italic py-2 col-span-full">Nenhuma vantagem ou desvantagem adicionada.</p>
            )}
          </div>
        </div>

        {/* Perícias */}
        <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            Perícias
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {character.skills?.map((item) => (
              <div key={item.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-200 text-sm">{item.name}</span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded-full font-bold">
                    {item.cost}
                  </span>
                  {item.description && (
                    <button
                      type="button"
                      onClick={() => setActiveDescriptionItem({
                        name: item.name,
                        cost: item.cost,
                        description: item.description
                      })}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-all cursor-pointer"
                      title="Ver descrição completa"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingAbilityItem({
                      item,
                      type: 'skills'
                    })}
                    className="p-1 hover:bg-cyan-950/20 text-slate-500 hover:text-cyan-400 rounded transition-all cursor-pointer"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAdvantage('skills', item.id)}
                    className="p-1 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {!character.skills?.length && (
              <p className="text-xs text-slate-500 italic py-2 col-span-full">Nenhuma perícia adicionada.</p>
            )}
          </div>
        </div>

        {/* Especializações */}
        <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Especializações
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {character.specializations?.map((item) => (
              <div key={item.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-200 text-sm">{item.name}</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded-full font-bold">
                    {item.cost}
                  </span>
                  {item.description && (
                    <button
                      type="button"
                      onClick={() => setActiveDescriptionItem({
                        name: item.name,
                        cost: item.cost,
                        description: item.description
                      })}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded transition-all cursor-pointer"
                      title="Ver descrição completa"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingAbilityItem({
                      item,
                      type: 'specializations'
                    })}
                    className="p-1 hover:bg-emerald-950/20 text-slate-500 hover:text-emerald-400 rounded transition-all cursor-pointer"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAdvantage('specializations', item.id)}
                    className="p-1 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {!character.specializations?.length && (
              <p className="text-xs text-slate-500 italic py-2 col-span-full">Nenhuma especialização adicionada.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal para configurar Vantagem Modular */}
      {selectedCatalogItem && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">{selectedCatalogItem.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{selectedCatalogItem.description}</p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Selecione os Modificadores:
              </label>
              {(selectedCatalogItem.modifiers || []).map((mod: ModifierOption) => {
                const isChecked = selectedModifiers.includes(mod.id);
                return (
                  <label 
                    key={mod.id} 
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                      isChecked 
                        ? 'bg-purple-950/20 border-purple-500/30' 
                        : 'bg-slate-800/20 border-slate-800/40 hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedModifiers(prev => prev.filter(id => id !== mod.id));
                        } else {
                          setSelectedModifiers(prev => [...prev, mod.id]);
                        }
                      }}
                      className="mt-1 accent-purple-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-slate-200">{mod.name}</span>
                        <span className="text-xs font-mono font-bold text-purple-400">
                          {mod.costPt >= 0 ? `+${mod.costPt}` : mod.costPt} Ponto(s)
                        </span>
                      </div>
                      {mod.description && (
                        <p className="text-xs text-slate-400 mt-1">{mod.description}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Totalizador */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">Custo Final Estimado:</span>
              <span className="text-base font-black text-purple-400">
                {(() => {
                  const dummyItem: AdvantageItem = {
                    id: 'dummy',
                    name: selectedCatalogItem.name,
                    description: '',
                    cost: 'Modular',
                    isModular: true,
                    baseCostPt: selectedCatalogItem.baseCostPt || 0,
                    modifiers: selectedCatalogItem.modifiers || [],
                    selectedModifiers: selectedModifiers
                  };
                  const cost = computedCostPt(dummyItem);
                  return `${cost} ponto${Math.abs(cost) !== 1 ? 's' : ''}`;
                })()}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedCatalogItem(null);
                  setSelectedModifiers([]);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              {(() => {
                const dummyItem: AdvantageItem = {
                  id: 'dummy',
                  name: selectedCatalogItem.name,
                  description: '',
                  cost: 'Modular',
                  isModular: true,
                  baseCostPt: selectedCatalogItem.baseCostPt || 0,
                  modifiers: selectedCatalogItem.modifiers || [],
                  selectedModifiers: selectedModifiers
                };
                const computedCost = computedCostPt(dummyItem);
                const isModularTooExpensive = computedCost > 0 && pointsAvailable < computedCost;

                return (
                  <button
                    onClick={() => {
                      if (isModularTooExpensive) {
                        showToast("Saldo de Pontos Guardados insuficiente.");
                      } else {
                        handleAddModularItem();
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors border ${
                      isModularTooExpensive
                        ? 'opacity-40 bg-slate-800/20 border-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    Adicionar Modular
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
