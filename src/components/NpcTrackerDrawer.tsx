'use client';

import React, { useState } from 'react';
import { TableNPC } from '@/types/game';
import { createNpcAction, updateNpcAction, deleteNpcAction } from '@/actions/npcActions';
import { Skull, Plus, Trash2, Shield, Heart, Zap, Sword, Target, Activity, X } from 'lucide-react';

interface NpcTrackerDrawerProps {
  tableId: string;
  npcs: TableNPC[];
  isOpen: boolean;
  onClose: () => void;
  onRollDice: (results: number[], title: string, senderName: string) => void;
  onNpcsChange: () => void;
  showToast: (message: string) => void;
}

export function NpcTrackerDrawer({
  tableId,
  npcs,
  isOpen,
  onClose,
  onRollDice,
  onNpcsChange,
  showToast,
}: NpcTrackerDrawerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [concept, setConcept] = useState('');
  const [f, setF] = useState(1);
  const [h, setH] = useState(1);
  const [r, setR] = useState(1);
  const [a, setA] = useState(0);
  const [pdf, setPdf] = useState(0);
  const [pvMax, setPvMax] = useState(5);
  const [pmMax, setPmMax] = useState(5);
  const [annotations, setAnnotations] = useState('');

  if (!isOpen) return null;

  async function handleCreateNpc(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const res = await createNpcAction({
      table_id: tableId,
      name: name.trim(),
      concept: concept.trim() || null,
      attributes_values: { F: f, H: h, R: r, A: a, PdF: pdf },
      resources_current: { PV: pvMax, PV_max: pvMax, PM: pmMax, PM_max: pmMax },
      annotations: annotations.trim() || null,
    });

    if (res.success) {
      showToast(`NPC '${name}' adicionado com sucesso!`);
      onNpcsChange();
      setName('');
      setConcept('');
      setF(1);
      setH(1);
      setR(1);
      setA(0);
      setPdf(0);
      setPvMax(5);
      setPmMax(5);
      setAnnotations('');
      setIsCreating(false);
    } else {
      showToast(res.message || 'Erro ao criar NPC.');
    }
  }

  async function handleAdjustResource(npc: TableNPC, resourceKey: 'PV' | 'PM', delta: number) {
    const currentVal = npc.resources_current[resourceKey] ?? 0;
    const maxVal = npc.resources_current[`${resourceKey}_max`] ?? (resourceKey === 'PV' ? (npc.attributes_values.R || 1) * 5 : (npc.attributes_values.R || 1) * 5);
    const newVal = Math.max(0, Math.min(maxVal * 2, currentVal + delta));

    const newResources = {
      ...npc.resources_current,
      [resourceKey]: newVal,
    };

    const res = await updateNpcAction(npc.id, { resources_current: newResources });
    if (res.success) {
      onNpcsChange();
    }
  }

  async function handleDelete(npcId: string, npcName: string) {
    const res = await deleteNpcAction(npcId);
    if (res.success) {
      showToast(`NPC '${npcName}' removido.`);
      onNpcsChange();
    } else {
      showToast('Erro ao remover NPC.');
    }
  }

  function handleRoll(npc: TableNPC, rollType: 'attack' | 'ranged' | 'defense' | 'dodge') {
    const d6 = Math.floor(Math.random() * 6) + 1;
    let total = d6;
    let label = '';

    const fVal = npc.attributes_values.F || 0;
    const hVal = npc.attributes_values.H || 0;
    const aVal = npc.attributes_values.A || 0;
    const pdfVal = npc.attributes_values.PdF || 0;

    if (rollType === 'attack') {
      total = d6 + fVal + hVal;
      label = `Ataque Corpo a Corpo (d6:${d6} + F:${fVal} + H:${hVal}) = ${total}`;
    } else if (rollType === 'ranged') {
      total = d6 + pdfVal + hVal;
      label = `Ataque à Distância (d6:${d6} + PdF:${pdfVal} + H:${hVal}) = ${total}`;
    } else if (rollType === 'defense') {
      total = d6 + aVal + hVal;
      label = `Defesa (d6:${d6} + A:${aVal} + H:${hVal}) = ${total}`;
    } else if (rollType === 'dodge') {
      total = d6 + hVal;
      label = `Esquiva (d6:${d6} + H:${hVal}) = ${total}`;
    }

    onRollDice([d6], label, `[NPC] ${npc.name}`);
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-fade-in max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Skull className="w-5 h-5 text-rose-400" />
            Mini-Ficha do Mestre (Quick NPC Tracker)
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-purple-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              {isCreating ? 'Cancelar' : 'Novo NPC'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Form de Criação */}
          {isCreating && (
            <form onSubmit={handleCreateNpc} className="bg-slate-900/60 border border-purple-500/30 p-4 rounded-2xl space-y-4 animate-fade-in">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">Cadastrar Nova Ameaça / NPC</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Nome do NPC / Criatura</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Goblin Guerreiro"
                    className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2 px-3 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Conceito / Tipo</label>
                  <input
                    type="text"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="Ex: Capanga / Ameaça Ningen"
                    className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2 px-3 text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Atributos F H R A PdF */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'F (Força)', val: f, set: setF },
                  { label: 'H (Habilidade)', val: h, set: setH },
                  { label: 'R (Resistência)', val: r, set: setR },
                  { label: 'A (Armadura)', val: a, set: setA },
                  { label: 'PdF (Poder de Fogo)', val: pdf, set: setPdf },
                ].map((attr) => (
                  <div key={attr.label}>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1 truncate">{attr.label}</label>
                    <input
                      type="number"
                      min={0}
                      value={attr.val}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        attr.set(val);
                        if (attr.label.startsWith('R')) {
                          setPvMax(val * 5 || 5);
                          setPmMax(val * 5 || 5);
                        }
                      }}
                      className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-1.5 px-2 text-xs text-slate-200 text-center font-bold"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">PV Máximo</label>
                  <input
                    type="number"
                    min={1}
                    value={pvMax}
                    onChange={(e) => setPvMax(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-1.5 px-3 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">PM Máximo</label>
                  <input
                    type="number"
                    min={1}
                    value={pmMax}
                    onChange={(e) => setPmMax(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-1.5 px-3 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">Anotações / Habilidades</label>
                <input
                  type="text"
                  value={annotations}
                  onChange={(e) => setAnnotations(e.target.value)}
                  placeholder="Ex: Vantagens: Arena (Florestas), Ataque Especial"
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-1.5 px-3 text-xs text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-xl text-xs shadow-lg shadow-purple-600/20 cursor-pointer"
              >
                Salvar NPC na Mesa
              </button>
            </form>
          )}

          {/* Lista de NPCs */}
          <div className="space-y-3">
            {npcs.map((npc) => {
              const pvCurr = npc.resources_current?.PV ?? 5;
              const pvMaxVal = npc.resources_current?.PV_max ?? (npc.attributes_values.R || 1) * 5;
              const pmCurr = npc.resources_current?.PM ?? 5;
              const pmMaxVal = npc.resources_current?.PM_max ?? (npc.attributes_values.R || 1) * 5;

              return (
                <div
                  key={npc.id}
                  className="bg-[#070b19]/60 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 transition-all shadow-md"
                >
                  {/* Cabeçalho do NPC */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        {npc.name}
                        {npc.concept && (
                          <span className="text-[10px] text-purple-400 bg-purple-950/40 border border-purple-800/30 px-2 py-0.5 rounded-full font-semibold">
                            {npc.concept}
                          </span>
                        )}
                      </h4>
                      {npc.annotations && (
                        <p className="text-[11px] text-slate-400 mt-1 italic">{npc.annotations}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(npc.id, npc.name)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Excluir NPC"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges de Atributos */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="bg-rose-950/40 text-rose-300 border border-rose-800/30 px-2 py-0.5 rounded-lg">F: {npc.attributes_values.F || 0}</span>
                    <span className="bg-cyan-950/40 text-cyan-300 border border-cyan-800/30 px-2 py-0.5 rounded-lg">H: {npc.attributes_values.H || 0}</span>
                    <span className="bg-emerald-950/40 text-emerald-300 border border-emerald-800/30 px-2 py-0.5 rounded-lg">R: {npc.attributes_values.R || 0}</span>
                    <span className="bg-amber-950/40 text-amber-300 border border-amber-800/30 px-2 py-0.5 rounded-lg">A: {npc.attributes_values.A || 0}</span>
                    <span className="bg-purple-950/40 text-purple-300 border border-purple-800/30 px-2 py-0.5 rounded-lg">PdF: {npc.attributes_values.PdF || 0}</span>
                  </div>

                  {/* Controle de Recursos PV e PM */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* PV */}
                    <div className="bg-slate-900/40 border border-rose-900/20 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-rose-400">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> PV</span>
                        <span>{pvCurr} / {pvMaxVal}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleAdjustResource(npc, 'PV', -5)} className="flex-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 py-0.5 text-[10px] font-bold rounded cursor-pointer">-5</button>
                        <button onClick={() => handleAdjustResource(npc, 'PV', -1)} className="flex-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 py-0.5 text-[10px] font-bold rounded cursor-pointer">-1</button>
                        <button onClick={() => handleAdjustResource(npc, 'PV', 1)} className="flex-1 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 py-0.5 text-[10px] font-bold rounded cursor-pointer">+1</button>
                        <button onClick={() => handleAdjustResource(npc, 'PV', 5)} className="flex-1 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 py-0.5 text-[10px] font-bold rounded cursor-pointer">+5</button>
                      </div>
                    </div>

                    {/* PM */}
                    <div className="bg-slate-900/40 border border-cyan-900/20 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-cyan-400">
                        <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> PM</span>
                        <span>{pmCurr} / {pmMaxVal}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleAdjustResource(npc, 'PM', -5)} className="flex-1 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800/40 py-0.5 text-[10px] font-bold rounded cursor-pointer">-5</button>
                        <button onClick={() => handleAdjustResource(npc, 'PM', -1)} className="flex-1 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800/40 py-0.5 text-[10px] font-bold rounded cursor-pointer">-1</button>
                        <button onClick={() => handleAdjustResource(npc, 'PM', 1)} className="flex-1 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 py-0.5 text-[10px] font-bold rounded cursor-pointer">+1</button>
                        <button onClick={() => handleAdjustResource(npc, 'PM', 5)} className="flex-1 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 py-0.5 text-[10px] font-bold rounded cursor-pointer">+5</button>
                      </div>
                    </div>
                  </div>

                  {/* Atalhos Rápidos de Rolagem 3D */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRoll(npc, 'attack')}
                      className="flex-1 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 border border-rose-800/30 py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Sword className="w-3 h-3 text-rose-400" />
                      Ataque Físico
                    </button>

                    <button
                      onClick={() => handleRoll(npc, 'ranged')}
                      className="flex-1 bg-purple-950/20 hover:bg-purple-900/30 text-purple-300 border border-purple-800/30 py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Target className="w-3 h-3 text-purple-400" />
                      Distância
                    </button>

                    <button
                      onClick={() => handleRoll(npc, 'defense')}
                      className="flex-1 bg-amber-950/20 hover:bg-amber-900/30 text-amber-300 border border-amber-800/30 py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Shield className="w-3 h-3 text-amber-400" />
                      Defesa
                    </button>

                    <button
                      onClick={() => handleRoll(npc, 'dodge')}
                      className="flex-1 bg-cyan-950/20 hover:bg-cyan-900/30 text-cyan-300 border border-cyan-800/30 py-1.5 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Activity className="w-3 h-3 text-cyan-400" />
                      Esquiva
                    </button>
                  </div>
                </div>
              );
            })}

            {npcs.length === 0 && !isCreating && (
              <div className="text-center py-10 bg-slate-900/30 border border-slate-800/60 rounded-2xl">
                <Skull className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">Nenhum NPC ou Ameaça cadastrado nesta mesa.</p>
                <p className="text-[11px] text-slate-500 mt-1">Clique em &quot;Novo NPC&quot; para cadastrar capangas e monstros de forma ágil.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
