'use client';

import React, { useEffect, useState } from 'react';

interface DiceRollOverlayProps {
  diceResults: number[];
  onComplete: () => void;
  title?: string;
}

export default function DiceRollOverlay({ diceResults, onComplete, title = 'Rolando Dados' }: DiceRollOverlayProps) {
  const [animationPhase, setAnimationPhase] = useState<'rolling' | 'settled'>('rolling');
  const [rotations, setRotations] = useState<string[]>([]);

  // Map d6 faces to correct rotation degrees to face forward
  const getTargetRotation = (val: number) => {
    switch (val) {
      case 1: return { x: 0, y: 0 };
      case 2: return { x: -90, y: 0 };
      case 3: return { x: 0, y: 90 };
      case 4: return { x: 0, y: -90 };
      case 5: return { x: 90, y: 0 };
      case 6: return { x: 180, y: 0 };
      default: return { x: 0, y: 0 };
    }
  };

  useEffect(() => {
    // Generate initial spinning state
    const initialRotations = diceResults.map(() => {
      const rx = Math.floor(Math.random() * 360) + 360;
      const ry = Math.floor(Math.random() * 360) + 360;
      return `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(45deg)`;
    });
    setRotations(initialRotations);

    // Transition to target rotations for real values
    const timer1 = setTimeout(() => {
      const finalRotations = diceResults.map((val) => {
        const target = getTargetRotation(val);
        // Add extra full spins for realistic chaotic motion
        const spinsX = 3 * 360; // 3 full loops
        const spinsY = 3 * 360;
        return `rotateX(${target.x + spinsX}deg) rotateY(${target.y + spinsY}deg) rotateZ(0deg)`;
      });
      setRotations(finalRotations);
    }, 50);

    // Mark animation as settled
    const timer2 = setTimeout(() => {
      setAnimationPhase('settled');
    }, 1300);

    // Auto-dismiss
    const timer3 = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [diceResults, onComplete]);

  const total = diceResults.reduce((acc, curr) => acc + curr, 0);

  return (
    <div 
      onClick={onComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md cursor-pointer animate-fade-in"
    >
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes diceBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .preserve-3d {
          transform-style: preserve-3d;
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>

      <div className="text-center space-y-2 select-none pointer-events-none mb-8">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
          {title}
        </span>
        <h2 className="text-lg font-bold text-purple-400">
          {diceResults.length}d6
        </h2>
      </div>

      {/* Dice Container */}
      <div className="flex flex-wrap gap-8 justify-center items-center py-6 px-4 max-w-lg preserve-3d">
        {diceResults.map((val, idx) => (
          <div 
            key={idx} 
            className="w-16 h-16 relative preserve-3d"
            style={{
              animation: animationPhase === 'rolling' ? `diceBounce 0.5s ease-in-out infinite alternate ${idx * 0.1}s` : 'none'
            }}
          >
            {/* The CSS 3D Cube */}
            <div 
              className="w-full h-full absolute transition-transform duration-[1200ms] ease-out preserve-3d"
              style={{
                transform: rotations[idx] || 'rotateX(0deg) rotateY(0deg)'
              }}
            >
              {/* Face 1 */}
              <div className="absolute inset-0 bg-slate-900 border-2 border-purple-500/80 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-purple-500/20 backface-hidden"
                   style={{ transform: 'rotateY(0deg) translateZ(2rem)' }}>
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              {/* Face 6 */}
              <div className="absolute inset-0 bg-slate-900 border-2 border-purple-500/80 rounded-2xl p-2.5 grid grid-cols-2 gap-2 shadow-lg shadow-purple-500/20 backface-hidden"
                   style={{ transform: 'rotateY(180deg) translateZ(2rem)' }}>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full mx-auto"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full mx-auto"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full mx-auto"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full mx-auto"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full mx-auto"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full mx-auto"></div>
              </div>
              {/* Face 3 */}
              <div className="absolute inset-0 bg-slate-900 border-2 border-purple-500/80 rounded-2xl p-2.5 flex flex-col justify-between items-center shadow-lg shadow-purple-500/20 backface-hidden"
                   style={{ transform: 'rotateY(90deg) translateZ(2rem)' }}>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full self-start"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full self-end"></div>
              </div>
              {/* Face 4 */}
              <div className="absolute inset-0 bg-slate-900 border-2 border-purple-500/80 rounded-2xl p-2.5 grid grid-cols-2 gap-2 shadow-lg shadow-purple-500/20 backface-hidden"
                   style={{ transform: 'rotateY(-90deg) translateZ(2rem)' }}>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full"></div>
              </div>
              {/* Face 5 */}
              <div className="absolute inset-0 bg-slate-900 border-2 border-purple-500/80 rounded-2xl p-2 flex flex-col justify-between items-center shadow-lg shadow-purple-500/20 backface-hidden"
                   style={{ transform: 'rotateX(90deg) translateZ(2rem)' }}>
                <div className="flex w-full justify-between">
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full"></div>
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full"></div>
                </div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full"></div>
                <div className="flex w-full justify-between">
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full"></div>
                  <div className="w-2.5 h-2.5 bg-purple-400 rounded-full"></div>
                </div>
              </div>
              {/* Face 2 */}
              <div className="absolute inset-0 bg-slate-900 border-2 border-purple-500/80 rounded-2xl p-2.5 flex justify-between items-center shadow-lg shadow-purple-500/20 backface-hidden"
                   style={{ transform: 'rotateX(-90deg) translateZ(2rem)' }}>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full self-start"></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full self-end"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Settle Summary */}
      <div className={`mt-8 text-center space-y-2 select-none transition-all duration-300 ${
        animationPhase === 'settled' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Total</span>
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
          {total}
        </h1>
        <p className="text-[10px] text-slate-500 animate-pulse pt-4">
          Clique em qualquer lugar para fechar
        </p>
      </div>
    </div>
  );
}
