import { describe, it, expect } from 'vitest';
import { registerSchema } from '../validations/auth';

describe('Live Validation & Exception Feedback Suite', () => {
  describe('Username Real-time Checks', () => {
    it('should pass for valid alphanumeric usernames between 3 and 30 characters', () => {
      const result = registerSchema.shape.username.safeParse('valid_user-123');
      expect(result.success).toBe(true);
    });

    it('should reject usernames shorter than 3 characters', () => {
      const result = registerSchema.shape.username.safeParse('ab');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('pelo menos 3 caracteres');
    });

    it('should reject usernames longer than 30 characters', () => {
      const result = registerSchema.shape.username.safeParse('a'.repeat(31));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('no máximo 30 caracteres');
    });

    it('should reject usernames with special characters or spaces', () => {
      const result = registerSchema.shape.username.safeParse('user name');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('apenas letras, números');
    });
  });

  describe('Email Real-time Checks', () => {
    it('should pass for valid RFC email addresses', () => {
      const result = registerSchema.shape.email.safeParse('player@defensores.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email formats immediately', () => {
      const result = registerSchema.shape.email.safeParse('invalid-email@');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('e-mail inválido');
    });
  });

  describe('Password Strength Real-time Checks', () => {
    it('should pass for valid passwords containing letters, numbers, and symbols', () => {
      const result = registerSchema.shape.password.safeParse('securePass123!');
      expect(result.success).toBe(true);
    });

    it('should reject passwords shorter than 6 characters', () => {
      const result = registerSchema.shape.password.safeParse('12345');
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('pelo menos 6 caracteres');
    });
  });
});
