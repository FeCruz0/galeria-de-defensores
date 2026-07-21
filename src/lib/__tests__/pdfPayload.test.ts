import { describe, it, expect } from 'vitest';
import { exportCharacterToPdf, exportRuleSystemToPdf, importFromPdf } from '../pdfPayload';
import { Character, RuleSystem } from '@/types/game';

describe('PDF Payload Export & Import', () => {
  const mockCharacter: Character = {
    id: 'char-123',
    user_id: 'user-1',
    name: 'Defender Knight',
    scale: 0,
    points_total: 10,
    points_spent: 8,
    concept: 'Paladin of Light',
    attributes_values: { F: 2, H: 3, R: 2, A: 1, PdF: 0 },
    resources_current: { PV: 10, PM: 10 },
    advantages: [{ id: 'adv-1', name: 'Paladino', description: 'Deus protege', cost: '1' }],
    disadvantages: [{ id: 'dis-1', name: 'Código de Honra', description: 'Leal', cost: '-1' }],
    skills: [],
    specializations: [],
    spells: [],
    inventory: [{ id: 'inv-1', name: 'Espada Longa', description: 'Aço', quantity: 1, is_equipped: true }],
    custom_rolls: [],
    damage_type_forca: 'Corte',
    damage_type_pdf: 'Perfuração',
    saved_points: 2,
    experience: 5,
    status_effects: [],
    annotations: 'Test notes',
    is_hidden: false,
    image_url: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockRuleSystem: RuleSystem = {
    id: 'system-456',
    user_id: 'user-1',
    name: '3D&T Alpha Custom',
    description: 'Sistema clássico expandido',
    is_active: true,
    attributes: { F: { label: 'Força' }, H: { label: 'Habilidade' } },
    resources: { PV: { label: 'Pontos de Vida' }, PM: { label: 'Pontos de Magia' } },
    created_at: new Date().toISOString(),
  };

  it('should export and re-import a character from a PDF', async () => {
    const pdfBytes = await exportCharacterToPdf(mockCharacter);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);

    const extracted = await importFromPdf(pdfBytes);
    expect(extracted.type).toBe('character');
    expect(extracted.data.name).toBe('Defender Knight');
    expect(extracted.data.attributes_values).toEqual({ F: 2, H: 3, R: 2, A: 1, PdF: 0 });
    expect(extracted.data.advantages[0].name).toBe('Paladino');
  });

  it('should export and re-import a rule system from a PDF', async () => {
    const pdfBytes = await exportRuleSystemToPdf(mockRuleSystem);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);

    const extracted = await importFromPdf(pdfBytes);
    expect(extracted.type).toBe('rule_system');
    expect(extracted.data.name).toBe('3D&T Alpha Custom');
    expect(extracted.data.attributes).toHaveProperty('F');
  });
});
