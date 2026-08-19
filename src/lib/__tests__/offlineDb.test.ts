import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  saveLocalCharacter, 
  getLocalCharacter, 
  getAllLocalCharacters, 
  queuePendingSync, 
  getPendingSyncs, 
  clearPendingSync 
} from '../offlineDb';
import { Character } from '@/types/game';

describe('Módulo OfflineDB (IndexedDB Helper)', () => {
  const mockChar: Character = {
    id: 'offline-char-1',
    user_id: 'user-1',
    rule_system_id: 'sys-1',
    name: 'Herói Offline',
    scale: 0,
    points_total: 10,
    points_spent: 5,
    concept: 'Herói de Testes',
    experience: 0,
    attributes_values: { F: 2, H: 2, R: 1, A: 0, PdF: 0 },
    resources_current: { PV: 5, PM: 5 },
    advantages: [],
    disadvantages: [],
    skills: [],
    specializations: [],
    spells: [],
    inventory: [],
    custom_rolls: [],
    damage_type_forca: 'Corte',
    damage_type_pdf: 'Perfuração',
    saved_points: 0,
    status_effects: [],
    annotations: '',
    is_hidden: false,
    image_url: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('deve exportar todas as funções de persistência local', () => {
    expect(typeof saveLocalCharacter).toBe('function');
    expect(typeof getLocalCharacter).toBe('function');
    expect(typeof getAllLocalCharacters).toBe('function');
    expect(typeof queuePendingSync).toBe('function');
    expect(typeof getPendingSyncs).toBe('function');
    expect(typeof clearPendingSync).toBe('function');
  });

  it('deve retornar null ou lista vazia com segurança se IndexedDB não estiver presente', async () => {
    const char = await getLocalCharacter('invalid-id');
    expect(char).toBeNull();

    const all = await getAllLocalCharacters();
    expect(all).toEqual([]);

    const pending = await getPendingSyncs();
    expect(pending).toEqual([]);
  });
});
