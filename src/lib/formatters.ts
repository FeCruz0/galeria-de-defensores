/**
 * Formata uma data no padrão brasileiro (DD/MM/AAAA) de maneira determinística,
 * prevenindo incompatibilidades de hidratação (SSR Hydration Mismatch) no React.
 */
export function formatDate(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata um horário no padrão 24 horas (HH:MM) de maneira determinística,
 * prevenindo incompatibilidades de hidratação (SSR Hydration Mismatch) no React.
 */
export function formatTime(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
