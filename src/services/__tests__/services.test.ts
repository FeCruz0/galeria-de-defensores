import { describe, it, expect } from 'vitest';
import * as characterService from '../characterService';
import * as tableService from '../tableService';
import * as systemService from '../systemService';

describe('Service Layer Abstraction Suite', () => {
  describe('characterService API', () => {
    it('should export all required character CRUD service methods', () => {
      expect(typeof characterService.fetchCharacterById).toBe('function');
      expect(typeof characterService.fetchUserCharacters).toBe('function');
      expect(typeof characterService.createCharacter).toBe('function');
      expect(typeof characterService.updateCharacter).toBe('function');
      expect(typeof characterService.deleteCharacter).toBe('function');
    });
  });

  describe('tableService API', () => {
    it('should export all required table VTT service methods', () => {
      expect(typeof tableService.fetchTableById).toBe('function');
      expect(typeof tableService.fetchUserTables).toBe('function');
      expect(typeof tableService.createTable).toBe('function');
      expect(typeof tableService.updateTable).toBe('function');
      expect(typeof tableService.fetchTableCharacters).toBe('function');
      expect(typeof tableService.distributeExperience).toBe('function');
    });

    it('should handle invalid arguments in distributeExperience gracefully', async () => {
      const result = await tableService.distributeExperience([], 10);
      expect(result).toBe(false);

      const invalidAmount = await tableService.distributeExperience(['char-1'], 0);
      expect(invalidAmount).toBe(false);
    });
  });

  describe('systemService API', () => {
    it('should export all required system Sandbox service methods', () => {
      expect(typeof systemService.fetchActiveSystems).toBe('function');
      expect(typeof systemService.fetchSystemById).toBe('function');
      expect(typeof systemService.createCustomSystem).toBe('function');
      expect(typeof systemService.updateCustomSystem).toBe('function');
      expect(typeof systemService.deleteCustomSystem).toBe('function');
    });
  });
});
