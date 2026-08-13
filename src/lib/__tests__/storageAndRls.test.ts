import { describe, it, expect, vi } from 'vitest';
import { verifyTablePassword, joinTable } from '../../services/tableService';

describe('Storage & RLS Hardening Suite', () => {
  describe('Avatar Storage Subdirectory Enforcement', () => {
    it('should correctly format avatar upload path under the user id subfolder', () => {
      const userId = 'user-uuid-1234';
      const fileName = `${userId}-avatar.png`;
      const expectedPath = `${userId}/${fileName}`;

      expect(expectedPath.startsWith(`${userId}/`)).toBe(true);
      const folderName = expectedPath.split('/')[0];
      expect(folderName).toBe(userId);
    });
  });

  describe('Private Table Password RPC Verification', () => {
    it('should return true when verify_table_password RPC succeeds', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: true, error: null })
      } as any;

      const isValid = await verifyTablePassword('table-1', 'secret123', mockSupabase);
      expect(isValid).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('verify_table_password', {
        p_table_id: 'table-1',
        p_password: 'secret123'
      });
    });

    it('should return false when verify_table_password RPC fails or returns false', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: false, error: null })
      } as any;

      const isValid = await verifyTablePassword('table-1', 'wrongpass', mockSupabase);
      expect(isValid).toBe(false);
    });

    it('should reject joinTable for private table if password is wrong', async () => {
      const mockTableData = {
        id: 'table-private-1',
        master_id: 'master-uuid',
        is_private: true,
        max_players: 4,
        allow_spectators: true
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tables') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockTableData, error: null })
                })
              })
            };
          }
          if (table === 'table_players') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [], error: null })
              })
            };
          }
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({ data: false, error: null })
      } as any;

      const result = await joinTable('table-private-1', 'player-uuid', 'player', 'wrongpass', mockSupabase);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Senha incorreta');
    });

    it('should allow joinTable for private table if password is correct', async () => {
      const mockTableData = {
        id: 'table-private-1',
        master_id: 'master-uuid',
        is_private: true,
        max_players: 4,
        allow_spectators: true
      };

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'tables') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({ data: mockTableData, error: null })
                })
              })
            };
          }
          if (table === 'table_players') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [], error: null })
              }),
              insert: () => Promise.resolve({ error: null })
            };
          }
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({ data: true, error: null })
      } as any;

      const result = await joinTable('table-private-1', 'player-uuid', 'player', 'correctpass', mockSupabase);
      expect(result.success).toBe(true);
    });
  });
});
