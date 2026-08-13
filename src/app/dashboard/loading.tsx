import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 p-4 md:p-8 space-y-8 animate-pulse relative">
      {/* Background neon blur effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-700/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-800 rounded-lg" />
          <div className="h-4 w-64 bg-slate-800/60 rounded" />
        </div>
        <div className="h-10 w-36 bg-slate-800 rounded-xl" />
      </div>

      {/* Stats Summary Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#0f172a]/50 border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <div className="h-4 w-24 bg-slate-800/60 rounded" />
            <div className="h-8 w-16 bg-slate-800 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Primary Panels Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
        
        {/* Panel 1: Characters */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-6 w-32 bg-slate-800 rounded" />
            <div className="h-8 w-32 bg-slate-800/70 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#0f172a]/40 border border-slate-800/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-slate-800 rounded" />
                    <div className="h-3 w-1/2 bg-slate-800/60 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-800/40 rounded" />
                  <div className="h-2 w-4/5 bg-slate-800/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Active Tables */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-6 w-28 bg-slate-800 rounded" />
            <div className="h-8 w-24 bg-slate-800/70 rounded-xl" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#0f172a]/40 border border-slate-800/60 rounded-2xl p-5 flex justify-between items-center gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-1/3 bg-slate-800 rounded" />
                  <div className="h-3.5 w-2/3 bg-slate-800/60 rounded" />
                </div>
                <div className="w-8 h-8 bg-slate-800 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
