'use client';

import React from 'react';
import { Crown, Eye, User, MessageSquare, Dices } from 'lucide-react';
import { PresenceUserInfo } from '@/hooks/useTablePresence';

interface OnlineMembersBarProps {
  onlineUsers: PresenceUserInfo[];
  onOpenMembersModal: () => void;
}

export default function OnlineMembersBar({ onlineUsers, onOpenMembersModal }: OnlineMembersBarProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Lista de Avatares Sobrepostos */}
      <button
        onClick={onOpenMembersModal}
        className="flex -space-x-2.5 hover:space-x-1.5 transition-all duration-300 items-center cursor-pointer group p-1 rounded-full hover:bg-slate-800/30"
        title="Ver Membros & Status Online"
      >
        {onlineUsers.slice(0, 5).map((user, idx) => {
          // Cores de borda com base no papel (role)
          let borderCol = 'border-slate-700';
          let roleIcon = <User className="w-2.5 h-2.5" />;
          if (user.role === 'MASTER') {
            borderCol = 'border-purple-500';
            roleIcon = <Crown className="w-2.5 h-2.5 text-purple-400" />;
          } else if (user.role === 'SPECTATOR' || user.role === 'GUEST') {
            borderCol = 'border-slate-500';
            roleIcon = <Eye className="w-2.5 h-2.5 text-slate-400" />;
          } else {
            borderCol = 'border-cyan-500';
            roleIcon = <User className="w-2.5 h-2.5 text-cyan-400" />;
          }

          return (
            <div
              key={user.user_id}
              className="relative w-8 h-8 rounded-full border-2 bg-slate-900 flex items-center justify-center text-xs font-bold text-white transition-transform group-hover:scale-105 shrink-0"
              style={{ borderColor: borderCol ? undefined : 'currentColor', zIndex: 10 - idx }}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="uppercase text-[10px]">
                  {user.username.slice(0, 2)}
                </span>
              )}

              {/* Indicador de Status Online Individual */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />

              {/* Indicador Animado (Digitando ou Rolando) */}
              {(user.isTyping || user.isRolling) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-600 border border-slate-950 flex items-center justify-center animate-bounce shadow-md">
                  {user.isRolling ? (
                    <Dices className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <MessageSquare className="w-2.5 h-2.5 text-white" />
                  )}
                </span>
              )}
            </div>
          );
        })}

        {onlineUsers.length > 5 && (
          <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-[10px] font-extrabold text-slate-300 shrink-0 z-0">
            +{onlineUsers.length - 5}
          </div>
        )}
      </button>

      {/* Resumo Telegraphic */}
      <button
        onClick={onOpenMembersModal}
        className="hidden md:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/20 hover:bg-emerald-900/30 border border-emerald-800/35 px-3 py-1.5 rounded-full transition-all cursor-pointer font-semibold"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>{onlineUsers.length} Online</span>
      </button>
    </div>
  );
}
