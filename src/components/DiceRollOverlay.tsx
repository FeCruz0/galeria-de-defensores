'use client';

import React, { useEffect, useState, useRef } from 'react';

interface DiceRollOverlayProps {
  diceResults: number[];
  diceFaces?: number;
  onComplete: () => void;
  title?: string;
}

type Vec3 = [number, number, number];

interface DiePhysics {
  id: number;
  val: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rx: number;
  ry: number;
  dhRx: number;
  dhRy: number;
  state: 'idle' | 'rolling' | 'dragging' | 'settled';
  size: number;
  // Para d100 (dezena e unidade)
  tensVal?: number;
  unitsVal?: number;
  rxUnits?: number;
  ryUnits?: number;
  dhRxUnits?: number;
  dhRyUnits?: number;
}

export default function DiceRollOverlay({ 
  diceResults, 
  diceFaces = 6, 
  onComplete, 
  title = 'Rolando Dados' 
}: DiceRollOverlayProps) {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'rolling' | 'settled'>('idle');
  const [dicePhysics, setDicePhysics] = useState<DiePhysics[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingGroupRef = useRef<boolean>(false);
  const wasDraggingRef = useRef<boolean>(false);
  const touchHistoryRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const dragOffsetsRef = useRef<{ id: number; offsetX: number; offsetY: number }[]>([]);

  // Rotações finais alvo calculadas matematicamente via Normais 3D
  const targetAnglesRef = useRef<{ rx: number; ry: number }[]>([]);
  const targetAnglesUnitsRef = useRef<{ rx: number; ry: number }[]>([]);

  useEffect(() => {
    targetAnglesRef.current = diceResults.map((val) => {
      if (diceFaces === 100) {
        const tensVal = val === 100 ? 0 : Math.floor(val / 10) * 10;
        return getTargetAnglesByFaceNormal(10, tensVal, true, false);
      }
      return getTargetAnglesByFaceNormal(diceFaces, val);
    });

    targetAnglesUnitsRef.current = diceResults.map((val) => {
      if (diceFaces === 100) {
        const unitsVal = val === 100 ? 0 : val % 10;
        return getTargetAnglesByFaceNormal(10, unitsVal, false, true);
      }
      return { rx: 0, ry: 0 };
    });

    // Posições e velocidades iniciais dos dados (Grid Responsivo Centralizado na Viewport)
    const getScreenDimensions = () => {
      const w = Math.max(320, typeof window !== 'undefined' ? window.innerWidth : 800);
      const h = Math.max(400, typeof window !== 'undefined' ? window.innerHeight : 600);
      return { w, h };
    };

    const { w, h } = getScreenDimensions();
    const count = diceResults.length;
    const isD100 = diceFaces === 100;
    const dieW = isD100 ? Math.min(w - 20, 270) : Math.min(w - 20, 150);
    const dieH = isD100 ? 140 : 150;
    const gap = 16;

    // Calcular colunas e linhas responsivas para caber perfeitamente na viewport
    const maxCols = Math.max(1, Math.floor((w - 20) / (dieW + gap)));
    const numCols = Math.min(count, maxCols);
    const numRows = Math.ceil(count / numCols);

    const totalGridH = numRows * dieH + (numRows - 1) * gap;
    const startGridY = Math.max(75, (h - totalGridH) / 2);

    const initialDice: DiePhysics[] = diceResults.map((val, idx) => {
      const row = Math.floor(idx / numCols);
      const col = idx % numCols;
      const itemsInRow = Math.min(numCols, count - row * numCols);

      const rowWidth = itemsInRow * dieW + (itemsInRow - 1) * gap;
      const startRowX = (w - rowWidth) / 2;

      const calcX = startRowX + col * (dieW + gap);
      const calcY = startGridY + row * (dieH + gap);

      return {
        id: idx,
        val,
        x: Math.max(10, Math.min(w - dieW - 10, calcX)),
        y: Math.max(70, Math.min(h - dieH - 70, calcY)),
        dx: 0,
        dy: 0,
        rx: Math.floor(Math.random() * 360),
        ry: Math.floor(Math.random() * 360),
        dhRx: 0,
        dhRy: 0,
        state: 'idle',
        size: dieW,
        tensVal: val === 100 ? 0 : Math.floor(val / 10) * 10,
        unitsVal: val === 100 ? 0 : val % 10,
        rxUnits: Math.floor(Math.random() * 360),
        ryUnits: Math.floor(Math.random() * 360),
        dhRxUnits: 0,
        dhRyUnits: 0,
      };
    });

    setDicePhysics(initialDice);

    let animationFrameId: number;
    let autoDismissTimer: NodeJS.Timeout | null = null;

    const runPhysicsLoop = () => {
      const curW = Math.max(320, window.innerWidth || 800);
      const curH = Math.max(400, window.innerHeight || 600);
      const minX = 10;
      const minY = 70;

      setDicePhysics((prevDice) => {
        if (prevDice.length === 0) return prevDice;

        const nextDice = prevDice.map((die, idx) => {
          if (die.state === 'idle') {
            // Garantir que se a janela carregar ou for redimensionada, os dados estáticos fiquem perfeitamente centralizados
            const dW = die.size;
            const dH = isD100 ? 140 : 150;
            const g = 16;
            const mCols = Math.max(1, Math.floor((curW - 20) / (dW + g)));
            const nCols = Math.min(prevDice.length, mCols);
            const nRows = Math.ceil(prevDice.length / nCols);
            const gridH = nRows * dH + (nRows - 1) * g;
            const gridY = Math.max(75, (curH - gridH) / 2);
            const r = Math.floor(idx / nCols);
            const c = idx % nCols;
            const inRow = Math.min(nCols, prevDice.length - r * nCols);
            const rW = inRow * dW + (inRow - 1) * g;
            const rX = (curW - rW) / 2;
            const targetX = Math.max(10, Math.min(curW - dW - 10, rX + c * (dW + g)));
            const targetY = Math.max(70, Math.min(curH - dH - 70, gridY + r * (dH + g)));

            // Atualizar posições estáticas se houver discrepância por causa de carregamento
            if (Math.abs(die.x - targetX) > 2 || Math.abs(die.y - targetY) > 2) {
              return { ...die, x: targetX, y: targetY };
            }
            return die;
          }

          if (die.state === 'dragging') {
            return die;
          }

          if (die.state === 'settled') {
            return die;
          }

          // Atualizar Posição 2D
          let newX = die.x + die.dx;
          let newY = die.y + die.dy;
          let newDx = die.dx;
          let newDy = die.dy;

          // Atualizar Rotações 3D
          let newRx = die.rx + die.dhRx;
          let newRy = die.ry + die.dhRy;
          let newDhRx = die.dhRx * 0.96;
          let newDhRy = die.dhRy * 0.96;

          let newRxUnits = (die.rxUnits ?? 0) + (die.dhRxUnits ?? 0);
          let newRyUnits = (die.ryUnits ?? 0) + (die.dhRyUnits ?? 0);
          let newDhRxUnits = (die.dhRxUnits ?? 0) * 0.96;
          let newDhRyUnits = (die.dhRyUnits ?? 0) * 0.96;

          const maxX = curW - die.size - 10;
          const maxY = curH - die.size - 120;

          // Rebatimento nas Paredes (Wall Bouncing com Restituição de 70%)
          if (newX < minX) {
            newX = minX;
            newDx = Math.abs(newDx) * 0.7;
            newDhRx += (Math.random() * 20 - 10);
          } else if (newX > maxX) {
            newX = maxX;
            newDx = -Math.abs(newDx) * 0.7;
            newDhRx += (Math.random() * 20 - 10);
          }

          if (newY < minY) {
            newY = minY;
            newDy = Math.abs(newDy) * 0.7;
            newDhRy += (Math.random() * 20 - 10);
          } else if (newY > maxY) {
            newY = maxY;
            newDy = -Math.abs(newDy) * 0.7;
            newDhRy += (Math.random() * 20 - 10);
          }

          // Atrito Físico 2D (Damping)
          newDx *= 0.975;
          newDy *= 0.975;

          const currentSpeed = Math.sqrt(newDx * newDx + newDy * newDy);
          const target = targetAnglesRef.current[idx] || { rx: 0, ry: 0 };
          const targetUnits = targetAnglesUnitsRef.current[idx] || { rx: 0, ry: 0 };

          let newState: 'rolling' | 'settled' = 'rolling';

          // Fase de Pouso & Desaceleração Rotação 3D (Landing Phase - Alinhamento Ultra-Suave Lento)
          if (currentSpeed < 6.5) {
            // Amortecimento angular harmônico que desacelera junto com o movimento linear
            newDhRx *= 0.90;
            newDhRy *= 0.90;
            newDhRxUnits *= 0.90;
            newDhRyUnits *= 0.90;

            // Interpolação ultra-lenta (3.5% por quadro) para alinhamento gradual sem sobressalto
            newRx = lerpAngle(newRx, target.rx, 0.035);
            newRy = lerpAngle(newRy, target.ry, 0.035);
            if (diceFaces === 100) {
              newRxUnits = lerpAngle(newRxUnits, targetUnits.rx, 0.035);
              newRyUnits = lerpAngle(newRyUnits, targetUnits.ry, 0.035);
            }
          }

          // Verificar diferença de ângulo restante para o alvo
          const diffRx = getShortestAngleDiff(newRx, target.rx);
          const diffRy = getShortestAngleDiff(newRy, target.ry);
          const diffRxUnits = diceFaces === 100 ? getShortestAngleDiff(newRxUnits, targetUnits.rx) : 0;
          const diffRyUnits = diceFaces === 100 ? getShortestAngleDiff(newRyUnits, targetUnits.ry) : 0;

          const isAligned = 
            Math.abs(diffRx) < 1.2 && 
            Math.abs(diffRy) < 1.2 && 
            Math.abs(diffRxUnits) < 1.2 && 
            Math.abs(diffRyUnits) < 1.2;
          const isStopped = currentSpeed < 0.15;

          // Critério de parada suave e contínua
          if (isStopped && isAligned) {
            newState = 'settled';
            newDx = 0;
            newDy = 0;
            newDhRx = 0;
            newDhRy = 0;
            newDhRxUnits = 0;
            newDhRyUnits = 0;
            newRx = target.rx;
            newRy = target.ry;
            newRxUnits = targetUnits.rx;
            newRyUnits = targetUnits.ry;
          }

          return {
            ...die,
            x: newX,
            y: newY,
            dx: newDx,
            dy: newDy,
            rx: newRx,
            ry: newRy,
            dhRx: newDhRx,
            dhRy: newDhRy,
            rxUnits: newRxUnits,
            ryUnits: newRyUnits,
            dhRxUnits: newDhRxUnits,
            dhRyUnits: newDhRyUnits,
            state: newState
          };
        });

        // Colisões Elásticas entre Dados (Dice-to-Dice Collision)
        for (let i = 0; i < nextDice.length; i++) {
          for (let j = i + 1; j < nextDice.length; j++) {
            const d1 = nextDice[i];
            const d2 = nextDice[j];

            const c1x = d1.x + d1.size / 2;
            const c1y = d1.y + d1.size / 2;
            const c2x = d2.x + d2.size / 2;
            const c2y = d2.y + d2.size / 2;

            const dx = c2x - c1x;
            const dy = c2y - c1y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = (d1.size + d2.size) * 0.46;

            if (dist < minDist) {
              // Separação Estática
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              if (d1.state === 'rolling') {
                d1.x -= nx * overlap * 0.5;
                d1.y -= ny * overlap * 0.5;
              }
              if (d2.state === 'rolling') {
                d2.x += nx * overlap * 0.5;
                d2.y += ny * overlap * 0.5;
              }

              // Impulso Elástico Dinâmico com Transferência Angular Intensificada
              const rvx = d2.dx - d1.dx;
              const rvy = d2.dy - d1.dy;
              const velAlongNormal = rvx * nx + rvy * ny;

              if (velAlongNormal < 0) {
                const restitution = 0.88;
                const impulse = -(1 + restitution) * velAlongNormal / 2;

                // Força de Rotação Angular proporcional ao impacto
                const spinPower = Math.min(50, Math.abs(velAlongNormal) * 3 + 28);

                if (d1.state === 'rolling') {
                  d1.dx -= impulse * nx;
                  d1.dy -= impulse * ny;
                  d1.dhRx += (Math.random() * spinPower - spinPower / 2);
                  d1.dhRy += (Math.random() * spinPower - spinPower / 2);
                  if (diceFaces === 100) {
                    d1.dhRxUnits = (d1.dhRxUnits ?? 0) + (Math.random() * spinPower - spinPower / 2);
                    d1.dhRyUnits = (d1.dhRyUnits ?? 0) + (Math.random() * spinPower - spinPower / 2);
                  }
                }
                if (d2.state === 'rolling') {
                  d2.dx += impulse * nx;
                  d2.dy += impulse * ny;
                  d2.dhRx += (Math.random() * spinPower - spinPower / 2);
                  d2.dhRy += (Math.random() * spinPower - spinPower / 2);
                  if (diceFaces === 100) {
                    d2.dhRxUnits = (d2.dhRxUnits ?? 0) + (Math.random() * spinPower - spinPower / 2);
                    d2.dhRyUnits = (d2.dhRyUnits ?? 0) + (Math.random() * spinPower - spinPower / 2);
                  }
                }
              }
            }
          }
        }

        // Verificar se todos os dados já foram lançados e se estabilizaram
        const hasBeenThrown = nextDice.some((d) => d.state === 'rolling' || d.state === 'settled');
        const allSettled = hasBeenThrown && nextDice.every((d) => d.state === 'settled');
        if (allSettled && animationPhase !== 'settled') {
          setAnimationPhase('settled');
          if (!autoDismissTimer) {
            autoDismissTimer = setTimeout(() => {
              onComplete();
            }, 4500);
          }
        }

        return nextDice;
      });

      animationFrameId = requestAnimationFrame(runPhysicsLoop);
    };

    animationFrameId = requestAnimationFrame(runPhysicsLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (autoDismissTimer) clearTimeout(autoDismissTimer);
    };
  }, [diceResults, diceFaces, onComplete]);

  // Manipulação de Eventos de Arraste/Arremesso em Grupo (Pointer Events para Touch e Mouse)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (animationPhase === 'settled') return;

    isDraggingGroupRef.current = true;
    wasDraggingRef.current = false;
    touchHistoryRef.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];

    dragOffsetsRef.current = dicePhysics.map((d) => ({
      id: d.id,
      offsetX: e.clientX - d.x,
      offsetY: e.clientY - d.y
    }));

    setDicePhysics((prev) =>
      prev.map((d) =>
        d.state === 'idle' || d.state === 'dragging'
          ? { ...d, state: 'dragging', dx: 0, dy: 0 }
          : d
      )
    );
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingGroupRef.current) return;

    wasDraggingRef.current = true;
    const now = performance.now();
    const history = touchHistoryRef.current;
    history.push({ x: e.clientX, y: e.clientY, t: now });
    if (history.length > 6) history.shift();

    const offsetsMap = new Map(dragOffsetsRef.current.map((o) => [o.id, o]));

    setDicePhysics((prev) =>
      prev.map((d) => {
        if (d.state !== 'dragging') return d;
        const offset = offsetsMap.get(d.id);
        if (!offset) return d;

        const newX = e.clientX - offset.offsetX;
        const newY = e.clientY - offset.offsetY;
        const deltaX = newX - d.x;

        return {
          ...d,
          x: newX,
          y: newY,
          rx: d.rx + deltaX * 1.5,
          ry: d.ry + (newY - d.y) * 1.5
        };
      })
    );
  };

  const handlePointerUp = () => {
    if (!isDraggingGroupRef.current) return;

    const history = touchHistoryRef.current;
    let vx = 0;
    let vy = 0;

    if (history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      const dt = Math.max(1, last.t - first.t);
      vx = ((last.x - first.x) / dt) * 16;
      vy = ((last.y - first.y) / dt) * 16;
    }

    // Se o arremesso foi muito lento, aplicar impulso mínimo padrão para girar suavemente
    if (Math.abs(vx) < 3 && Math.abs(vy) < 3) {
      vx = (Math.random() * 16 - 8);
      vy = (Math.random() * 16 - 8);
    }

    isDraggingGroupRef.current = false;
    touchHistoryRef.current = [];
    wasDraggingRef.current = true;
    setTimeout(() => {
      wasDraggingRef.current = false;
    }, 300);

    setAnimationPhase('rolling');

    setDicePhysics((prev) => {
      const draggingCount = prev.filter((d) => d.state === 'dragging').length;
      return prev.map((d) => {
        if (d.state !== 'dragging') return d;

        // Adicionar pequena variação aleatória de velocidade por dado para espalhamento realístico
        const spreadX = draggingCount > 1 ? (Math.random() * 12 - 6) : 0;
        const spreadY = draggingCount > 1 ? (Math.random() * 12 - 6) : 0;

        return {
          ...d,
          state: 'rolling',
          dx: Math.max(-35, Math.min(35, vx + spreadX)),
          dy: Math.max(-35, Math.min(35, vy + spreadY)),
          dhRx: Math.random() * 30 - 15,
          dhRy: Math.random() * 30 - 15
        };
      });
    });
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (wasDraggingRef.current) {
      e.stopPropagation();
      wasDraggingRef.current = false;
      return;
    }
    if (animationPhase === 'settled') {
      onComplete();
    }
  };

  const total = diceResults.reduce((acc, curr) => acc + curr, 0);

  return (
    <div 
      ref={containerRef}
      onClick={handleContainerClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950/85 backdrop-blur-md cursor-pointer animate-fade-in select-none overflow-hidden touch-none"
    >
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounceSubtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-bounce-subtle {
          animation: bounceSubtle 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* Cabeçalho Fixo */}
      <div className="text-center space-y-1 pt-6 pointer-events-none z-10">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
          {title}
        </span>
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 font-mono tracking-wider">
          {diceResults.length}d{diceFaces}
        </h2>
        <p className="text-[11px] font-bold text-cyan-400 animate-pulse pt-1">
          {animationPhase === 'idle' 
            ? '🖐️ Segure e arremesse os dados para rolar!' 
            : animationPhase === 'rolling'
            ? '🎲 Dados em movimento...'
            : '✨ Rolagem concluída!'}
        </p>
      </div>

      {/* Arena de Física dos Dados (Posicionamento Livre 2D) */}
      <div className="absolute inset-0 pointer-events-auto overflow-hidden">
        {dicePhysics.map((die, idx) => {
          return (
            <div
              key={idx}
              onPointerDown={handlePointerDown}
              className="absolute touch-none cursor-grab active:cursor-grabbing transition-shadow duration-200"
              style={{
                transform: `translate3d(${die.x}px, ${die.y}px, 0)`,
                width: die.size,
                height: die.size,
                willChange: 'transform'
              }}
            >
              <div className={`w-full h-full ${die.state === 'idle' ? 'animate-bounce-subtle' : ''}`}>
                {diceFaces === 100 ? (
                  /* Dado de d100: Par Dezena + Unidade */
                  <div className="flex items-center gap-2 bg-slate-900/60 border border-cyan-500/30 p-2 rounded-3xl backdrop-blur-md shadow-2xl">
                    <div className="w-32 h-32 flex items-center justify-center relative">
                      <Polyhedral3DEngine 
                        faces={10} 
                        val={die.tensVal ?? 0} 
                        rx={die.rx} 
                        ry={die.ry} 
                        isD100Tens
                        isSettled={die.state === 'settled'}
                      />
                    </div>
                    <div className="w-32 h-32 flex items-center justify-center relative">
                      <Polyhedral3DEngine 
                        faces={10} 
                        val={die.unitsVal ?? 0} 
                        rx={die.rxUnits ?? 0} 
                        ry={die.ryUnits ?? 0} 
                        isD100Units
                        isSettled={die.state === 'settled'}
                      />
                    </div>
                  </div>
                ) : (
                  /* Dado d4, d6, d8, d10, d12, d20 Padrão */
                  <div className="w-full h-full flex items-center justify-center relative">
                    <Polyhedral3DEngine 
                      faces={diceFaces} 
                      val={die.val} 
                      rx={die.rx} 
                      ry={die.ry} 
                      isSettled={die.state === 'settled'}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Geral de Rodada */}
      <div className={`mb-8 text-center space-y-1 z-10 pointer-events-none transition-all duration-400 ${
        animationPhase === 'settled' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Total da Rolagem</span>
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-300 font-mono drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
          {total}
        </h1>
        <p className="text-[11px] text-slate-500 animate-pulse pt-2 font-semibold">
          Clique fora para fechar
        </p>
      </div>
    </div>
  );
}

// Cálculo da menor diferença angular
function getShortestAngleDiff(start: number, end: number) {
  let diff = (end - start) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return diff;
}

// Interpolação linear de ângulos
function lerpAngle(start: number, end: number, factor: number) {
  return start + getShortestAngleDiff(start, end) * factor;
}

/* =========================================================================
   ORIENTAÇÃO MATEMÁTICA VIA NORMAIS 3D & ILUMINAÇÃO NEON
   ========================================================================= */

// Cálculo exato da rotação (rx, ry) para alinhar a Normal da face sorteada com a Câmera (0, 0, +1)
function getTargetAnglesByFaceNormal(
  faces: number, 
  targetVal: number, 
  isD100Tens?: boolean, 
  isD100Units?: boolean
): { rx: number; ry: number } {
  let searchVal = targetVal;
  if (faces === 100) {
    searchVal = targetVal === 100 ? 0 : Math.floor(targetVal / 10) * 10;
    isD100Tens = true;
  }

  const mesh = getPolyhedronMesh(faces, isD100Tens, isD100Units);
  
  let faceIdx = mesh.faceValues.findIndex(v => v === searchVal);
  if (faceIdx === -1) faceIdx = 0;

  const vIndices = mesh.faces[faceIdx];
  const v0 = mesh.vertices[vIndices[0]];
  const v1 = mesh.vertices[vIndices[1]];
  const v2 = mesh.vertices[vIndices[2]];

  // Centroide da Face em coordenadas de objeto
  const cx = (v0[0] + v1[0] + v2[0]) / 3;
  const cy = (v0[1] + v1[1] + v2[1]) / 3;
  const cz = (v0[2] + v1[2] + v2[2]) / 3;

  // Vetor Normal da Face em coordenadas de objeto
  const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
  const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];

  let nx = ay * bz - az * by;
  let ny = az * bx - ax * bz;
  let nz = ax * by - ay * bx;

  // Garantir vetor normal voltado para fora em relação ao centroide
  if (cx * nx + cy * ny + cz * nz < 0) {
    nx = -nx; ny = -ny; nz = -nz;
  }

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  nx /= len; ny /= len; nz /= len;

  // Calcular ângulos rx, ry que rotacionam (nx, ny, nz) para apontar para (0, 0, 1)
  const ry = -Math.atan2(nx, nz) * (180 / Math.PI);
  const rx = Math.atan2(ny, Math.sqrt(nx * nx + nz * nz)) * (180 / Math.PI);

  return { rx, ry };
}

function rotatePoint(p: Vec3, rxDeg: number, ryDeg: number): Vec3 {
  const radX = (rxDeg * Math.PI) / 180;
  const radY = (ryDeg * Math.PI) / 180;

  const x1 = p[0] * Math.cos(radY) + p[2] * Math.sin(radY);
  const y1 = p[1];
  const z1 = -p[0] * Math.sin(radY) + p[2] * Math.cos(radY);

  const x2 = x1;
  const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
  const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);

  return [x2, y2, z2];
}

function Polyhedral3DEngine({ 
  faces, 
  val, 
  rx, 
  ry, 
  isD100Tens,
  isD100Units,
  isSettled 
}: { 
  faces: number; 
  val: number; 
  rx: number; 
  ry: number; 
  isD100Tens?: boolean;
  isD100Units?: boolean;
  isSettled?: boolean;
}) {
  const mesh = getPolyhedronMesh(faces, isD100Tens, isD100Units);

  // Rotacionar todos os vértices 3D
  const rotatedVerts = mesh.vertices.map(v => rotatePoint(v, rx, ry));

  // Projetar e ordenar faces por profundidade (Z-Sorting)
  const projectedFaces = mesh.faces.map((vIndices, fIdx) => {
    const faceVerts = vIndices.map(idx => rotatedVerts[idx]);
    const origVerts = vIndices.map(idx => mesh.vertices[idx]);
    
    // Profundidade média (Z-avg)
    const zAvg = faceVerts.reduce((sum, v) => sum + v[2], 0) / faceVerts.length;
    
    // Centroide 2D (X, Y) no viewBox 120x120
    const cx = faceVerts.reduce((sum, v) => sum + v[0], 0) / faceVerts.length + 60;
    const cy = faceVerts.reduce((sum, v) => sum + v[1], 0) / faceVerts.length + 60;

    // Normal da face original para checar direção externa
    const origCx = (origVerts[0][0] + origVerts[1][0] + origVerts[2][0]) / 3;
    const origCy = (origVerts[0][1] + origVerts[1][1] + origVerts[2][1]) / 3;
    const origCz = (origVerts[0][2] + origVerts[1][2] + origVerts[2][2]) / 3;

    const oAx = origVerts[1][0] - origVerts[0][0], oAy = origVerts[1][1] - origVerts[0][1], oAz = origVerts[1][2] - origVerts[0][2];
    const oBx = origVerts[2][0] - origVerts[0][0], oBy = origVerts[2][1] - origVerts[0][1], oBz = origVerts[2][2] - origVerts[0][2];

    let oNx = oAy * oBz - oAz * oBy;
    let oNy = oAz * oBx - oAx * oBz;
    let oNz = oAx * oBy - oAy * oBx;

    if (origCx * oNx + origCy * oNy + origCz * oNz < 0) {
      oNx = -oNx; oNy = -oNy; oNz = -oNz;
    }

    const oLen = Math.sqrt(oNx * oNx + oNy * oNy + oNz * oNz) || 1;
    oNx /= oLen; oNy /= oLen; oNz /= oLen;

    // Vetor Normal rotacionado
    const rotN = rotatePoint([oNx, oNy, oNz], rx, ry);
    const nz = rotN[2];
    const lightIntensity = Math.max(0.25, Math.min(1.0, (rotN[0] * 0.3 + rotN[1] * (-0.6) + rotN[2] * 0.74 + 1) / 2));

    const pointsStr = faceVerts.map(v => `${(v[0] + 60).toFixed(2)},${(v[1] + 60).toFixed(2)}`).join(' ');
    const faceNumber = mesh.faceValues[fIdx] ?? (fIdx + 1);

    // Calcular marcações (pips) em coordenadas 3D reais da face para d6
    let d6Pips2D: { x: number; y: number; isCenter: boolean }[] = [];
    if (faces === 6 && nz > 0) {
      const v0 = origVerts[0];
      const v1 = origVerts[1];
      const v3 = origVerts[3];

      const cX = (origVerts[0][0] + origVerts[1][0] + origVerts[2][0] + origVerts[3][0]) / 4;
      const cY = (origVerts[0][1] + origVerts[1][1] + origVerts[2][1] + origVerts[3][1]) / 4;
      const cZ = (origVerts[0][2] + origVerts[1][2] + origVerts[2][2] + origVerts[3][2]) / 4;

      const uX = (v1[0] - v0[0]) * 0.23;
      const uY = (v1[1] - v0[1]) * 0.23;
      const uZ = (v1[2] - v0[2]) * 0.23;

      const vX = (v3[0] - v0[0]) * 0.23;
      const vY = (v3[1] - v0[1]) * 0.23;
      const vZ = (v3[2] - v0[2]) * 0.23;

      const patterns: Record<number, [number, number][]> = {
        1: [[0, 0]],
        2: [[-1, -1], [1, 1]],
        3: [[-1, -1], [0, 0], [1, 1]],
        4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
        6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
      };

      const coords = patterns[faceNumber] || [];
      d6Pips2D = coords.map(([u, v]) => {
        const p3d: Vec3 = [
          cX + u * uX + v * vX,
          cY + u * uY + v * vY,
          cZ + u * uZ + v * vZ,
        ];
        const rotP = rotatePoint(p3d, rx, ry);
        return {
          x: rotP[0] + 60,
          y: rotP[1] + 60,
          isCenter: u === 0 && v === 0
        };
      });
    }

    return {
      fIdx,
      zAvg,
      cx,
      cy,
      pointsStr,
      lightIntensity,
      faceNumber,
      isFrontFace: nz > 0,
      d6Pips2D
    };
  });

  // Ordenar por Z do menor para o maior (Painter's Algorithm)
  projectedFaces.sort((a, b) => a.zAvg - b.zAvg);

  // Cores Base do Tema
  const baseHue = faces === 20 ? 270 : faces === 12 ? 38 : faces === 10 ? (isD100Tens || isD100Units ? 190 : 155) : faces === 8 ? 330 : faces === 4 ? 280 : 260;

  return (
    <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_20px_rgba(168,85,247,0.35)]">
      {projectedFaces.map((f) => {
        const light = f.lightIntensity;
        const isTargetValFace = f.faceNumber === val;
        
        // A face do polígono sempre mantém sua cor de tema de iluminação original
        const fillColor = `hsl(${baseHue}, 75%, ${Math.round(light * 45 + 15)}%)`;
        const strokeColor = `hsl(${baseHue}, 80%, 75%)`;

        // Destaque em Azul Royal Escuro Vibrante EXCLUSIVAMENTE nos números e marcadores
        const isHighlightedText = isSettled && f.isFrontFace && isTargetValFace;
        const textColor = isHighlightedText ? '#3b82f6' : '#ffffff';

        return (
          <g key={f.fIdx}>
            <polygon 
              points={f.pointsStr} 
              fill={fillColor} 
              stroke={strokeColor} 
              strokeWidth={f.isFrontFace ? "1.5" : "0.8"} 
              strokeLinejoin="round" 
              opacity={f.isFrontFace ? 1 : 0.4}
            />
            {/* Renderizar números/bolinhas apenas nas faces voltadas para a frente */}
            {f.isFrontFace && (
              faces === 6 ? (
                <g style={isHighlightedText ? { filter: 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.9))' } : undefined}>
                  {f.d6Pips2D.map((pip, pIdx) => (
                    <circle 
                      key={pIdx} 
                      cx={pip.x} 
                      cy={pip.y} 
                      r={pip.isCenter && f.faceNumber === 1 ? 2.8 : 2.2} 
                      fill={textColor} 
                      opacity={f.isFrontFace ? 1 : 0.4}
                    />
                  ))}
                </g>
              ) : (
                <text 
                  x={f.cx} 
                  y={f.cy + 1} 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  fill={textColor} 
                  fontSize={
                    faces === 20 
                      ? "9" 
                      : (isD100Tens || isD100Units)
                      ? "10.5" 
                      : faces === 10
                      ? "9"
                      : faces >= 100
                      ? "10.5"
                      : "12"
                  } 
                  fontWeight="900" 
                  fontFamily="monospace"
                  style={{ 
                    filter: isHighlightedText 
                      ? 'drop-shadow(0 0 8px rgba(37, 99, 235, 0.9)) drop-shadow(0 0 3px rgba(30, 64, 175, 1))' 
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
                  }}
                >
                  {isD100Tens && f.faceNumber === 0 ? '00' : f.faceNumber}
                </text>
              )
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* =========================================================================
   GEOMETRIA 3D DOS POLIEDROS (VÉRTICES E FACES)
   ========================================================================= */

function getPolyhedronMesh(
  faces: number, 
  isD100Tens?: boolean, 
  isD100Units?: boolean
): { vertices: Vec3[]; faces: number[][]; faceValues: number[] } {
  // d6 Cubo
  if (faces === 6) {
    const s = 30;
    const vertices: Vec3[] = [
      [-s, -s,  s], [ s, -s,  s], [ s,  s,  s], [-s,  s,  s],
      [-s, -s, -s], [ s, -s, -s], [ s,  s, -s], [-s,  s, -s]
    ];
    return {
      vertices,
      faces: [
        [0, 1, 2, 3], // Front (1)
        [4, 0, 3, 7], // Left (2)
        [1, 5, 6, 2], // Right (3)
        [5, 4, 7, 6], // Back (6)
        [4, 5, 1, 0], // Top (5)
        [3, 2, 6, 7]  // Bottom (4)
      ],
      faceValues: [1, 2, 3, 6, 5, 4]
    };
  }

  // d4 Tetraedro
  if (faces === 4) {
    const s = 42;
    const vertices: Vec3[] = [
      [0, -s, 0],
      [s * 0.94, s * 0.47, 0],
      [-s * 0.47, s * 0.47, s * 0.81],
      [-s * 0.47, s * 0.47, -s * 0.81]
    ];
    return {
      vertices,
      faces: [
        [0, 1, 2],
        [0, 2, 3],
        [0, 3, 1],
        [1, 3, 2]
      ],
      faceValues: [1, 2, 3, 4]
    };
  }

  // d8 Octaedro
  if (faces === 8) {
    const s = 40;
    const vertices: Vec3[] = [
      [0, -s, 0], [0, s, 0],
      [s, 0, 0], [-s, 0, 0],
      [0, 0, s], [0, 0, -s]
    ];
    return {
      vertices,
      faces: [
        [0, 4, 2], [0, 2, 5], [0, 5, 3], [0, 3, 4],
        [1, 2, 4], [1, 5, 2], [1, 3, 5], [1, 4, 3]
      ],
      faceValues: [1, 2, 3, 4, 5, 6, 7, 8]
    };
  }

  // d10 / d100 Trapezoedro Pentagonal
  if (faces === 10 || isD100Tens || isD100Units) {
    const r = 38;
    const h = 42;
    const vertices: Vec3[] = [[0, -h, 0], [0, h, 0]];
    
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 * Math.PI) / 180;
      vertices.push([r * Math.cos(a), -h * 0.2, r * Math.sin(a)]);
    }
    for (let i = 0; i < 5; i++) {
      const a = ((i * 72 + 36) * Math.PI) / 180;
      vertices.push([r * Math.cos(a), h * 0.2, r * Math.sin(a)]);
    }

    const faceIndices: number[][] = [];
    for (let i = 0; i < 5; i++) {
      const next = (i + 1) % 5;
      faceIndices.push([0, 2 + i, 7 + i, 2 + next]);
    }
    for (let i = 0; i < 5; i++) {
      const next = (i + 1) % 5;
      faceIndices.push([1, 7 + next, 2 + next, 7 + i]);
    }

    let values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    if (isD100Tens) {
      values = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    } else if (isD100Units) {
      values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    }

    return {
      vertices,
      faces: faceIndices,
      faceValues: values
    };
  }

  // d12 Dodecaedro
  if (faces === 12) {
    const phi = (1 + Math.sqrt(5)) / 2;
    const a = 22, b = a / phi, c = a * phi;
    const vertices: Vec3[] = [
      [-a, -a, -a], [-a, -a,  a], [-a,  a, -a], [-a,  a,  a],
      [ a, -a, -a], [ a, -a,  a], [ a,  a, -a], [ a,  a,  a],
      [0, -b, -c], [0, -b,  c], [0,  b, -c], [0,  b,  c],
      [-b, -c, 0], [-b,  c, 0], [ b, -c, 0], [ b,  c, 0],
      [-c, 0, -b], [-c, 0,  b], [ c, 0, -b], [ c, 0,  b]
    ];
    return {
      vertices,
      faces: [
        [3, 11, 7, 15, 13], [1, 9, 5, 14, 12], [0, 8, 4, 14, 12], [2, 10, 6, 15, 13],
        [7, 19, 5, 9, 11], [6, 18, 4, 8, 10], [2, 16, 0, 8, 10], [3, 17, 1, 9, 11],
        [15, 7, 19, 18, 6], [14, 5, 19, 18, 4], [12, 0, 16, 17, 1], [13, 2, 16, 17, 3]
      ],
      faceValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    };
  }

  // d20 Icosaedro
  const t = (1 + Math.sqrt(5)) / 2;
  const s = 26;
  const vertices: Vec3[] = [
    [-s, t * s, 0], [s, t * s, 0], [-s, -t * s, 0], [s, -t * s, 0],
    [0, -s, t * s], [0, s, t * s], [0, -s, -t * s], [0, s, -t * s],
    [t * s, 0, -s], [t * s, 0, s], [-t * s, 0, -s], [-t * s, 0, s]
  ];

  return {
    vertices,
    faces: [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ],
    faceValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  };
}
