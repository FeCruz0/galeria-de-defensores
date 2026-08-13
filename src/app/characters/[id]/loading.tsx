import React from 'react';

export default function CharacterLoading() {
  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 p-4 md:p-8 space-y-8 animate-pulse relative">
      {/* Background neon blur effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-700/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top breadcrumb & actions */}
      <div className="flex justify-between items-center relative">
        <div className="h-5 w-32 bg-slate-800 rounded" />
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-slate-800 rounded-lg" />
          <div className="h-9 w-24 bg-slate-800/60 rounded-lg" />
        </div>
      </div>

      {/* Profile Header Block */}
      <div className="bg-[#0f172a]/45 border border-slate-800/70 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center relative">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex-shrink-0" />
        
        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="h-7 w-48 bg-slate-800 rounded mx-auto md:mx-0" />
          <div className="h-4 w-64 bg-slate-800/60 rounded mx-auto md:mx-0" />
          <div className="flex gap-2 justify-center md:justify-start">
            <div className="h-5 w-16 bg-slate-800/40 rounded" />
            <div className="h-5 w-24 bg-slate-800/40 rounded" />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl text-center min-w-[140px] space-y-1.5">
          <div className="h-3 w-20 bg-slate-800/60 rounded mx-auto" />
          <div className="h-8 w-16 bg-slate-800 rounded mx-auto" />
        </div>
      </div>

      {/* Main Grid: Attributes vs Vantagens/Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
        
        {/* Left Column: Stats & Attributes */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0f172a]/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="h-5 w-28 bg-slate-800 rounded" />
            
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-[#0c1224]/60 border border-slate-850 rounded-xl">
                  <div className="space-y-1">
                    <div className="h-4 w-20 bg-slate-800 rounded" />
                    <div className="h-2.5 w-12 bg-slate-800/60 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg" />
                    <div className="h-8 w-8 bg-slate-800 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Vantagens, Perícias, Inventário */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Vantagens & Perícias */}
          <div className="bg-[#0f172a]/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-5 w-36 bg-slate-800 rounded" />
              <div className="h-8 w-28 bg-slate-800/60 rounded-xl" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#0c1224]/50 border border-slate-850 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 bg-slate-800 rounded" />
                    <div className="h-4 w-8 bg-slate-800 rounded" />
                  </div>
                  <div className="h-3 w-full bg-slate-800/40 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Card: Inventário */}
          <div className="bg-[#0f172a]/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-5 w-24 bg-slate-800 rounded" />
              <div className="h-8 w-24 bg-slate-800/60 rounded-xl" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-[#0c1224]/50 border border-slate-850 p-3 rounded-xl flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="h-4 w-32 bg-slate-800 rounded" />
                    <div className="h-3 w-48 bg-slate-800/60 rounded" />
                  </div>
                  <div className="w-8 h-8 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
