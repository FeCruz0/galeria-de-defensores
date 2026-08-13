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
