import { describe, it, expect } from 'vitest';
import * as socialService from '../socialService';
import { 
  sendFriendRequestSchema, 
  respondFriendRequestSchema, 
  sendDirectMessageSchema,
  calculateLobbyCooldown
} from '../../lib/validations/social';

describe('Social Service & Validation Suite', () => {
  describe('socialService API Contracts', () => {
    it('should export all required social CRUD service methods', () => {
      expect(typeof socialService.fetchUserFriends).toBe('function');
      expect(typeof socialService.searchUserProfile).toBe('function');
      expect(typeof socialService.sendFriendRequest).toBe('function');
      expect(typeof socialService.updateFriendshipStatus).toBe('function');
      expect(typeof socialService.deleteFriendship).toBe('function');
      expect(typeof socialService.fetchDirectMessages).toBe('function');
      expect(typeof socialService.sendDirectMessage).toBe('function');
    });

    it('should handle empty queries gracefully', async () => {
      const emptyResult = await socialService.searchUserProfile('');
      expect(emptyResult).toBeNull();
    });
  });

  describe('Zod Validation Schemas', () => {
    it('should validate sendFriendRequestSchema correctly', () => {
      const valid = sendFriendRequestSchema.safeParse({ targetInput: 'Aventureiro123' });
      expect(valid.success).toBe(true);

      const invalidShort = sendFriendRequestSchema.safeParse({ targetInput: 'ab' });
      expect(invalidShort.success).toBe(false);
    });

    it('should validate respondFriendRequestSchema correctly', () => {
      const validAccept = respondFriendRequestSchema.safeParse({
        friendshipId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'accept'
      });
      expect(validAccept.success).toBe(true);

      const invalidAction = respondFriendRequestSchema.safeParse({
        friendshipId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'invalid_action'
      });
      expect(invalidAction.success).toBe(false);
    });

    it('should validate sendDirectMessageSchema correctly', () => {
      const validMsg = sendDirectMessageSchema.safeParse({
        receiverId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Olá! Quer jogar RPG hoje?'
      });
      expect(validMsg.success).toBe(true);

      const emptyMsg = sendDirectMessageSchema.safeParse({
        receiverId: '123e4567-e89b-12d3-a456-426614174000',
        content: ''
      });
      expect(emptyMsg.success).toBe(false);
    });

    it('should calculate proportional lobby cooldown correctly', () => {
      expect(calculateLobbyCooldown(10)).toBe(5); // Minimum 5s
      expect(calculateLobbyCooldown(100)).toBe(9); // 5 + 100/25 = 9s
      expect(calculateLobbyCooldown(500)).toBe(25); // 5 + 500/25 = 25s
      expect(calculateLobbyCooldown(1000)).toBe(30); // Max cap 30s
    });
  });
});
