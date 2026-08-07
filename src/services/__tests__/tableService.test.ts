import { describe, it, expect, vi } from 'vitest';
import * as tableService from '../tableService';
import { supabase } from '../../lib/supabase';

describe('Table Service Extended Suite (Fase 11, Item 2)', () => {
  it('should export all new table management functions', () => {
    expect(typeof tableService.fetchAllPublicTables).toBe('function');
    expect(typeof tableService.fetchTableMembers).toBe('function');
    expect(typeof tableService.joinTable).toBe('function');
    expect(typeof tableService.updateMemberRole).toBe('function');
    expect(typeof tableService.kickTableMember).toBe('function');
  });

  it('should prevent promote when max_players limit is reached in updateMemberRole', async () => {
    const mockTable = { id: 'tbl-1', name: 'Mesa Teste', max_players: 2 };
    const mockMembers = [
      { table_id: 'tbl-1', player_id: 'p1', role: 'player' },
      { table_id: 'tbl-1', player_id: 'p2', role: 'player' },
      { table_id: 'tbl-1', player_id: 'p3', role: 'spectator' },
    ];

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'tables') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: mockTable, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'table_players') {
        return {
          select: () => ({
            eq: async () => ({ data: mockMembers, error: null }),
          }),
        } as any;
      }
      return {} as any;
    });

    const res = await tableService.updateMemberRole('tbl-1', 'p3', 'player');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Limite de 2 jogadores atingido');
  });
});
