'use client';

import React, { useState } from 'react';
import { 
  Palette, 
  User as UserIcon, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { 
  ThemeId, 
  THEMES, 
  DEFAULT_AVATARS, 
  DEFAULT_SECTION_ORDER, 
  SECTION_NAMES, 
  getTheme 
} from '@/lib/theme';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  currentAvatarUrl?: string;
  currentSectionOrder?: string[];
  onSave: (preferences: { theme: ThemeId; avatar_url: string; section_order: string[] }) => void;
}

export default function PreferencesModal({
  isOpen,
  onClose,
  currentTheme,
  currentAvatarUrl = '',
  currentSectionOrder = DEFAULT_SECTION_ORDER,
  onSave
}: PreferencesModalProps) {
  const [activeTab, setActiveTab] = useState<'temas' | 'avatar' | 'ordem'>('temas');
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(currentTheme);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(currentAvatarUrl);
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    currentSectionOrder.length > 0 ? currentSectionOrder : DEFAULT_SECTION_ORDER
  );
  const [customAvatarInput, setCustomAvatarInput] = useState<string>('');

  if (!isOpen) return null;

  const themeConfig = getTheme(selectedTheme);

  // Move section up
  const moveSectionUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...sectionOrder];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setSectionOrder(newOrder);
  };

  // Move section down
  const moveSectionDown = (index: number) => {
    if (index >= sectionOrder.length - 1) return;
    const newOrder = [...sectionOrder];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setSectionOrder(newOrder);
  };

  const handleSave = () => {
    const finalAvatar = customAvatarInput.trim() || selectedAvatarUrl;
    onSave({
      theme: selectedTheme,
      avatar_url: finalAvatar,
      section_order: sectionOrder
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-fade-in flex flex-col max-h-[85vh] ${themeConfig.cardBgClass} ${themeConfig.borderClass} ${themeConfig.textPrimaryClass}`}>
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-800/60 pb-4">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-400" />
              Preferências de Exibição
            </h3>
            <p className="text-xs text-slate-400 mt-1">Personalize o tema visual, seu avatar e a ordem dos blocos da ficha.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider bg-slate-800/40 border border-slate-700/30 px-2 py-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-800/60 pb-2">
          <button
            onClick={() => setActiveTab('temas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'temas'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Temas
          </button>

          <button
            onClick={() => setActiveTab('avatar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'avatar'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            Avatar
          </button>

          <button
            onClick={() => setActiveTab('ordem')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ordem'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Ordem da Ficha
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-none">
          {/* Tab: Temas */}
          {activeTab === 'temas' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Escolha o Tema Visual</span>
              
              <div className="space-y-3">
                {Object.values(THEMES).map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${theme.previewClass} ${
                        isSelected ? 'ring-2 ring-purple-500 shadow-xl' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 pr-4">
                        <span className="font-bold text-sm block flex items-center gap-2">
                          {theme.name}
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </span>
                        <p className="text-xs opacity-70 leading-relaxed">{theme.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-purple-500 border-white' : 'border-slate-600'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab: Avatar */}
          {activeTab === 'avatar' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Selecione um Avatar de RPG</span>
              
              <div className="grid grid-cols-3 gap-3">
                {DEFAULT_AVATARS.map((avatar) => {
                  const isSelected = selectedAvatarUrl === avatar.url && !customAvatarInput.trim();
                  return (
                    <div
                      key={avatar.id}
                      onClick={() => {
                        setSelectedAvatarUrl(avatar.url);
                        setCustomAvatarInput('');
                      }}
                      className={`relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer aspect-square bg-slate-900 group ${
                        isSelected ? 'border-purple-500 ring-2 ring-purple-500/50 scale-105' : 'border-slate-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 p-1 text-center">
                        <span className="text-[10px] font-bold text-slate-200 block truncate">{avatar.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <label className="text-[10px] text-slate-400 uppercase font-semibold block">URL do Avatar Personalizado</label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/meu-avatar.png"
                  value={customAvatarInput}
                  onChange={(e) => setCustomAvatarInput(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                />
              </div>
            </div>
          )}

          {/* Tab: Ordem da Ficha */}
          {activeTab === 'ordem' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Reorganizar Seções da Ficha</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Use as setas para ajustar a prioridade com que as seções serão exibidas na sua ficha de personagem.
              </p>

              <div className="space-y-2">
                {sectionOrder.map((secId, idx) => (
                  <div
                    key={secId}
                    className="flex justify-between items-center bg-slate-900/50 border border-slate-800/80 p-3 rounded-xl gap-4 font-sans"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-purple-950/50 border border-purple-800/30 flex items-center justify-center text-xs font-bold text-purple-400 font-mono shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {SECTION_NAMES[secId] || secId}
                      </span>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSectionUp(idx)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          idx === 0
                            ? 'opacity-30 border-slate-800 text-slate-600 cursor-not-allowed'
                            : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'
                        }`}
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={idx === sectionOrder.length - 1}
                        onClick={() => moveSectionDown(idx)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          idx === sectionOrder.length - 1
                            ? 'opacity-30 border-slate-800 text-slate-600 cursor-not-allowed'
                            : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer'
                        }`}
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800/40 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Salvar Preferências
          </button>
        </div>

      </div>
    </div>
  );
}
