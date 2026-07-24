'use client';

import React from 'react';
import { ShieldAlert, HelpCircle, CheckCircle2, Info, X } from 'lucide-react';

export type SystemModalType = 'alert' | 'confirm' | 'info' | 'success';

export interface SystemModalOptions {
  isOpen: boolean;
  type?: SystemModalType;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface SystemModalProps extends SystemModalOptions {
  onClose: () => void;
}

export default function SystemModal({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  onClose,
}: SystemModalProps) {
  if (!isOpen) return null;

  const isConfirmType = type === 'confirm';

  // Ícone e esquema de cores baseado no tipo
  const modalConfig = {
    alert: {
      icon: ShieldAlert,
      iconColor: 'text-amber-400',
      badgeBg: 'bg-amber-950/40 border-amber-800/30',
      buttonBg: 'bg-amber-600 hover:bg-amber-500 border-amber-500/30 text-white',
      defaultTitle: 'Aviso',
    },
    confirm: {
      icon: HelpCircle,
      iconColor: 'text-purple-400',
      badgeBg: 'bg-purple-950/40 border-purple-800/30',
      buttonBg: 'bg-purple-600 hover:bg-purple-500 border-purple-500/30 text-white',
      defaultTitle: 'Confirmação',
    },
    success: {
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/40 border-emerald-800/30',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30 text-white',
      defaultTitle: 'Sucesso',
    },
    info: {
      icon: Info,
      iconColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-950/40 border-cyan-800/30',
      buttonBg: 'bg-cyan-600 hover:bg-cyan-500 border-cyan-500/30 text-white',
      defaultTitle: 'Informação',
    },
  }[type];

  const IconComponent = modalConfig.icon;
  const displayTitle = title || modalConfig.defaultTitle;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-[#0f172a]/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-zoom-in space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg border ${modalConfig.badgeBg}`}>
              <IconComponent className={`w-4 h-4 ${modalConfig.iconColor}`} />
            </div>
            <h3 className="text-sm font-bold text-slate-100 tracking-wide">
              {displayTitle}
            </h3>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-800/60 bg-slate-900/40">
          {isConfirmType && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-5 py-2 text-xs font-bold rounded-xl border transition-all shadow-lg active:scale-95 cursor-pointer ${modalConfig.buttonBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
