import React from 'react';
import { Users, Crown, UserCheck, UserMinus, UserX } from 'lucide-react';
import { Table, TablePlayer } from '@/types/game';
import { updateMemberRoleAction, kickTableMemberAction } from '@/actions/tableActions';

interface TableMembersModalProps {
  table: Table;
  isOpen: boolean;
  onClose: () => void;
  tablePlayers: TablePlayer[];
  onlineUserIds: string[];
  userRole: 'MASTER' | 'PLAYER' | 'SPECTATOR' | 'GUEST';
  showToast: (msg: string) => void;
}

export default function TableMembersModal({
  table,
  isOpen,
  onClose,
  tablePlayers,
  onlineUserIds,
  userRole,
  showToast,
}: TableMembersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fade-in">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Membros & Presença Realtime
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider bg-slate-800/40 border border-slate-700/30 px-2 py-1 rounded-lg cursor-pointer"
          >
            Fechar ×
          </button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {/* Seção Mestre */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> Mestre da Mesa
            </span>
            <div className="bg-purple-950/20 border border-purple-900/30 p-3 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Mestre</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Online
              </span>
            </div>
          </div>

          {/* Lista de Membros (Jogadores e Espectadores) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> Membros Conectados ({tablePlayers.length})
              </span>
              <span className="text-[10px] text-slate-500">
                Limite: {tablePlayers.filter((p) => p.role === 'player').length}/{table.max_players ?? 4} Jogadores
              </span>
            </div>

            <div className="space-y-2">
              {tablePlayers.map((member) => {
                const isOnline = onlineUserIds.includes(member.player_id);
                const username =
                  (Array.isArray(member.profiles) ? member.profiles[0]?.username : member.profiles?.username) ||
                  'Usuário';
                const roleLabel = member.role === 'player' ? 'Jogador' : 'Espectador';

                return (
                  <div
                    key={member.player_id}
                    className="bg-[#070b19]/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                        }`}
                      ></span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-200 block truncate">{username}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                            member.role === 'player'
                              ? 'text-cyan-400 border-cyan-800/30 bg-cyan-950/30'
                              : 'text-purple-400 border-purple-800/30 bg-purple-950/30'
                          }`}
                        >
                          {roleLabel}
                        </span>
                      </div>
                    </div>

                    {/* Ações do Mestre */}
                    {userRole === 'MASTER' && (
                      <div className="flex items-center gap-1 shrink-0">
                        {member.role === 'spectator' ? (
                          <button
                            onClick={async () => {
                              const res = await updateMemberRoleAction({
                                table_id: table.id,
                                player_id: member.player_id,
                                role: 'player',
                              });
                              if (res.success) {
                                showToast(`Promovido ${username} a Jogador!`);
                              } else {
                                showToast(res.message || 'Erro ao promover.');
                              }
                            }}
                            className="p-1.5 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-800/40 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Promover a Jogador"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Promover
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              const res = await updateMemberRoleAction({
                                table_id: table.id,
                                player_id: member.player_id,
                                role: 'spectator',
                              });
                              if (res.success) {
                                showToast(`Rebaixado ${username} a Espectador.`);
                              } else {
                                showToast(res.message || 'Erro ao rebaixar.');
                              }
                            }}
                            className="p-1.5 bg-purple-950/40 hover:bg-purple-900/40 text-purple-400 border border-purple-800/40 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Rebaixar a Espectador"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            Rebaixar
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            const res = await kickTableMemberAction(table.id, member.player_id);
                            if (res.success) {
                              showToast(`Membro ${username} removido da mesa.`);
                            } else {
                              showToast('Erro ao remover membro.');
                            }
                          }}
                          className="p-1.5 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-800/40 rounded-lg transition-all cursor-pointer animate-fade-in"
                          title="Expulsar da Mesa"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {tablePlayers.length === 0 && (
                <p className="text-xs text-slate-505 italic py-2">
                  Nenhum jogador ou espectador nesta mesa além do mestre.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
