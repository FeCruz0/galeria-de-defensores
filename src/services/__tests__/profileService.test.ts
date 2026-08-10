import { describe, it, expect } from 'vitest';
import * as profileService from '../profileService';
import { updateProfileSchema } from '../../lib/validations/profile';

describe('Profile Service & Validation Suite', () => {
  describe('profileService API Contracts', () => {
    it('should export all required profile service methods', () => {
      expect(typeof profileService.fetchProfileById).toBe('function');
      expect(typeof profileService.updateProfile).toBe('function');
      expect(typeof profileService.uploadAvatar).toBe('function');
    });
  });

  describe('Zod Validation Schemas', () => {
    it('should validate updateProfileSchema with valid data', () => {
      const validData = {
        username: 'Jogador_Alpha',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        about: 'Mestre de RPG de mesa há mais de 10 anos.',
        cep: '01001-000',
        country: 'Brasil',
        state: 'SP',
        city: 'São Paulo'
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject usernames that are too short or too long', () => {
      const tooShort = updateProfileSchema.safeParse({ username: 'ab' });
      expect(tooShort.success).toBe(false);

      const tooLong = updateProfileSchema.safeParse({ username: 'a'.repeat(31) });
      expect(tooLong.success).toBe(false);
    });

    it('should reject usernames with special characters', () => {
      const invalidChars = updateProfileSchema.safeParse({ username: 'jogador@123' });
      expect(invalidChars.success).toBe(false);
    });

    it('should reject invalid avatar URLs', () => {
      const invalidUrl = updateProfileSchema.safeParse({
        username: 'Aventureiro',
        avatar_url: 'not-a-url'
      });
      expect(invalidUrl.success).toBe(false);
    });

    it('should reject about text that exceeds 500 characters', () => {
      const tooLongAbout = updateProfileSchema.safeParse({
        username: 'Aventureiro',
        about: 'a'.repeat(501)
      });
      expect(tooLongAbout.success).toBe(false);
    });
  });
});
