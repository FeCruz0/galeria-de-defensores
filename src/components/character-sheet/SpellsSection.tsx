'use client';

import React, { useState } from 'react';
import { Plus, Info, Trash2 } from 'lucide-react';
import { Character, Spell } from '@/types/game';

interface SpellsSectionProps {
  character: Character;
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  setActiveDescriptionItem: (item: { name: string; cost: string; description: string } | null) => void;
  themeConfig: {
    cardBgClass: string;
    borderClass: string;
  };
}

export default function SpellsSection({
  character,
  setCharacter,
  setActiveDescriptionItem,
  themeConfig
}: SpellsSectionProps) {
  // Form states for adding spells
  const [newSpellName, setNewSpellName] = useState('');
  const [newSpellCost, setNewSpellCost] = useState('1 PM');
  const [newSpellDesc, setNewSpellDesc] = useState('');

  const handleAddSpell = () => {
    if (!newSpellName.trim()) return;

    const newSpell: Spell = {
      id: crypto.randomUUID(),
      name: newSpellName.trim(),
      cost: newSpellCost,
      school: '',
      requirements: '',
      range: '',
      duration: '',
      description: newSpellDesc.trim()
    };

    setCharacter(prev => prev ? {
      ...prev,
      spells: [...(prev.spells || []), newSpell]
    } : null);

    setNewSpellName('');
    setNewSpellDesc('');
  };

  const handleDeleteSpell = (spellId: string) => {
    setCharacter(prev => prev ? {
      ...prev,
      spells: (prev.spells || []).filter(s => s.id !== spellId)
    } : null);
  };

  return (
    <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <span className="text-sm font-bold text-slate-300 uppercase tracking-wider block">Magias e Poderes</span>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={newSpellName}
          onChange={(e) => setNewSpellName(e.target.value)}
          placeholder="Nome da magia"
          className="flex-1 min-w-0 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
        />
        <input
          type="text"
          value={newSpellCost}
          onChange={(e) => setNewSpellCost(e.target.value)}
          placeholder="Custo (ex: 2 PM)"
          className="w-20 sm:w-24 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 shrink-0"
        />
        <button
          onClick={handleAddSpell}
          className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-xl shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {(character.spells || []).map((spell) => (
          <div key={spell.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-200 text-sm">{spell.name}</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded-full font-bold">
                {spell.cost}
              </span>
              {spell.description && (
                <button
                  type="button"
                  onClick={() => setActiveDescriptionItem({
                    name: spell.name,
                    cost: spell.cost,
                    description: spell.description
                  })}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-all cursor-pointer"
                  title="Ver descrição completa"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => handleDeleteSpell(spell.id)}
              className="p-1 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all shrink-0 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!character.spells?.length && (
          <p className="text-xs text-slate-500 italic py-1">Nenhuma magia aprendida.</p>
        )}
      </div>
    </div>
  );
}
