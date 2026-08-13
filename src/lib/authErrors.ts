export function translateAuthError(error: unknown): string {
  if (!error) return 'Ocorreu um erro inesperado.';

  let message = '';
  if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    message = (error as { message: string }).message;
  } else {
    message = String(error);
  }

  const cleanMessage = message.toLowerCase().trim();

  if (cleanMessage.includes('user already registered')) {
    return 'Este e-mail já está cadastrado no sistema.';
  }
  if (cleanMessage.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (cleanMessage.includes('password should be at least 6 characters')) {
    return 'A senha deve conter no mínimo 6 caracteres.';
  }
  if (cleanMessage.includes('unable to validate email address: invalid format') || cleanMessage.includes('email address is invalid')) {
    return 'O endereço de e-mail fornecido é inválido.';
  }
  if (cleanMessage.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada.';
  }
  if (cleanMessage.includes('rate limit exceeded') || cleanMessage.includes('too many requests')) {
    return 'Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.';
  }
  if (cleanMessage.includes('user not found')) {
    return 'Usuário não cadastrado.';
  }

  // Retorna mensagens nativas conhecidas ou fallback
  return message || 'Erro ao processar autenticação.';
}
