import { describe, it, expect, vi } from 'vitest';
import * as tableService from '../tableService';
import { Table, Character, TablePlayer } from '../../types/game';

describe('Table Service Extended Suite', () => {
  const mockTable: Table = {
    id: 'tbl-123',
    name: 'Mesa Épica',
    master_id: 'user-master',
    system_id: 'sys-1',
    is_private: false,
    max_players: 3,
    allow_spectators: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockPlayerMember: TablePlayer = {
    table_id: 'tbl-123',
    player_id: 'user-player-1',
    role: 'player',
    created_at: new Date().toISOString(),
  };

  const mockSpectatorMember: TablePlayer = {
    table_id: 'tbl-123',
    player_id: 'user-player-2',
    role: 'spectator',
    created_at: new Date().toISOString(),
  };

  it('should export all new table management functions', () => {
    expect(typeof tableService.fetchAllPublicTables).toBe('function');
    expect(typeof tableService.fetchTableMembers).toBe('function');
    expect(typeof tableService.joinTable).toBe('function');
    expect(typeof tableService.updateMemberRole).toBe('function');
    expect(typeof tableService.kickTableMember).toBe('function');
  });

  describe('fetchTableById', () => {
    it('should retrieve table details by ID', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTable, error: null }),
      } as any;

      const result = await tableService.fetchTableById('tbl-123', mockClient);
      expect(mockClient.from).toHaveBeenCalledWith('tables');
      expect(result).toEqual(mockTable);
    });

    it('should return null if not found or errors out', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not Found') }),
      } as any;

      const result = await tableService.fetchTableById('tbl-123', mockClient);
      expect(result).toBeNull();
    });
  });

  describe('fetchUserTables', () => {
    it('should retrieve tables associated with user', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockTable], error: null }),
      } as any;

      const result = await tableService.fetchUserTables('user-master', mockClient);
      expect(mockClient.from).toHaveBeenCalledWith('tables');
      expect(result).toEqual([mockTable]);
    });
  });

  describe('fetchAllPublicTables', () => {
    it('should retrieve all public tables and append player count', async () => {
      const publicTableData = {
        ...mockTable,
        table_players: [
          { player_id: 'p1', role: 'player' },
          { player_id: 'p2', role: 'spectator' },
        ],
      };
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [publicTableData], error: null }),
      } as any;

      const result = await tableService.fetchAllPublicTables(mockClient);
      expect(result[0].player_count).toBe(1); // Only role 'player' counts
    });
  });

  describe('fetchTableMembers', () => {
    it('should retrieve all table players and spectators', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [mockPlayerMember, mockSpectatorMember], error: null }),
      } as any;

      const result = await tableService.fetchTableMembers('tbl-123', mockClient);
      expect(result).toHaveLength(2);
    });
  });

  describe('createTable and updateTable', () => {
    it('should create table successfully', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTable, error: null }),
      } as any;

      const result = await tableService.createTable({ name: 'Nova Mesa' }, mockClient);
      expect(result).toEqual(mockTable);
    });

    it('should update table successfully', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTable, error: null }),
      } as any;

      const result = await tableService.updateTable('tbl-123', { name: 'Nome Atualizado' }, mockClient);
      expect(result).toEqual(mockTable);
    });
  });

  describe('joinTable', () => {
    it('should allow joining table directly if user is already a member', async () => {
      // Mock fetchTableById & fetchTableMembers inside joinTable by simulating client chain or mocking helpers
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tables') {
            return {
              select: () => ({ eq: () => ({ single: async () => ({ data: mockTable, error: null }) }) }),
            } as any;
          }
          if (table === 'table_players') {
            return {
              select: () => ({ eq: async () => ({ data: [mockPlayerMember], error: null }) }),
            } as any;
          }
          return {} as any;
        }),
      } as any;

      const result = await tableService.joinTable('tbl-123', 'user-player-1', 'player', undefined, mockClient);
      expect(result.success).toBe(true);
      expect(result.role).toBe('player');
    });

    it('should block joining table if private and password verify fails', async () => {
      const privateTable = { ...mockTable, is_private: true };
      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tables') {
            return {
              select: () => ({ eq: () => ({ single: async () => ({ data: privateTable, error: null }) }) }),
            } as any;
          }
          if (table === 'table_players') {
            return {
              select: () => ({ eq: async () => ({ data: [], error: null }) }),
            } as any;
          }
          return {} as any;
        }),
        rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      } as any;

      const result = await tableService.joinTable('tbl-123', 'user-player-new', 'player', 'wrong-pass', mockClient);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Senha incorreta');
    });
  });

  describe('updateMemberRole', () => {
    it('should prevent promoting to player when max_players limit is reached', async () => {
      const mockFullTable = { id: 'tbl-1', name: 'Mesa Cheia', max_players: 1 };
      const mockMembers = [
        { table_id: 'tbl-1', player_id: 'p1', role: 'player' },
        { table_id: 'tbl-1', player_id: 'p2', role: 'spectator' },
      ];

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tables') {
            return {
              select: () => ({ eq: () => ({ single: async () => ({ data: mockFullTable, error: null }) }) }),
            } as any;
          }
          if (table === 'table_players') {
            return {
              select: () => ({ eq: async () => ({ data: mockMembers, error: null }) }),
            } as any;
          }
          return {} as any;
        }),
      } as any;

      const res = await tableService.updateMemberRole('tbl-1', 'p2', 'player', mockClient);
      expect(res.success).toBe(false);
      expect(res.message).toContain('Limite de 1 jogadores atingido');
    });
  });

  describe('kickTableMember', () => {
    it('should delete member entry from database', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        eq2: vi.fn().mockImplementation(function (this: any, key: string, val: string) {
          return this;
        }),
      } as any;

      // Mock chain behavior for two .eq calls
      mockClient.eq = vi.fn().mockReturnValue(mockClient);

      const res = await tableService.kickTableMember('tbl-123', 'p2', mockClient);
      expect(mockClient.from).toHaveBeenCalledWith('table_players');
      expect(res).toBe(true);
    });
  });

  describe('fetchTableCharacters', () => {
    it('should fetch all characters linked to the table', async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;

      const res = await tableService.fetchTableCharacters('tbl-123', mockClient);
      expect(mockClient.from).toHaveBeenCalledWith('characters');
      expect(res).toEqual([]);
    });
  });

  describe('distributeExperience', () => {
    it('should call distribute_xp_to_characters RPC successfully', async () => {
      const mockClient = {
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any;

      const res = await tableService.distributeExperience(['char-1'], 100, mockClient);
      expect(mockClient.rpc).toHaveBeenCalledWith('distribute_xp_to_characters', {
        target_ids: ['char-1'],
        xp_amount: 100,
      });
      expect(res).toBe(true);
    });

    it('should return false if xpAmount is invalid or array is empty', async () => {
      const res1 = await tableService.distributeExperience([], 100);
      expect(res1).toBe(false);

      const res2 = await tableService.distributeExperience(['char-1'], 0);
      expect(res2).toBe(false);
    });
  });
});
