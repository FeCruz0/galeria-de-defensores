'use client';

import React, { useEffect, useState } from 'react';

interface DiceRollOverlayProps {
  diceResults: number[];
  diceFaces?: number;
  onComplete: () => void;
  title?: string;
}

type Vec3 = [number, number, number];

export default function DiceRollOverlay({ 
  diceResults, 
  diceFaces = 6, 
  onComplete, 
  title = 'Rolando Dados' 
}: DiceRollOverlayProps) {
  const [animationPhase, setAnimationPhase] = useState<'rolling' | 'settled'>('rolling');
  
  // Guardar rotações dos dados (no d100, guarda pares de dezenas e unidades)
  const [rotations, setRotations] = useState<{ rx: number; ry: number }[]>([]);
  const [rotationsUnits, setRotationsUnits] = useState<{ rx: number; ry: number }[]>([]);

  useEffect(() => {
    // Definir rotações iniciais aleatórias
    const initialRotations = diceResults.map(() => ({
      rx: Math.floor(Math.random() * 360),
      ry: Math.floor(Math.random() * 360)
    }));
    const initialUnits = diceResults.map(() => ({
      rx: Math.floor(Math.random() * 360),
      ry: Math.floor(Math.random() * 360)
    }));

    setRotations(initialRotations);
    setRotationsUnits(initialUnits);

    // Animação com desaceleração física fluida (Easing Cubic Ease-Out)
    let animationFrameId: number;
    const duration = 1600;
    const startTime = performance.now();

    // Rotações finais alvo calculadas matematicamente via Normais 3D
    const targetAngles = diceResults.map((val) => {
      if (diceFaces === 100) {
        const tensVal = val === 100 ? 0 : Math.floor(val / 10) * 10;
        return getTargetAnglesByFaceNormal(10, tensVal, true, false);
      }
      return getTargetAnglesByFaceNormal(diceFaces, val);
    });

    const targetAnglesUnits = diceResults.map((val) => {
      if (diceFaces === 100) {
        const unitsVal = val === 100 ? 0 : val % 10;
        return getTargetAnglesByFaceNormal(10, unitsVal, false, true);
      }
      return { rx: 0, ry: 0 };
    });

    const animate = (now: number) => {
      const elapsed = Math.min(duration, now - startTime);
      const progress = elapsed / duration;
      
      // Curva de desaceleração física (ease-out cúbico)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      if (progress < 1) {
        setRotations(initialRotations.map((init, idx) => {
          const target = targetAngles[idx];
          const totalSpinsX = 720 * (1 - easeOut);
          const totalSpinsY = 720 * (1 - easeOut);
          return {
            rx: target.rx + totalSpinsX,
            ry: target.ry + totalSpinsY
          };
        }));

        if (diceFaces === 100) {
          setRotationsUnits(initialUnits.map((init, idx) => {
            const target = targetAnglesUnits[idx];
            const totalSpinsX = 720 * (1 - easeOut);
            const totalSpinsY = 720 * (1 - easeOut);
            return {
              rx: target.rx + totalSpinsX,
              ry: target.ry + totalSpinsY
            };
          }));
        }

        animationFrameId = requestAnimationFrame(animate);
      } else {
        setAnimationPhase('settled');
        setRotations(targetAngles);
        if (diceFaces === 100) {
          setRotationsUnits(targetAnglesUnits);
        }
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    const autoDismissTimer = setTimeout(() => {
      onComplete();
    }, 3800);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(autoDismissTimer);
    };
  }, [diceResults, diceFaces, onComplete]);

  const total = diceResults.reduce((acc, curr) => acc + curr, 0);

  return (
    <div 
      onClick={onComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md cursor-pointer animate-fade-in select-none"
    >
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes diceBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

      {/* Cabeçalho */}
      <div className="text-center space-y-1.5 pointer-events-none mb-6">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
          {title}
        </span>
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400 font-mono tracking-wider">
          {diceResults.length}d{diceFaces}
        </h2>
      </div>

      {/* Container Principal de Dados */}
      <div className="flex flex-wrap gap-10 justify-center items-center py-6 px-6 max-w-5xl">
        {diceFaces === 100 ? (
          /* Rolagem de d100: Agrupamento em pares (Dezena + Unidade com Rotações Independentes) */
          diceResults.map((val, idx) => {
            const rotTens = rotations[idx] || { rx: 0, ry: 0 };
            const rotUnits = rotationsUnits[idx] || { rx: 0, ry: 0 };

            const tensVal = val === 100 ? 0 : Math.floor(val / 10) * 10;
            const unitsVal = val === 100 ? 0 : val % 10;

            return (
              <div 
                key={idx} 
                className="flex items-center gap-3 bg-slate-900/60 border border-cyan-500/30 p-4 rounded-3xl backdrop-blur-md shadow-2xl"
                style={{
                  animation: animationPhase === 'rolling' ? `diceBounce 0.6s ease-in-out infinite alternate ${idx * 0.15}s` : 'none'
                }}
              >
                {/* Dado de Dezenas */}
                <div className="w-40 h-40 flex items-center justify-center relative">
                  <Polyhedral3DEngine 
                    faces={10} 
                    val={tensVal} 
                    rx={rotTens.rx} 
                    ry={rotTens.ry} 
                    isD100Tens
                    isSettled={animationPhase === 'settled'}
                  />
                </div>
                {/* Dado de Unidades */}
                <div className="w-40 h-40 flex items-center justify-center relative">
                  <Polyhedral3DEngine 
                    faces={10} 
                    val={unitsVal} 
                    rx={rotUnits.rx} 
                    ry={rotUnits.ry} 
                    isD100Units
                    isSettled={animationPhase === 'settled'}
                  />
                </div>
              </div>
            );
          })
        ) : (
          /* Dados d4, d6, d8, d10, d12, d20 Padrão */
          diceResults.map((val, idx) => {
            const rot = rotations[idx] || { rx: 0, ry: 0 };
            return (
              <div 
                key={idx} 
                className="w-44 h-44 flex items-center justify-center relative"
                style={{
                  animation: animationPhase === 'rolling' ? `diceBounce 0.6s ease-in-out infinite alternate ${idx * 0.12}s` : 'none'
                }}
              >
                <Polyhedral3DEngine 
                  faces={diceFaces} 
                  val={val} 
                  rx={rot.rx} 
                  ry={rot.ry} 
                  isSettled={animationPhase === 'settled'}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Total Geral */}
      <div className={`mt-6 text-center space-y-1 transition-all duration-400 ${
        animationPhase === 'settled' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Total da Rolagem</span>
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-300 font-mono drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
          {total}
        </h1>
        <p className="text-[11px] text-slate-500 animate-pulse pt-3 font-semibold">
          Clique em qualquer lugar para fechar
        </p>
      </div>
    </div>
  );
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
