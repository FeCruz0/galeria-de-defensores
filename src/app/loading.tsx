import React from 'react';
import { Shield } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070b19] overflow-hidden px-4 relative">
      {/* Background neon blur effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-700/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Loading Container */}
      <div className="relative flex flex-col items-center space-y-4">
        
        {/* Glowing Spinning Outer Border */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl border border-purple-500/30 animate-spin [animation-duration:3s]" />
          <div className="absolute inset-2 rounded-xl border border-cyan-500/25 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
          
          {/* Inner Shield Icon */}
          <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Shield className="w-6 h-6 text-white animate-pulse" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-1">
          <h2 className="text-sm font-semibold text-slate-350 tracking-wider uppercase">
            Carregando
          </h2>
          <div className="flex justify-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0s]" />
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.15s]" />
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.3s]" />
          </div>
        </div>

      </div>
    </div>
  );
}
