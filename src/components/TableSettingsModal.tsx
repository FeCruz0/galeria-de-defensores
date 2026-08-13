import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Table } from '@/types/game';
import { updateTableSettingsAction } from '@/actions/tableActions';

interface TableSettingsModalProps {
  table: Table;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTable: any) => void;
  showToast: (msg: string) => void;
}

export default function TableSettingsModal({
  table,
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: TableSettingsModalProps) {
  const [editTableName, setEditTableName] = useState(table.name || '');
  const [editTableDesc, setEditTableDesc] = useState(table.description || '');
  const [editMaxPlayers, setEditMaxPlayers] = useState(table.max_players || 4);
  const [editAllowSpectators, setEditAllowSpectators] = useState(table.allow_spectators ?? true);
  const [editIsPrivate, setEditIsPrivate] = useState(table.is_private ?? false);
  const [editPassword, setEditPassword] = useState('');

  // Re-sync with table data when modal changes
  useEffect(() => {
    setEditTableName(table.name || '');
    setEditTableDesc(table.description || '');
    setEditMaxPlayers(table.max_players || 4);
    setEditAllowSpectators(table.allow_spectators ?? true);
    setEditIsPrivate(table.is_private ?? false);
    setEditPassword('');
  }, [table, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateTableSettingsAction(table.id, {
      name: editTableName.trim(),
      description: editTableDesc.trim(),
      max_players: editMaxPlayers,
      allow_spectators: editAllowSpectators,
      is_private: editIsPrivate,
      password: editIsPrivate && editPassword ? editPassword : null,
    });
    if (res.success) {
      showToast('Configurações da mesa atualizadas com sucesso!');
      if (res.table) {
        onSuccess(res.table);
      }
      onClose();
    } else {
      showToast(res.message || 'Erro ao atualizar mesa.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-fade-in">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Configurações da Mesa (Mestre)
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider bg-slate-800/40 border border-slate-700/30 px-2 py-1 rounded-lg cursor-pointer"
          >
            Fechar ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Nome da Mesa
            </label>
            <input
              type="text"
              required
              value={editTableName}
              onChange={(e) => setEditTableName(e.target.value)}
              className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Descrição
            </label>
            <textarea
              value={editTableDesc}
              onChange={(e) => setEditTableDesc(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <div className="flex justify-end text-[10px] text-slate-500 font-mono mt-1 pr-1">
              {editTableDesc.length} / 500
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Limite de Jogadores
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={editMaxPlayers}
                onChange={(e) => setEditMaxPlayers(parseInt(e.target.value) || 4)}
                className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/20 border border-slate-800/80 rounded-xl">
              <span className="text-xs font-semibold text-slate-350">Espectadores</span>
              <input
                type="checkbox"
                checked={editAllowSpectators}
                onChange={(e) => setEditAllowSpectators(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-800/20 border border-slate-800/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-350">Mesa Privada (Requer Senha)</span>
              <input
                type="checkbox"
                checked={editIsPrivate}
                onChange={(e) => setEditIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
              />
            </div>
            {editIsPrivate && (
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Deixe em branco para manter a senha atual"
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
