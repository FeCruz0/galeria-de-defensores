import React, { useState } from 'react';
import { Dice5 } from 'lucide-react';
import { Character } from '@/types/game';

interface TableDiceRollerPanelProps {
  linkedCharacters: Character[];
  currentUser: any;
  userRole: 'MASTER' | 'PLAYER' | 'SPECTATOR' | 'GUEST';
  rollCooldownRemaining: number;
  onTriggerRoll: (params: {
    rollMode: 'QUICK' | 'ADVANCED';
    diceFaces: number;
    diceCount: number;
    diceModifier: number;
    rollActionName: string;
    rollCategory: 'OTHER' | 'ATTACK' | 'DEFENSE' | 'MAGIC' | 'TEST' | 'INITIATIVE';
    selectedCharForRoll: string;
    selectedPrimaryAttr: string;
    selectedSecondaryAttr: string;
  }) => void;
}

export default function TableDiceRollerPanel({
  linkedCharacters,
  currentUser,
  userRole,
  rollCooldownRemaining,
  onTriggerRoll,
}: TableDiceRollerPanelProps) {
  const [rollMode, setRollMode] = useState<'QUICK' | 'ADVANCED'>('QUICK');
  const [diceFaces, setDiceFaces] = useState<number>(6);
  const [diceCount, setDiceCount] = useState<number>(1);
  const [diceModifier, setDiceModifier] = useState<number>(0);
  const [rollActionName, setRollActionName] = useState('');
  const [rollCategory, setRollCategory] = useState<'OTHER' | 'ATTACK' | 'DEFENSE' | 'MAGIC' | 'TEST' | 'INITIATIVE'>('OTHER');
  const [selectedCharForRoll, setSelectedCharForRoll] = useState('none');
  const [selectedPrimaryAttr, setSelectedPrimaryAttr] = useState('none');
  const [selectedSecondaryAttr, setSelectedSecondaryAttr] = useState('none');

  const handleRoll = () => {
    if (rollCooldownRemaining > 0 || userRole === 'SPECTATOR' || userRole === 'GUEST') return;
    onTriggerRoll({
      rollMode,
      diceFaces,
      diceCount,
      diceModifier,
      rollActionName,
      rollCategory,
      selectedCharForRoll,
      selectedPrimaryAttr,
      selectedSecondaryAttr,
    });
  };

  return (
    <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Dice5 className="w-5 h-5 text-purple-400" />
          Rolador de Dados da Mesa
        </h2>

        {/* Alternador de Modo: Rápido vs Avançado */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setRollMode('QUICK')}
            className={`py-1 px-3 rounded-lg transition-all ${
              rollMode === 'QUICK'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Rápido
          </button>
          <button
            type="button"
            onClick={() => setRollMode('ADVANCED')}
            className={`py-1 px-3 rounded-lg transition-all ${
              rollMode === 'ADVANCED'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚙️ Customizado
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Seleção de Lados do Dado (Faces) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Lados do Dado (Faces)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[4, 6, 8, 10, 12, 20, 100].map((faces) => (
              <button
                key={faces}
                type="button"
                onClick={() => setDiceFaces(faces)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                  diceFaces === faces
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10'
                    : 'bg-slate-800/30 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                d{faces}
              </button>
            ))}
          </div>
        </div>

        {/* Quantidade e Modificador Geral em Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Qtd Dados */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Quantidade
            </label>
            <div className="flex items-center gap-2 bg-slate-800/30 border border-slate-800/80 rounded-xl p-1.5">
              <button
                type="button"
                onClick={() => setDiceCount((prev) => Math.max(1, prev - 1))}
                className="w-8 h-8 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold shrink-0 cursor-pointer"
              >
                -
              </button>
              <span className="flex-1 text-center font-bold text-sm font-mono">{diceCount}d{diceFaces}</span>
              <button
                type="button"
                onClick={() => setDiceCount((prev) => Math.min(10, prev + 1))}
                className="w-8 h-8 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold shrink-0 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Modificador Geral */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Modificador Geral
            </label>
            <div className="flex items-center gap-2 bg-slate-800/30 border border-slate-800/80 rounded-xl p-1.5">
              <button
                type="button"
                onClick={() => setDiceModifier((prev) => prev - 1)}
                className="w-8 h-8 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold shrink-0 cursor-pointer"
              >
                -
              </button>
              <span className="flex-1 text-center font-bold text-sm font-mono">
                {diceModifier >= 0 ? `+${diceModifier}` : diceModifier}
              </span>
              <button
                type="button"
                onClick={() => setDiceModifier((prev) => prev + 1)}
                className="w-8 h-8 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold shrink-0 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Parâmetros do Modo Avançado */}
        {rollMode === 'ADVANCED' && (
          <div className="space-y-4 pt-3 border-t border-slate-800/60 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome da Ação */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Nome da Ação / Rótulo
                </label>
                <input
                  type="text"
                  value={rollActionName}
                  onChange={(e) => setRollActionName(e.target.value)}
                  placeholder="Ex: Ataque com Espada"
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                />
              </div>

              {/* Categoria */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Categoria da Rolagem
                </label>
                <select
                  value={rollCategory}
                  onChange={(e) => setRollCategory(e.target.value as any)}
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 cursor-pointer"
                >
                  <option value="OTHER">Outro</option>
                  <option value="ATTACK">⚔️ Ataque</option>
                  <option value="DEFENSE">🛡️ Defesa</option>
                  <option value="MAGIC">✨ Magia</option>
                  <option value="TEST">🎲 Teste de Atributo</option>
                  <option value="INITIATIVE">⚡ Iniciativa</option>
                </select>
              </div>
            </div>

            {/* Seleção de Personagem e Atributos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Personagem que Fornece os Atributos */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Personagem
                </label>
                <select
                  value={selectedCharForRoll}
                  onChange={(e) => setSelectedCharForRoll(e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 cursor-pointer"
                >
                  <option value="none">Nenhum (Sem Ficha)</option>
                  {linkedCharacters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Atributo Primário */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Atributo Primário
                </label>
                <select
                  value={selectedPrimaryAttr}
                  onChange={(e) => setSelectedPrimaryAttr(e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-purple-300 font-semibold cursor-pointer"
                >
                  <option value="none">Nenhum</option>
                  <option value="F">Força (F)</option>
                  <option value="H">Habilidade (H)</option>
                  <option value="R">Resistência (R)</option>
                  <option value="A">Armadura (A)</option>
                  <option value="PdF">Poder de Fogo (PdF)</option>
                </select>
              </div>

              {/* Atributo Secundário */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Atributo Secundário
                </label>
                <select
                  value={selectedSecondaryAttr}
                  onChange={(e) => setSelectedSecondaryAttr(e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-cyan-300 font-semibold cursor-pointer"
                >
                  <option value="none">Nenhum</option>
                  <option value="F">Força (F)</option>
                  <option value="H">Habilidade (H)</option>
                  <option value="R">Resistência (R)</option>
                  <option value="A">Armadura (A)</option>
                  <option value="PdF">Poder de Fogo (PdF)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Preview da Fórmula */}
        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-xs text-slate-400 flex items-center justify-between">
          <span className="text-slate-500 font-mono text-[11px]">Fórmula:</span>
          <span className="font-mono text-purple-300 font-semibold">
            {diceCount}d{diceFaces}
            {rollMode === 'ADVANCED' && selectedPrimaryAttr !== 'none' && ` + ${selectedPrimaryAttr}`}
            {rollMode === 'ADVANCED' && selectedSecondaryAttr !== 'none' && ` + ${selectedSecondaryAttr}`}
            {diceModifier !== 0 && ` ${diceModifier >= 0 ? '+' : '-'} ${Math.abs(diceModifier)}`}
          </span>
        </div>

        {/* Botão Rolar */}
        <button
          type="button"
          onClick={handleRoll}
          disabled={rollCooldownRemaining > 0 || userRole === 'SPECTATOR' || userRole === 'GUEST'}
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Dice5 className={`w-5 h-5 ${rollCooldownRemaining <= 0 ? 'animate-bounce' : ''}`} />
          {rollCooldownRemaining > 0 ? `Aguarde ${rollCooldownRemaining}s...` : 'Rolar Dados na Mesa'}
        </button>
      </div>
    </div>
  );
}
