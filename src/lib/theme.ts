export type ThemeId = 'dark' | 'cyberpunk' | 'retro';

export interface UserPreferences {
  theme: ThemeId;
  section_order: string[];
}

export const DEFAULT_SECTION_ORDER = [
  'attributes',
  'resources',
  'qualities',
  'spells',
  'inventory',
  'rolls'
];

export const SECTION_NAMES: Record<string, string> = {
  attributes: 'Atributos & Estatísticas',
  resources: 'Pontos de Vida & Magia',
  qualities: 'Vantagens, Desvantagens e Perícias',
  spells: 'Magias & Grimório',
  inventory: 'Inventário & Equipamentos',
  rolls: 'Rolagens Personalizadas'
};

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  previewClass: string;
  bgClass: string;
  cardBgClass: string;
  borderClass: string;
  textPrimaryClass: string;
  accentClass: string;
  headerBgClass: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Dark Neon (Padrão)',
    description: 'Visual moderno escuro com detalhes roxos e cianos em vidro fosco.',
    previewClass: 'bg-[#070b19] border-purple-500/50 text-slate-100',
    bgClass: 'bg-[#070b19]',
    cardBgClass: 'bg-[#0f172a]/70',
    borderClass: 'border-slate-800',
    textPrimaryClass: 'text-slate-100',
    accentClass: 'text-purple-400 bg-purple-600',
    headerBgClass: 'bg-[#0f172a]/40 backdrop-blur-md'
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Estilo sci-fi neon com fundos amarelados e acentos magenta/amarelo.',
    previewClass: 'bg-[#09090b] border-yellow-500/60 text-yellow-300',
    bgClass: 'bg-[#09090b]',
    cardBgClass: 'bg-[#18181b]/90 border-yellow-500/30',
    borderClass: 'border-yellow-500/30',
    textPrimaryClass: 'text-yellow-100',
    accentClass: 'text-yellow-400 bg-yellow-500',
    headerBgClass: 'bg-[#18181b]/80 backdrop-blur-md border-b-2 border-yellow-500/40'
  },
  retro: {
    id: 'retro',
    name: '3D&T Clássico (Pergaminho)',
    description: 'Visual vintage de manual clássico com fundos amadeirados e acentos em ouro.',
    previewClass: 'bg-[#1c1917] border-amber-600/50 text-amber-100',
    bgClass: 'bg-[#1c1917]',
    cardBgClass: 'bg-[#292524]/80 border-amber-800/40',
    borderClass: 'border-amber-900/40',
    textPrimaryClass: 'text-amber-100',
    accentClass: 'text-amber-400 bg-amber-600',
    headerBgClass: 'bg-[#292524]/60 backdrop-blur-md border-b border-amber-900/50'
  }
};

export const DEFAULT_AVATARS = [
  { id: 'guerreiro', name: 'Guerreiro', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80' },
  { id: 'maga', name: 'Maga Arcana', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80' },
  { id: 'arqueira', name: 'Arqueira', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80' },
  { id: 'paladino', name: 'Paladino', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80' },
  { id: 'dragao', name: 'Dragão', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
  { id: 'ciborgue', name: 'Ciborgue Sci-Fi', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=150&auto=format&fit=crop&q=80' }
];

export function getTheme(themeId?: string): ThemeConfig {
  if (themeId && themeId in THEMES) {
    return THEMES[themeId as ThemeId];
  }
  return THEMES.dark;
}
