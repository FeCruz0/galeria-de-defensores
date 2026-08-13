import { describe, it, expect } from 'vitest';
import { registerSchema } from '../validations/auth';
import { translateAuthError } from '../authErrors';

describe('Auth Validation & Error Translation Suite', () => {
  describe('Zod Register Schema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        username: 'defensor_123',
        email: 'defensor@galeria.com',
        password: 'supersecretpassword123!'
      };
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject usernames that are too short or too long', () => {
      const tooShort = registerSchema.safeParse({
        username: 'ab',
        email: 'test@galeria.com',
        password: 'securepass123!'
      });
      expect(tooShort.success).toBe(false);

      const tooLong = registerSchema.safeParse({
        username: 'a'.repeat(31),
        email: 'test@galeria.com',
        password: 'securepass123!'
      });
      expect(tooLong.success).toBe(false);
    });

    it('should reject usernames containing special characters or spaces', () => {
      const invalidUsername = registerSchema.safeParse({
        username: 'defensor 123',
        email: 'test@galeria.com',
        password: 'securepass123!'
      });
      expect(invalidUsername.success).toBe(false);

      const invalidChars = registerSchema.safeParse({
        username: 'defensor@123',
        email: 'test@galeria.com',
        password: 'securepass123!'
      });
      expect(invalidChars.success).toBe(false);
    });

    it('should reject invalid email formats', () => {
      const invalidEmail = registerSchema.safeParse({
        username: 'defensor',
        email: 'not-an-email',
        password: 'securepass123!'
      });
      expect(invalidEmail.success).toBe(false);
    });

    it('should reject passwords shorter than 6 characters', () => {
      const shortPass = registerSchema.safeParse({
        username: 'defensor',
        email: 'test@galeria.com',
        password: '12345'
      });
      expect(shortPass.success).toBe(false);
    });

    it('should reject passwords missing letters, numbers, or symbols', () => {
      const missingLetters = registerSchema.safeParse({
        username: 'defensor',
        email: 'test@galeria.com',
        password: '123456!'
      });
      expect(missingLetters.success).toBe(false);
      expect(missingLetters.error?.issues[0]?.message).toContain('pelo menos uma letra');

      const missingNumbers = registerSchema.safeParse({
        username: 'defensor',
        email: 'test@galeria.com',
        password: 'password!'
      });
      expect(missingNumbers.success).toBe(false);
      expect(missingNumbers.error?.issues[0]?.message).toContain('pelo menos um número');

      const missingSymbols = registerSchema.safeParse({
        username: 'defensor',
        email: 'test@galeria.com',
        password: 'password123'
      });
      expect(missingSymbols.success).toBe(false);
      expect(missingSymbols.error?.issues[0]?.message).toContain('caractere especial ou símbolo');
    });
  });

  describe('Auth Error Translation', () => {
    it('should translate common Supabase auth errors', () => {
      expect(translateAuthError('User already registered')).toBe('Este e-mail já está cadastrado no sistema.');
      expect(translateAuthError('Invalid login credentials')).toBe('E-mail ou senha incorretos.');
      expect(translateAuthError('Password should be at least 6 characters')).toBe('A senha deve conter no mínimo 6 caracteres.');
      expect(translateAuthError('Unable to validate email address: invalid format')).toBe('O endereço de e-mail fornecido é inválido.');
      expect(translateAuthError('Email not confirmed')).toBe('Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada.');
      expect(translateAuthError('Rate limit exceeded')).toBe('Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.');
    });

    it('should handle raw error objects', () => {
      const errorObj = { message: 'Invalid login credentials' };
      expect(translateAuthError(errorObj)).toBe('E-mail ou senha incorretos.');
    });

    it('should fallback to original message if translation is not found', () => {
      expect(translateAuthError('Some random backend database exception')).toBe('Some random backend database exception');
    });

    it('should fallback to generic error message if error is empty or undefined', () => {
      expect(translateAuthError(null)).toBe('Ocorreu um erro inesperado.');
      expect(translateAuthError(undefined)).toBe('Ocorreu um erro inesperado.');
    });
  });
});
