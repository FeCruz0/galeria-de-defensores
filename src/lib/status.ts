export interface StatusCondition {
  id: string;
  name: string;
  description: string;
  icon: string; // Nome do ícone Lucide
  colorClass: string; // Classes do Tailwind para texto e fundo
}

export const STATUS_CONDITIONS: StatusCondition[] = [
  {
    id: 'defending',
    name: 'Defendendo',
    description: 'Dobra a Armadura (A) nos cálculos de FD (Força de Defesa).',
    icon: 'Shield',
    colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    id: 'helpless',
    name: 'Indefeso',
    description: 'Reduz a Habilidade (H) e a Armadura (A) a 0 para rolagens de FD e Esquivas.',
    icon: 'ShieldAlert',
    colorClass: 'text-red-400 bg-red-500/10 border-red-500/20'
  },
  {
    id: 'concentrating',
    name: 'Concentrando',
    description: 'Focado acumulando energia. Útil para magias ou ataques especiais futuros.',
    icon: 'Loader2',
    colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  },
  {
    id: 'paralyzed',
    name: 'Paralisado',
    description: 'Incapaz de agir. Reduz a Habilidade (H) a 0 para testes e esquivas.',
    icon: 'ZapOff',
    colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  }
];
