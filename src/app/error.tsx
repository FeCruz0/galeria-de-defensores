'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error safely to the console
    console.error('Captured by App Router Root Error Boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b19] overflow-hidden px-4 relative">
      {/* Background neon blur effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-700/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="relative w-full max-w-md bg-[#0f172a]/75 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/35 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/10 animate-pulse">
            <AlertOctagon className="w-10 h-10 text-rose-500" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent tracking-wide">
            Algo deu errado!
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Ocorreu uma falha inesperada durante a execução da página. Nossa equipe já foi notificada.
          </p>
        </div>

        {/* Optional digested message or default fallback */}
        <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg text-left text-xs font-mono text-slate-500 break-all select-all">
          <span className="text-rose-400 font-bold block mb-1">ID da Falha:</span>
          {error.digest || 'error_internal_exception_route'}
        </div>

        {/* Buttons / Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-purple-500/20 active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
          
          <Link
            href="/dashboard"
            className="flex-1 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Ir para Início
          </Link>
        </div>

      </div>
    </div>
  );
}
