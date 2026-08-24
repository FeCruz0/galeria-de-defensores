import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as characterService from '../characterService';
import { Character } from '../../types/game';

describe('characterService API Tests', () => {
  const mockCharacter: Character = {
    id: 'char-123',
    user_id: 'user-456',
    name: 'Guerreiro E2E',
    concept: 'Defensor Clássico',
    points_total: 10,
    attributes_values: { F: 2, H: 2, R: 2, A: 2, PdF: 0 },
    resources_current: { PV: 10, PM: 10 },
    resources_max: { PV: 10, PM: 10 },
    advantages: [],
    disadvantages: [],
    spells: [],
    inventory: [],
    history: 'Uma lenda dos testes automatizados.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should fetch character by ID successfully', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockCharacter, error: null }),
    } as any;

    const result = await characterService.fetchCharacterById('char-123', mockClient);
    expect(mockClient.from).toHaveBeenCalledWith('characters');
    expect(result).toEqual(mockCharacter);
  });

  it('should return null when fetch character by ID fails', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
    } as any;

    const result = await characterService.fetchCharacterById('char-123', mockClient);
    expect(result).toBeNull();
  });

  it('should fetch user characters successfully', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockCharacter], error: null }),
    } as any;

    const result = await characterService.fetchUserCharacters('user-456', mockClient);
    expect(mockClient.from).toHaveBeenCalledWith('characters');
    expect(result).toEqual([mockCharacter]);
  });

  it('should return empty list when fetch user characters fails', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('Query failed') }),
    } as any;

    const result = await characterService.fetchUserCharacters('user-456', mockClient);
    expect(result).toEqual([]);
  });

  it('should create character successfully', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockCharacter, error: null }),
    } as any;

    const newCharData = { name: 'Guerreiro E2E', user_id: 'user-456' };
    const result = await characterService.createCharacter(newCharData, mockClient);
    expect(mockClient.from).toHaveBeenCalledWith('characters');
    expect(mockClient.insert).toHaveBeenCalledWith([newCharData]);
    expect(result).toEqual(mockCharacter);
  });

  it('should update character successfully', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...mockCharacter, name: 'Guerreiro Atualizado' }, error: null }),
    } as any;

    const result = await characterService.updateCharacter('char-123', { name: 'Guerreiro Atualizado' }, mockClient);
    expect(mockClient.from).toHaveBeenCalledWith('characters');
    expect(result?.name).toBe('Guerreiro Atualizado');
  });

  it('should delete character successfully', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    } as any;

    const result = await characterService.deleteCharacter('char-123', mockClient);
    expect(mockClient.from).toHaveBeenCalledWith('characters');
    expect(result).toBe(true);
  });

  it('should return false when delete character fails', async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
    } as any;

    const result = await characterService.deleteCharacter('char-123', mockClient);
    expect(result).toBe(false);
  });
});
