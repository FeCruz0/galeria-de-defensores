import { describe, it, expect, vi } from 'vitest';
import * as npcService from '../npcService';
import * as clientUtils from '../../utils/supabase/client';
import * as serverUtils from '../../utils/supabase/server';

describe('NPC Service Suite (Fase 11, Item 3)', () => {
  it('should export all NPC management functions', () => {
    expect(typeof npcService.fetchTableNpcs).toBe('function');
    expect(typeof npcService.createNpc).toBe('function');
    expect(typeof npcService.updateNpc).toBe('function');
    expect(typeof npcService.deleteNpc).toBe('function');
  });

  it('should fetch table NPCs via Supabase client', async () => {
    const mockNpcs = [
      { id: 'npc-1', table_id: 'tbl-1', name: 'Goblin Guerreiro', attributes_values: { F: 1 }, resources_current: { PV: 5 } },
    ];

    const mockClient = {
      from: (table: string) => {
        if (table === 'table_npcs') {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({ data: mockNpcs, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }
    } as any;

    vi.spyOn(clientUtils, 'createClient').mockImplementation(() => mockClient);
    vi.spyOn(serverUtils, 'createClient').mockImplementation(async () => mockClient);

    const res = await npcService.fetchTableNpcs('tbl-1');
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('Goblin Guerreiro');
  });
});
