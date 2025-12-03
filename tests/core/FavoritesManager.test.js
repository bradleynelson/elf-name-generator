import { describe, it, expect, beforeEach } from 'vitest';
import { FavoritesManager } from '../../js/core/FavoritesManager.js';

describe('FavoritesManager', () => {
  let favoritesManager;

  beforeEach(() => {
    localStorage.clear();
    favoritesManager = new FavoritesManager();
  });

  describe('add', () => {
    it('should add a favorite name', () => {
      const nameData = {
        name: 'Maireel',
        meaning: 'Light + Star',
        pronunciation: 'Mair-eel',
        syllables: 2
      };

      const result = favoritesManager.add(nameData);
      
      expect(result.success).toBe(true);
      expect(favoritesManager.getAll()).toHaveLength(1);
      expect(favoritesManager.getAll()[0].name).toBe('Maireel');
    });

    it('should not add duplicate names', () => {
      const nameData = {
        name: 'Maireel',
        meaning: 'Light + Star',
        pronunciation: 'Mair-eel',
        syllables: 2
      };

      favoritesManager.add(nameData);
      const result = favoritesManager.add(nameData);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('already');
      expect(favoritesManager.getAll()).toHaveLength(1);
    });

    it('should return error for null/undefined data', () => {
      const result = favoritesManager.add(null);
      
      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });
  });

  describe('remove', () => {
    it('should remove a favorite by index', () => {
      const nameData = {
        name: 'Maireel',
        meaning: 'Light + Star',
        pronunciation: 'Mair-eel',
        syllables: 2
      };

      favoritesManager.add(nameData);
      expect(favoritesManager.getAll()).toHaveLength(1);
      
      const removed = favoritesManager.remove(0);
      
      expect(removed).toBe(true);
      expect(favoritesManager.getAll()).toHaveLength(0);
    });

    it('should return false for invalid index', () => {
      expect(favoritesManager.remove(0)).toBe(false);
      expect(favoritesManager.remove(-1)).toBe(false);
      expect(favoritesManager.remove(100)).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return empty array initially', () => {
      expect(favoritesManager.getAll()).toEqual([]);
    });

    it('should return all favorites', () => {
      favoritesManager.add({ name: 'Name1', meaning: 'Meaning1' });
      favoritesManager.add({ name: 'Name2', meaning: 'Meaning2' });
      
      const all = favoritesManager.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].name).toBe('Name1');
      expect(all[1].name).toBe('Name2');
    });
  });

  describe('onChange', () => {
    it('should call listener when favorites change', () => {
      let callbackCalled = false;
      let callbackData = null;

      favoritesManager.onChange((favorites) => {
        callbackCalled = true;
        callbackData = favorites;
      });

      favoritesManager.add({ name: 'Test', meaning: 'Test' });
      
      expect(callbackCalled).toBe(true);
      expect(callbackData).toHaveLength(1);
    });
  });
});


