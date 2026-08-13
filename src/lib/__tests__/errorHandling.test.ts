import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeAction } from '../actionWrapper';

describe('Server Action Error Handler Wrapper', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should pass through successful execution and return results', async () => {
    const action = async () => {
      return { success: true, payload: 'data_ok' };
    };

    const result = await safeAction(action);
    expect(result).toEqual({ success: true, payload: 'data_ok' });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should catch unhandled exceptions and return structured error response', async () => {
    const action = async () => {
      throw new Error('Database connection failed');
    };

    const result = await safeAction(action);
    expect(result).toEqual({
      success: false,
      error: 'Ocorreu um erro interno no servidor. Por favor, tente novamente.'
    });
    expect(consoleSpy).toHaveBeenCalled();
  });
});
