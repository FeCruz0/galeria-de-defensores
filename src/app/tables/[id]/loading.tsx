import React from 'react';

export default function TableLoading() {
  return (
    <div className="h-screen w-screen bg-[#070b19] overflow-hidden flex flex-col text-slate-100 p-3 md:p-5 space-y-4 animate-pulse relative">
      {/* Background neon blur effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-700/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navbar Skeleton */}
      <div className="h-14 bg-[#0f172a]/70 border border-slate-800/80 rounded-2xl flex items-center justify-between px-5 flex-shrink-0 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-800 rounded-lg" />
          <div className="h-5 w-40 bg-slate-800 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="w-9 h-9 bg-slate-800 rounded-xl" />
          <div className="w-9 h-9 bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="flex-1 flex gap-4 min-h-0 relative">
        
        {/* Left Side: Connected Members */}
        <div className="w-64 bg-[#0f172a]/40 border border-slate-800/60 rounded-2xl p-4 flex flex-col gap-4 hidden lg:flex">
          <div className="h-5 w-24 bg-slate-800 rounded" />
          <div className="flex-1 space-y-3 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 bg-[#0c1224]/50 border border-slate-850 p-2.5 rounded-xl">
                <div className="w-9 h-9 bg-slate-800 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-3/4 bg-slate-800 rounded" />
                  <div className="h-2.5 w-1/2 bg-slate-800/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Dice Rolling Area / Board */}
        <div className="flex-1 bg-[#0f172a]/45 border border-slate-800/70 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-5 w-36 bg-slate-800 rounded" />
            <div className="h-5 w-24 bg-slate-800/60 rounded" />
          </div>
          
          {/* Big central dice scene placeholder */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-32 h-32 bg-slate-800/20 border border-slate-800/40 rounded-full flex items-center justify-center animate-spin [animation-duration:8s]">
              <div className="w-20 h-20 bg-slate-800/30 border border-slate-850 rounded-2xl" />
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <div className="h-10 w-32 bg-slate-800 rounded-xl" />
            <div className="h-10 w-28 bg-slate-800/60 rounded-xl" />
          </div>
        </div>

        {/* Right Side: Chat Panel */}
        <div className="w-80 bg-[#0f172a]/40 border border-slate-800/60 rounded-2xl flex flex-col min-w-0">
          {/* Tabs header */}
          <div className="p-3 border-b border-slate-800/60 flex gap-2">
            <div className="h-8 w-1/2 bg-slate-800 rounded-lg" />
            <div className="h-8 w-1/2 bg-slate-800/60 rounded-lg" />
          </div>

          {/* Messages area */}
          <div className="flex-1 p-4 space-y-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex flex-col gap-1.5 ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
                <div className="h-3 w-16 bg-slate-800/60 rounded" />
                <div className={`h-12 w-48 bg-slate-800/${i % 2 === 0 ? '70' : '40'} rounded-2xl`} />
              </div>
            ))}
          </div>

          {/* Input field */}
          <div className="p-3 border-t border-slate-800/60 bg-[#0c1224]/50 flex gap-2">
            <div className="flex-1 h-10 bg-slate-800/40 border border-slate-800 rounded-xl" />
            <div className="w-10 h-10 bg-slate-800 rounded-xl" />
          </div>
        </div>

      </div>
    </div>
  );
}
