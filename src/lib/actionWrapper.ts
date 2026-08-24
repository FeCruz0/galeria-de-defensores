import { z } from 'zod';
import { createClient } from '../utils/supabase/server';
import { checkActionRateLimit } from './rateLimit';

/**
 * Wraps a Server Action with try-catch block to intercept unhandled exceptions
 * and return a unified error contract instead of throwing raw stack traces.
 */
export async function safeAction<T>(
  actionFn: () => Promise<T>
): Promise<T | { success: false; error: string }> {
  try {
    return await actionFn();
  } catch (err) {
    console.error('Unhandled Server Action Exception:', err);
    return {
      success: false,
      error: 'Ocorreu um erro interno no servidor. Por favor, tente novamente.'
    };
  }
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export function createSafeAction<TSchema extends z.ZodTypeAny, TResult>(
  schema: TSchema,
  handler: (parsedData: z.infer<TSchema>, ctx: { user: any; supabase: any }) => Promise<ActionResponse<TResult> | TResult>,
  options?: { requireAuth?: boolean; rateLimitKey?: string; rateLimitMax?: number }
) {
  return async (rawInput: unknown): Promise<ActionResponse<TResult>> => {
    try {
      const requireAuth = options?.requireAuth ?? true;
      const supabase = await createClient();
      let user = null;

      if (requireAuth) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          return { success: false, error: 'Usuário não autenticado.' };
        }
        user = authUser;

        if (options?.rateLimitKey) {
          const maxReqs = options.rateLimitMax ?? 10;
          const allowed = await checkActionRateLimit(user.id, options.rateLimitKey, maxReqs, 60000);
          if (!allowed) {
            return { success: false, error: 'Muitas requisições em pouco tempo. Por favor, aguarde alguns instantes.' };
          }
        }
      }

      const parsed = schema.safeParse(rawInput);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
        return { success: false, error: errorMsg, fieldErrors: fieldErrors as Record<string, string[]> };
      }

      const result = await handler(parsed.data, { user, supabase });
      if (result && typeof result === 'object' && 'success' in result) {
        return result as ActionResponse<TResult>;
      }
      return { success: true, data: result as TResult };
    } catch (err: any) {
      console.error('Unhandled SafeAction Exception:', err);
      return { success: false, error: err?.message || 'Ocorreu um erro interno no servidor.' };
    }
  };
}
