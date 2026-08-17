import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Validação de Migrações SQL (supabase/migrations)', () => {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

  it('deve possuir o diretório supabase/migrations com arquivos .sql', () => {
    expect(fs.existsSync(migrationsDir)).toBe(true);
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);
  });

  it('deve seguir o padrão numérico de nomenclatura (YYYYMMDDHHMMSS_nome.sql)', () => {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    const pattern = /^\d{14}_.+\.sql$/;

    files.forEach(file => {
      expect(file).toMatch(pattern);
    });
  });

  it('deve ser possível ler o conteúdo de todos os arquivos de migração', () => {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

    files.forEach(file => {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      expect(content.trim().length).toBeGreaterThan(0);
      expect(typeof content).toBe('string');
    });
  });
});
