'use client';

import React from 'react';
import { ArrowLeft, Crown, Sword, Eye, BookOpen, Skull, Settings } from 'lucide-react';
import { Table, TableNPC } from '@/types/game';
import OnlineMembersBar from './OnlineMembersBar';

interface VttHeaderProps {
  table: Table;
  userRole: string;
  onlineUsers: any[];
  tableNpcs: TableNPC[];
  onBackToDashboard: () => void;
  onOpenMembersModal: () => void;
  onOpenNpcDrawer: () => void;
  onOpenSettingsModal: () => void;
}

export default function VttHeader({
  table,
  userRole,
  onlineUsers,
  tableNpcs,
  onBackToDashboard,
  onOpenMembersModal,
  onOpenNpcDrawer,
  onOpenSettingsModal,
}: VttHeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-[#0f172a]/40 backdrop-blur-md h-16 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBackToDashboard}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base text-white leading-tight">{table.name}</h1>
            {userRole === 'MASTER' && (
              <span className="text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" /> Mestre
              </span>
            )}
            {userRole === 'PLAYER' && (
              <span className="text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 px-2 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1">
                <Sword className="w-3 h-3 text-cyan-400" /> Jogador
              </span>
            )}
            {(userRole === 'SPECTATOR' || userRole === 'GUEST') && (
              <span className="text-[10px] bg-slate-800/80 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1">
                <Eye className="w-3 h-3 text-purple-400" /> Espectador
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate max-w-md">{table.description || 'Sem descrição'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {table.rule_systems?.name && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-350 bg-purple-950/20 border border-purple-800/35 px-3 py-1.5 rounded-full">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold">{table.rule_systems.name}</span>
          </div>
        )}

        <OnlineMembersBar
          onlineUsers={onlineUsers}
          onOpenMembersModal={onOpenMembersModal}
        />

        {userRole === 'MASTER' && (
          <>
            <button
              onClick={onOpenNpcDrawer}
              className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-800/35 px-3 py-1.5 rounded-full transition-all cursor-pointer"
              title="Ameaças & NPCs do Mestre"
            >
              <Skull className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-bold hidden sm:inline">Ameaças ({tableNpcs.length})</span>
            </button>

            <button
              onClick={onOpenSettingsModal}
              className="p-2 hover:bg-purple-950/40 text-slate-400 hover:text-purple-400 rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title="Configurações da Mesa"
            >
              <Settings className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
