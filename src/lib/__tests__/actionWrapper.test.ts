import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { createSafeAction } from '../actionWrapper';

let mockUser: any = null;
let mockRateLimitResult = true;

vi.mock('../../utils/supabase/server', () => {
  return {
    createClient: () => {
      return {
        auth: {
          getUser: async () => ({ data: { user: mockUser } })
        }
      };
    }
  };
});

vi.mock('../rateLimit', () => {
  return {
    checkActionRateLimit: async () => mockRateLimitResult
  };
});

describe('createSafeAction wrapper', () => {
  const testSchema = z.object({
    name: z.string().min(3, 'Nome muito curto'),
    age: z.number().optional()
  });

  beforeEach(() => {
    mockUser = { id: 'test-user-123' };
    mockRateLimitResult = true;
  });

  it('should run handler when input is valid and user is authenticated', async () => {
    const action = createSafeAction(testSchema, async (data) => {
      return { success: true, greeting: `Hello ${data.name}` };
    });

    const result = await action({ name: 'Felipe' });
    expect(result.success).toBe(true);
    expect((result as any).greeting).toBe('Hello Felipe');
  });

  it('should return Zod validation errors on invalid input', async () => {
    const action = createSafeAction(testSchema, async () => {
      return { success: true };
    });

    const result = await action({ name: 'ab' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Nome muito curto');
    expect(result.fieldErrors?.name).toContain('Nome muito curto');
  });

  it('should enforce authentication when requireAuth is true', async () => {
    mockUser = null;
    const action = createSafeAction(testSchema, async () => {
      return { success: true };
    }, { requireAuth: true });

    const result = await action({ name: 'Felipe' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Usuário não autenticado.');
  });

  it('should bypass authentication when requireAuth is false', async () => {
    mockUser = null;
    const action = createSafeAction(testSchema, async () => {
      return { success: true, bypassed: true };
    }, { requireAuth: false });

    const result = await action({ name: 'Felipe' });
    expect(result.success).toBe(true);
    expect((result as any).bypassed).toBe(true);
  });

  it('should trigger rate limit when allowed limit is exceeded', async () => {
    mockRateLimitResult = false;
    const action = createSafeAction(testSchema, async () => {
      return { success: true };
    }, { requireAuth: true, rateLimitKey: 'test-key', rateLimitMax: 5 });

    const result = await action({ name: 'Felipe' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Muitas requisições');
  });

  it('should catch unhandled exceptions inside the handler', async () => {
    const action = createSafeAction(testSchema, async () => {
      throw new Error('Something went wrong');
    });

    const result = await action({ name: 'Felipe' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Something went wrong');
  });
});
