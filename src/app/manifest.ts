import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Galeria de Defensores — RPG Online 3D&T',
    short_name: 'GaleriaDefensores',
    description: 'Gerencie suas fichas de personagem, customize sistemas de regras (Sandbox) e jogue RPG 3D&T online.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070b19',
    theme_color: '#9333ea',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
