'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Character, InventoryItem } from '@/types/game';

interface InventorySectionProps {
  character: Character;
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  themeConfig: {
    cardBgClass: string;
    borderClass: string;
  };
}

export default function InventorySection({
  character,
  setCharacter,
  themeConfig
}: InventorySectionProps) {
  // Form states for adding items
  const [newInvName, setNewInvName] = useState('');
  const [newInvQty, setNewInvQty] = useState(1);
  const [newInvBonusAttr, setNewInvBonusAttr] = useState(''); // 'F' | 'H' | 'R' | 'A' | 'PdF' | ''
  const [newInvBonusVal, setNewInvBonusVal] = useState(1);

  // Selection states for list actions
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [expandedItemNameId, setExpandedItemNameId] = useState<string | null>(null);

  const handleAddInventory = () => {
    if (!newInvName.trim()) return;

    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      name: newInvName.trim(),
      description: '',
      quantity: newInvQty,
      is_equipped: false,
      bonus_attribute: newInvBonusAttr || undefined,
      bonus_value: newInvBonusAttr ? newInvBonusVal : undefined
    };

    setCharacter(prev => prev ? {
      ...prev,
      inventory: [...(prev.inventory || []), newItem]
    } : null);

    setNewInvName('');
    setNewInvQty(1);
    setNewInvBonusAttr('');
    setNewInvBonusVal(1);
  };

  const handleToggleEquipInventory = (itemId: string) => {
    setCharacter(prev => prev ? {
      ...prev,
      inventory: (prev.inventory || []).map(item => 
        item.id === itemId 
          ? { ...item, is_equipped: !item.is_equipped } 
          : item
      )
    } : null);
  };

  const handleDeleteInventory = (itemId: string) => {
    setCharacter(prev => prev ? {
      ...prev,
      inventory: (prev.inventory || []).filter(i => i.id !== itemId)
    } : null);
  };

  return (
    <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <span className="text-sm font-bold text-slate-300 uppercase tracking-wider block">Itens & Equipamentos</span>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newInvName}
            onChange={(e) => setNewInvName(e.target.value)}
            placeholder="Nome do item"
            className="flex-1 min-w-0 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
          />
          <input
            type="number"
            value={newInvQty}
            onChange={(e) => setNewInvQty(parseInt(e.target.value, 10) || 1)}
            className="w-16 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 shrink-0"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={newInvBonusAttr}
            onChange={(e) => setNewInvBonusAttr(e.target.value)}
            className="flex-1 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-350"
          >
            <option value="">Sem bônus de atributo</option>
            <option value="F">Força (C/C)</option>
            <option value="H">Habilidade</option>
            <option value="R">Resistência</option>
            <option value="A">Armadura</option>
            <option value="PdF">Poder de Fogo</option>
          </select>
          {newInvBonusAttr && (
            <input
              type="number"
              value={newInvBonusVal}
              onChange={(e) => setNewInvBonusVal(parseInt(e.target.value, 10) || 0)}
              placeholder="Bônus"
              className="w-20 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 shrink-0"
            />
          )}
          <button
            onClick={handleAddInventory}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 rounded-xl shrink-0 transition-colors flex items-center justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {(character.inventory || []).map((item) => {
          const isConfirmingDelete = itemToDelete === item.id;
          return (
            <div key={item.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4 min-h-[46px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span 
                    onClick={() => setExpandedItemNameId(expandedItemNameId === item.id ? null : item.id)}
                    className={`font-semibold text-slate-200 text-sm block cursor-pointer transition-all hover:text-white ${
                      expandedItemNameId === item.id ? 'break-words whitespace-normal' : 'truncate'
                    }`}
                    title="Clique para ver o nome completo"
                  >
                    {item.name}
                  </span>
                  
                  {item.bonus_attribute && item.bonus_value !== undefined && (
                    <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                      {item.bonus_value >= 0 ? `+${item.bonus_value}` : item.bonus_value} {
                        item.bonus_attribute === 'F' ? 'Força' :
                        item.bonus_attribute === 'H' ? 'Habilidade' :
                        item.bonus_attribute === 'R' ? 'Resistência' :
                        item.bonus_attribute === 'A' ? 'Armadura' :
                        item.bonus_attribute === 'PdF' ? 'Poder de Fogo' : item.bonus_attribute
                      }
                    </span>
                  )}

                  {item.bonus_attribute && (
                    <button
                      type="button"
                      onClick={() => handleToggleEquipInventory(item.id)}
                      className={`text-[9px] px-2 py-0.5 rounded-full border transition-all active:scale-95 cursor-pointer font-bold ${
                        item.is_equipped
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30'
                          : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {item.is_equipped ? 'Equipado ⚔️' : 'Equipar'}
                    </button>
                  )}
                </div>
              </div>
              
              {isConfirmingDelete ? (
                <div className="flex items-center gap-1.5 shrink-0 animate-fade-in">
                  <span className="text-[10px] text-rose-400 font-semibold mr-1">Excluir?</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteInventory(item.id)}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemToDelete(null)}
                    className="px-2 py-0.5 bg-slate-805 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold transition-colors border border-slate-700/50 cursor-pointer"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 font-bold bg-slate-800/50 px-2 py-1 rounded-lg">
                    x{item.quantity}
                  </span>
                  <button
                    onClick={() => setItemToDelete(item.id)}
                    className="p-1 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!character.inventory?.length && (
          <p className="text-[10px] text-slate-400 italic">Inventário vazio.</p>
        )}
      </div>
    </div>
  );
}
