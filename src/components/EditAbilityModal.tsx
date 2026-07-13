'use client';

import React, { useState } from 'react';
import { X, Edit2, Save, Info } from 'lucide-react';

interface AbilityItem {
  id: string;
  name: string;
  cost: string;
  description: string;
  [key: string]: any;
}

interface EditAbilityModalProps {
  item: AbilityItem;
  itemType: 'advantages' | 'disadvantages' | 'skills' | 'specializations';
  isBaseSystem: boolean;
  onSave: (updatedItem: AbilityItem) => void;
  onClose: () => void;
  onTriggerClone: () => void;
}

const typeLabels: Record<string, string> = {
  advantages: 'Vantagem',
  disadvantages: 'Desvantagem',
  skills: 'Perícia',
  specializations: 'Especialização',
};

const badgeColors: Record<string, string> = {
  advantages: 'text-purple-400 bg-purple-950/40 border-purple-800/30',
  disadvantages: 'text-rose-400 bg-rose-950/40 border-rose-800/30',
  skills: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/30',
  specializations: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30',
};

export default function EditAbilityModal({
  item,
  itemType,
  isBaseSystem,
  onSave,
  onClose,
  onTriggerClone,
}: EditAbilityModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [cost, setCost] = useState(item.cost);
  const [description, setDescription] = useState(item.description);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>(item.selectedModifiers || []);
  const [error, setError] = useState('');

  const label = typeLabels[itemType] || 'Item';
  const badgeColor = badgeColors[itemType] || 'text-slate-400 bg-slate-950/40 border-slate-800/30';

  const handleEditClick = () => {
    if (isBaseSystem) {
      onTriggerClone();
    } else {
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setName(item.name);
    setCost(item.cost);
    setDescription(item.description);
    setSelectedModifiers(item.selectedModifiers || []);
    setIsEditing(false);
    setError('');
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('O nome é obrigatório');
      return;
    }
    setError('');
    onSave({
      ...item,
      name: name.trim(),
      cost: cost.trim(),
      description: description.trim(),
      selectedModifiers,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0f172a]/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <span className={`text-[10px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeColor}`}>
              {label}
            </span>
            <h3 className="text-base font-bold text-slate-200">
              {isEditing ? `Editar ${label}` : `Detalhes da ${label}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-400 bg-rose-950/20 border border-rose-900/30 rounded-xl">
              {error}
            </div>
          )}

          {isBaseSystem && !isEditing && (
            <div className="p-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Este personagem utiliza um sistema nativo padrão. Ao tentar editar, você será convidado a criar uma cópia personalizada do sistema de regras.
              </span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                Nome da {label}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500 text-slate-200"
                />
              ) : (
                <p className="text-sm font-semibold text-slate-200 bg-slate-900/40 border border-slate-800/50 p-2.5 rounded-xl">
                  {name}
                </p>
              )}
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                Custo
              </label>
              {isEditing ? (
                item.isModular ? (
                  <p className="text-xs font-semibold text-slate-450 bg-slate-900/40 border border-slate-800/50 p-2.5 rounded-xl select-none">
                    Calculado automaticamente com base nos modificadores
                  </p>
                ) : (
                  <input
                    type="text"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="Ex: 1 ponto, 2 pontos"
                    className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500 text-slate-200"
                  />
                )
              ) : (
                <p className="text-sm font-semibold text-slate-200 bg-slate-900/40 border border-slate-800/50 p-2.5 rounded-xl">
                  {cost || 'Grátis'}
                </p>
              )}
            </div>

            {/* Modifiers (Modular advantages) */}
            {item.isModular && (
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1.5">
                  {isEditing ? 'Configurar Modificadores / Opções' : 'Modificadores Selecionados'}
                </label>
                {isEditing ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(item.modifiers || []).map((mod: any) => {
                      const isChecked = selectedModifiers.includes(mod.id);
                      return (
                        <label 
                          key={mod.id} 
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer text-xs ${
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
                            className="mt-0.5 accent-purple-500"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-200">{mod.name}</span>
                              {mod.costPt !== 0 && (
                                <span className="font-mono text-[10px] text-purple-400">
                                  {mod.costPt > 0 ? `+${mod.costPt}` : mod.costPt} Pt
                                </span>
                              )}
                            </div>
                            {mod.description && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{mod.description}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-900/40 border border-slate-800/50 rounded-xl min-h-[40px]">
                    {selectedModifiers.length > 0 ? (
                      (item.modifiers || [])
                        .filter((m: any) => selectedModifiers.includes(m.id))
                        .map((m: any) => (
                          <span key={m.id} className="text-xs bg-purple-950/40 border border-purple-800/30 text-purple-300 px-2 py-0.5 rounded-lg font-medium">
                            {m.name}
                          </span>
                        ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">Nenhum modificador selecionado.</span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                Descrição do Efeito
              </label>
              {isEditing ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição detalhada..."
                  rows={4}
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500 text-slate-200"
                />
              ) : (
                <div className="text-xs text-slate-350 bg-slate-900/40 border border-slate-800/50 p-3 rounded-xl whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {description || <span className="italic text-slate-500">Sem descrição.</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-800/60 bg-slate-900/30">
          <button
            onClick={isEditing ? handleCancel : onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-xl transition-all"
          >
            {isEditing ? 'Cancelar' : 'Fechar'}
          </button>
          
          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-purple-900/20 active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Alterações
            </button>
          ) : (
            <button
              onClick={handleEditClick}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center gap-1.5 transition-all border border-slate-750 active:scale-[0.98]"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
