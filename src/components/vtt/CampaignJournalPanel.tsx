'use client';

import React from 'react';
import { Shield, Lock, Loader2 } from 'lucide-react';
import { Profile, Table } from '@/types/game';

interface CampaignJournalPanelProps {
  savingPublic: boolean;
  publicJournal: string;
  setPublicJournal: (value: string) => void;
  savingPrivate: boolean;
  privateJournal: string;
  setPrivateJournal: (value: string) => void;
  currentUser: Profile | null;
  table: Table | null;
}

export default function CampaignJournalPanel({
  savingPublic,
  publicJournal,
  setPublicJournal,
  savingPrivate,
  privateJournal,
  setPrivateJournal,
  currentUser,
  table
}: CampaignJournalPanelProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Conteúdo do Diário */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Seção 1: Diário do Mestre (Público) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              Diário do Mestre (Público)
            </span>
            {savingPublic && (
              <span className="text-[10px] text-purple-400 flex items-center gap-1 font-mono">
                <Loader2 className="w-3 h-3 animate-spin" />
                Salvando...
              </span>
            )}
            {!savingPublic && publicJournal.trim() !== '' && (
              <span className="text-[10px] text-slate-500 font-mono">Salvo</span>
            )}
          </div>

          {currentUser?.id === table?.master_id ? (
            <>
              <textarea
                value={publicJournal}
                onChange={(e) => setPublicJournal(e.target.value)}
                placeholder="Escreva as notas públicas da campanha aqui (NPCs, história, rumores)... Todos os jogadores verão em tempo real."
                maxLength={5000}
                className="w-full h-44 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 text-xs focus:outline-none focus:border-purple-500/50 text-slate-200 resize-none font-sans leading-relaxed animate-fade-in"
              />
              <div className="flex justify-end text-[10px] text-slate-500 font-mono mt-1 pr-1">
                {publicJournal.length} / 5000
              </div>
            </>
          ) : (
            <div className="w-full min-h-24 max-h-56 overflow-y-auto bg-slate-900/40 border border-slate-850 rounded-xl p-4 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {publicJournal.trim() !== '' 
                ? publicJournal 
                : <span className="text-slate-550 italic">Nenhuma anotação pública registrada pelo Mestre até o momento.</span>
              }
            </div>
          )}
        </div>

        {/* Seção 2: Minhas Notas (Privado) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              Minhas Notas (Privado)
            </span>
            {savingPrivate && (
              <span className="text-[10px] text-purple-400 flex items-center gap-1 font-mono">
                <Loader2 className="w-3 h-3 animate-spin" />
                Salvando...
              </span>
            )}
            {!savingPrivate && privateJournal.trim() !== '' && (
              <span className="text-[10px] text-slate-500 font-mono">Salvo</span>
            )}
          </div>
          <>
            <textarea
              value={privateJournal}
              onChange={(e) => setPrivateJournal(e.target.value)}
              placeholder="Escreva suas anotações secretas e lembretes aqui... Apenas você tem acesso a estas notas."
              maxLength={5000}
              className="w-full h-56 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 text-xs focus:outline-none focus:border-purple-500/50 text-slate-200 resize-none font-sans leading-relaxed animate-fade-in"
            />
            <div className="flex justify-end text-[10px] text-slate-500 font-mono mt-1 pr-1">
              {privateJournal.length} / 5000
            </div>
          </>
        </div>

      </div>
    </div>
  );
}
