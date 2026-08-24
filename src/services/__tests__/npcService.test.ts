import { describe, it, expect, vi } from 'vitest';
import * as npcService from '../npcService';
import { TableNPC } from '../../types/game';

describe('NPC Service Suite Extended', () => {
  const mockNpc: TableNPC = {
    id: 'npc-123',
    table_id: 'tbl-123',
    name: 'Goblin Xamã',
    concept: 'Ameaça da Floresta',
    attributes_values: { F: 1, H: 2, R: 1, A: 1, PdF: 1 },
    resources_current: { PV: 5, PM: 10 },
    resources_max: { PV: 5, PM: 10 },
    advantages: ['Magia Elemental'],
    disadvantages: ['Frágil'],
    notes: 'Conjura bolas de fogo pequenas.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should export all NPC management functions', () => {
    expect(typeof npcService.fetchTableNpcs).toBe('function');
    expect(typeof npcService.createNpc).toBe('function');
    expect(typeof npcService.updateNpc).toBe('function');
    expect(typeof npcService.deleteNpc).toBe('function');
  });

  describe('fetchTableNpcs', () => {
    it('should retrieve table NPCs successfully', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockNpc], error: null }),
      } as any;

      const result = await npcService.fetchTableNpcs('tbl-123', mockClient);
      expect(mockClient.from).toHaveBeenCalledWith('table_npcs');
      expect(result).toEqual([mockNpc]);
    });

    it('should return empty list if query fails', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Query error') }),
      } as any;

      const result = await npcService.fetchTableNpcs('tbl-123', mockClient);
      expect(result).toEqual([]);
    });
  });

  describe('createNpc', () => {
    it('should insert NPC successfully', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockNpc, error: null }),
      } as any;

      const result = await npcService.createNpc({ name: 'Goblin Xamã' }, mockClient);
      expect(result.npc).toEqual(mockNpc);
      expect(result.error).toBeUndefined();
    });

    it('should return error if insert fails', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert constraint error' } }),
      } as any;

      const result = await npcService.createNpc({ name: 'Goblin Xamã' }, mockClient);
      expect(result.npc).toBeNull();
      expect(result.error).toBe('Insert constraint error');
    });
  });

  describe('updateNpc', () => {
    it('should update NPC attributes/details', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockNpc, error: null }),
      } as any;

      const result = await npcService.updateNpc('npc-123', { name: 'Novo Nome' }, mockClient);
      expect(result).toEqual(mockNpc);
    });

    it('should return null if update fails', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Update error') }),
      } as any;

      const result = await npcService.updateNpc('npc-123', { name: 'Novo Nome' }, mockClient);
      expect(result).toBeNull();
    });
  });

  describe('deleteNpc', () => {
    it('should delete NPC entry', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as any;

      const result = await npcService.deleteNpc('npc-123', mockClient);
      expect(result).toBe(true);
    });

    it('should return false if delete fails', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Delete error') }),
      } as any;

      const result = await npcService.deleteNpc('npc-123', mockClient);
      expect(result).toBe(false);
    });
  });
});
