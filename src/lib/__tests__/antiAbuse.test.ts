import { describe, it, expect } from 'vitest';
import { calculateLobbyCooldown, sendDirectMessageSchema } from '../validations/social';
import { createTableSchema, updateTableSettingsSchema } from '../validations/table';

describe('Anti-Abuse & Input Limits Validation Suite', () => {
  describe('Lobby Chat Cooldown Calculation', () => {
    it('should return minimum cooldown (5s) for empty or short messages', () => {
      expect(calculateLobbyCooldown(0)).toBe(5);
      expect(calculateLobbyCooldown(10)).toBe(5);
      expect(calculateLobbyCooldown(24)).toBe(5);
    });

    it('should scale cooldown proportionally based on text length', () => {
      // 5 + floor(50 / 25) = 7 seconds
      expect(calculateLobbyCooldown(50)).toBe(7);
      // 5 + floor(250 / 25) = 15 seconds
      expect(calculateLobbyCooldown(250)).toBe(15);
    });

    it('should cap the maximum cooldown at 30s for extremely long text', () => {
      // 5 + floor(1000 / 25) = 45 -> should cap at 30
      expect(calculateLobbyCooldown(1000)).toBe(30);
      expect(calculateLobbyCooldown(5000)).toBe(30);
    });
  });

  describe('Direct Messages Payload Size Limit', () => {
    it('should reject direct messages exceeding 1000 characters', () => {
      const longMessage = {
        receiverId: '00000000-0000-0000-0000-000000000000',
        content: 'a'.repeat(1001)
      };

      const result = sendDirectMessageSchema.safeParse(longMessage);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('limite de 1000 caracteres');
    });

    it('should accept direct messages under or exactly 1000 characters', () => {
      const validMessage = {
        receiverId: '00000000-0000-0000-0000-000000000000',
        content: 'a'.repeat(1000)
      };

      const result = sendDirectMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });
  });

  describe('Table Description Size Limit', () => {
    it('should reject table descriptions exceeding 500 characters', () => {
      const tableWithLongDesc = {
        name: 'Mesa do Mal',
        description: 'a'.repeat(501),
        master_id: '00000000-0000-0000-0000-000000000000',
        max_players: 5
      };

      const result = createTableSchema.safeParse(tableWithLongDesc);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('no máximo 500 caracteres');
    });

    it('should accept table descriptions under or exactly 500 characters', () => {
      const tableWithValidDesc = {
        name: 'Mesa Válida',
        description: 'a'.repeat(500),
        master_id: '00000000-0000-0000-0000-000000000000',
        max_players: 5
      };

      const result = createTableSchema.safeParse(tableWithValidDesc);
      expect(result.success).toBe(true);
    });
  });
});
