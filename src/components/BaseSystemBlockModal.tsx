'use client';

import React, { useState } from 'react';
import { ShieldAlert, Loader2, X, Copy } from 'lucide-react';

interface BaseSystemBlockModalProps {
  systemName: string;
  onConfirmClone: () => Promise<void>;
  onClose: () => void;
}

export default function BaseSystemBlockModal({
  systemName,
  onConfirmClone,
  onClose,
}: BaseSystemBlockModalProps) {
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState('');

  const handleClone = async () => {
    setCloning(true);
    setError('');
    try {
      await onConfirmClone();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Falha ao duplicar o sistema de regras. Tente novamente.');
      setCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0f172a]/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/30">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Sistema Base Protegido
            </h3>
          </div>
          {!cloning && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-350 leading-relaxed">
            O sistema <strong className="text-slate-200">{systemName}</strong> é um sistema nativo padrão e suas vantagens/perícias originais são protegidas contra modificações.
          </p>
          <p className="text-xs text-slate-350 leading-relaxed">
            Deseja duplicar este sistema de regras e vinculá-lo a este personagem para que você possa personalizar livremente? As modificações afetarão apenas esta cópia.
          </p>

          {error && (
            <div className="p-3 text-xs font-semibold text-rose-400 bg-rose-950/20 border border-rose-900/30 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-800/60 bg-slate-900/30">
          {!cloning && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-xl transition-all"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleClone}
            disabled={cloning}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 border border-amber-500/20 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-amber-900/20 active:scale-[0.98] disabled:active:scale-100"
          >
            {cloning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Duplicando...
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Criar Cópia do Sistema
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
