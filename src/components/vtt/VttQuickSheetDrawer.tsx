'use client';

import React from 'react';
import { 
  Dice5, 
  Settings, 
  Flame, 
  Skull, 
  Sword, 
  Sparkles, 
  Heart, 
  Zap, 
  Snowflake, 
  ShieldAlert, 
  Loader2, 
  ZapOff,
  Shield
} from 'lucide-react';
import { Character, Table, Profile } from '@/types/game';
import { StatusCondition } from '@/lib/status';
import { STATUS_CONDITIONS } from '@/lib/status';
import { getMaxPv, getMaxPm, getModifiedAttributes, getEquippedItemsModifiers } from '@/lib/rules';

interface VttQuickSheetDrawerProps {
  selectedCharacterSheet: Character | null;
  onClose: () => void;
  userRole: string;
  currentUser: Profile | null;
  table: Table | null;
  customConditions: StatusCondition[];
  rollCooldownRemaining: number;
  onRollQuickAction: (name: string, value: number, isAttribute: boolean, customRoll?: any) => void;
  onToggleStatus: (statusId: string) => void;
  onUpdateInventory: (updatedInventory: any[]) => Promise<void>;
  onOpenManageStatus: () => void;
}

function getIconComponent(iconName: string) {
  switch (iconName) {
    case 'Flame': return Flame;
    case 'Skull': return Skull;
    case 'Sword': return Sword;
    case 'Sparkles': return Sparkles;
    case 'Heart': return Heart;
    case 'Zap': return Zap;
    case 'Snowflake': return Snowflake;
    case 'ShieldAlert': return ShieldAlert;
    case 'Loader2': return Loader2;
    case 'ZapOff': return ZapOff;
    case 'Shield':
    default:
      return Shield;
  }
}

export default function VttQuickSheetDrawer({
  selectedCharacterSheet,
  onClose,
  userRole,
  currentUser,
  table,
  customConditions,
  rollCooldownRemaining,
  onRollQuickAction,
  onToggleStatus,
  onUpdateInventory,
  onOpenManageStatus
}: VttQuickSheetDrawerProps) {
  if (!selectedCharacterSheet) return null;

  const canEdit = userRole === 'MASTER' || currentUser?.id === selectedCharacterSheet.user_id;

  const activeEffects = selectedCharacterSheet.status_effects || [];
  const equippedMods = getEquippedItemsModifiers(selectedCharacterSheet.inventory);
  const modifiedAttrs = getModifiedAttributes(selectedCharacterSheet.attributes_values || {}, activeEffects, equippedMods);

  const baseR = selectedCharacterSheet.attributes_values?.['R'] ?? 0;
  const charR = baseR + (equippedMods['R'] || 0);
  const maxPv = getMaxPv(charR, selectedCharacterSheet.advantages);
  const maxPm = getMaxPm(charR, selectedCharacterSheet.advantages);

  const attrLabels: Record<string, string> = {
    F: 'Força',
    H: 'Habilidade',
    R: 'Resistência',
    A: 'Armadura',
    PdF: 'Poder de Fogo'
  };

  const colors: Record<string, string> = {
    F: 'border-purple-500/20 text-purple-400 bg-purple-950/10 hover:bg-purple-950/20',
    H: 'border-cyan-500/20 text-cyan-400 bg-cyan-950/10 hover:bg-cyan-950/20',
    R: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20',
    A: 'border-slate-500/20 text-slate-350 bg-slate-800/20 hover:bg-slate-800/30',
    PdF: 'border-rose-500/20 text-rose-400 bg-rose-950/10 hover:bg-rose-950/20'
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#0f172a] border-l border-slate-800 z-50 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
      <div className="space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white truncate max-w-[200px]">
              {selectedCharacterSheet.name}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {selectedCharacterSheet.concept || 'Guerreiro'} • {selectedCharacterSheet.points_total} Pontos
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider bg-slate-800/40 border border-slate-700/30 px-2.5 py-1 rounded-lg"
          >
            Fechar ×
          </button>
        </div>

        {/* Atributos Básicos com clique para Rolar */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Atributos (Clique para Rolar d6 + Atributo)
          </span>
          
          <div className="grid grid-cols-2 gap-2.5">
            {Object.keys(selectedCharacterSheet.attributes_values || {}).map((attrKey) => {
              const baseVal = selectedCharacterSheet.attributes_values[attrKey] || 0;
              const modVal = modifiedAttrs[attrKey] ?? baseVal;
              const diff = modVal - baseVal;

              return (
                <button
                  key={attrKey}
                  onClick={() => onRollQuickAction(attrLabels[attrKey] || attrKey, baseVal, true)}
                  disabled={rollCooldownRemaining > 0 || !canEdit}
                  className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    colors[attrKey] || 'border-slate-700 text-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {attrLabels[attrKey] || attrKey}
                  </span>
                  <span className="text-lg font-black mt-1 font-mono flex items-center gap-1 justify-center">
                    {baseVal}
                    {diff > 0 && (
                      <span className="text-[11px] text-emerald-400 font-bold font-sans shrink-0">(+{diff})</span>
                    )}
                    {diff < 0 && (
                      <span className="text-[11px] text-rose-500 font-bold font-sans shrink-0">({diff})</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recursos Secundários */}
        <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-xl space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Recursos Atuais</span>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <span className="text-[10px] text-rose-400 block font-semibold">Pontos de Vida (PV)</span>
              <span className="text-sm font-bold text-slate-200 font-mono">
                {selectedCharacterSheet.resources_current?.['PV'] ?? maxPv} / {maxPv}
              </span>
            </div>
            <div className="flex-1">
              <span className="text-[10px] text-cyan-400 block font-semibold">Pontos de Magia (PM)</span>
              <span className="text-sm font-bold text-slate-200 font-mono">
                {selectedCharacterSheet.resources_current?.['PM'] ?? maxPm} / {maxPm}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Condições Temporárias */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Status & Condições
            </span>
            {table?.master_id === currentUser?.id && (
              <button
                onClick={onOpenManageStatus}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-all cursor-pointer"
                title="Gerenciar Status Personalizados"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[...STATUS_CONDITIONS, ...customConditions].map((status) => {
              const isActive = (selectedCharacterSheet.status_effects || []).includes(status.id);
              const IconComponent = getIconComponent(status.icon);

              return (
                <button
                  key={status.id}
                  onClick={() => onToggleStatus(status.id)}
                  disabled={!canEdit}
                  title={status.description}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive
                      ? status.colorClass + ' border-purple-500/50 shadow-md shadow-purple-500/5'
                      : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 shrink-0 ${isActive && status.icon === 'Loader2' ? 'animate-spin' : ''}`} />
                  <span className="truncate">{status.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rolagens Customizadas */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Ações e Rolagens Customizadas
          </span>
          
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {(selectedCharacterSheet.custom_rolls || []).map((roll: any, index: number) => (
              <button
                key={roll.id || index}
                onClick={() => onRollQuickAction(roll.name, 0, false, roll)}
                disabled={rollCooldownRemaining > 0 || !canEdit}
                className="w-full flex justify-between items-center bg-[#1e293b]/30 hover:bg-[#1e293b]/50 border border-slate-800/80 p-3 rounded-xl transition-all duration-200 text-left active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-350">{roll.name}</span>
                    {roll.type && roll.type !== 'OTHER' && (
                      <span className="text-[8px] bg-amber-950/40 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        {roll.type === 'ATTACK' ? 'Ataque' : 
                         roll.type === 'DEFENSE' ? 'Defesa' : 
                         roll.type === 'MAGIC' ? 'Magia' : 
                         roll.type === 'TEST' ? 'Teste' : 
                         roll.type === 'INITIATIVE' ? 'Iniciativa' : roll.type}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                      {roll.components?.map((c: any) => `${c.count}d${c.faces}`).join(' + ') || `${roll.diceCount || 1}d6`}
                    </span>
                    {roll.primaryAttribute !== 'none' && roll.primaryAttribute && (
                      <span className="text-[9px] text-purple-400 font-mono">+{roll.primaryAttribute}</span>
                    )}
                    {roll.globalModifier !== 0 && roll.globalModifier && (
                      <span className="text-[9px] text-emerald-400 font-mono">
                        {roll.globalModifier >= 0 ? `+${roll.globalModifier}` : roll.globalModifier}
                      </span>
                    )}
                    {roll.pmCost !== undefined && roll.pmCost > 0 && (
                      <span className="text-[9px] text-blue-400 font-mono font-bold">({roll.pmCost} PM)</span>
                    )}
                  </div>
                </div>
                <Dice5 className="w-4 h-4 text-purple-400 flex-shrink-0 ml-2" />
              </button>
            ))}
            {(!selectedCharacterSheet.custom_rolls || selectedCharacterSheet.custom_rolls.length === 0) && (
              <div className="text-center py-4 text-xs text-slate-500 italic">
                Nenhuma rolagem customizada criada.
              </div>
            )}
          </div>
        </div>

        {/* Vantagens e Perícias */}
        <div className="space-y-3 border-t border-slate-800/85 pt-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Habilidades & Características
          </span>
          
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto text-xs pr-1">
            {(selectedCharacterSheet.advantages || []).map((adv: any, index: number) => (
              <div key={index} className="flex justify-between items-center bg-slate-800/10 p-2 rounded-lg border border-slate-800/40">
                <span className="text-slate-300 font-medium">{adv.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">Vantagem</span>
              </div>
            ))}
            {(selectedCharacterSheet.disadvantages || []).map((dis: any, index: number) => (
              <div key={index} className="flex justify-between items-center bg-slate-800/10 p-2 rounded-lg border border-slate-800/40">
                <span className="text-slate-300 font-medium">{dis.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">Desvantagem</span>
              </div>
            ))}
            {(selectedCharacterSheet.skills || []).map((sk: any, index: number) => (
              <div key={index} className="flex justify-between items-center bg-slate-800/10 p-2 rounded-lg border border-slate-800/40">
                <span className="text-slate-300 font-medium">{typeof sk === 'object' ? sk.name : sk}</span>
                <span className="text-[10px] text-slate-500 font-mono">Perícia</span>
              </div>
            ))}
          </div>
        </div>

        {/* Itens & Equipamentos */}
        <div className="space-y-3 border-t border-slate-800/85 pt-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Itens & Equipamentos
          </span>
          
          <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
            {(selectedCharacterSheet.inventory || []).map((item: any) => (
              <div key={item.id} className="flex justify-between items-center bg-[#1e293b]/20 border border-slate-800/60 p-2.5 rounded-xl text-xs gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-200 truncate">{item.name}</span>
                    {item.bonus_attribute && item.bonus_value !== undefined && (
                      <span className="text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 px-1 py-0.5 rounded font-bold whitespace-nowrap">
                        {item.bonus_value >= 0 ? `+${item.bonus_value}` : item.bonus_value} {
                          item.bonus_attribute === 'F' ? 'Força' :
                          item.bonus_attribute === 'H' ? 'Habilidade' :
                          item.bonus_attribute === 'R' ? 'Resistência' :
                          item.bonus_attribute === 'A' ? 'Armadura' :
                          item.bonus_attribute === 'PdF' ? 'Poder de Fogo' : item.bonus_attribute
                        }
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Qtd: {item.quantity}</span>
                </div>

                {item.bonus_attribute && (
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={async () => {
                      const updatedInventory = selectedCharacterSheet.inventory.map((i: any) => 
                        i.id === item.id ? { ...i, is_equipped: !i.is_equipped } : i
                      );
                      await onUpdateInventory(updatedInventory);
                    }}
                    className={`text-[9px] px-2 py-1 rounded-lg border transition-all active:scale-95 cursor-pointer font-bold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                      item.is_equipped
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30'
                        : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {item.is_equipped ? 'Equipado ⚔️' : 'Equipar'}
                  </button>
                )}
              </div>
            ))}
            {(!selectedCharacterSheet.inventory || selectedCharacterSheet.inventory.length === 0) && (
              <div className="text-center py-4 text-xs text-slate-500 italic">
                Nenhum item no inventário.
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="border-t border-slate-800 pt-4 mt-4">
        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-semibold transition-colors"
        >
          Fechar Painel
        </button>
      </div>

    </div>
  );
}
