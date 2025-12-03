import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIController } from '../../js/ui/UIController.js';

// Setup DOM for testing
beforeEach(() => {
  document.body.innerHTML = `
    <div id="result"></div>
    <div id="generatedName"></div>
    <div id="namePronunciation"></div>
    <div id="nameMeaning"></div>
    <div id="breakdown"></div>
    <select id="subrace"></select>
    <select id="complexity"></select>
    <input id="syllables" type="range" value="3">
    <select id="style"></select>
    <div id="vowelSuggestionsContainer"></div>
    <div id="vowelOptions"></div>
    <div id="favoritesList"></div>
    <button id="speakerBtn"></button>
    <div id="speakerContainer"></div>
  `;
});

describe('UIController', () => {
  let uiController;

  beforeEach(() => {
    uiController = new UIController();
  });

  describe('displayName', () => {
    it('should display name data correctly', () => {
      const nameData = {
        name: 'Maireel',
        meaning: 'Light + Star',
        pronunciation: 'Mair-eel',
        syllables: 2,
        prefix: {
          root: 'mair',
          prefix_text: 'Mair',
          prefix_phonetic: 'Mair',
          prefix_meaning: 'Light'
        },
        suffix: {
          root: 'tel',
          suffix_text: 'Tel',
          suffix_phonetic: 'Tel',
          suffix_meaning: 'Star'
        }
      };

      uiController.displayName(nameData);

      expect(uiController.elements.generatedName.textContent).toBe('Maireel');
      expect(uiController.elements.namePronunciation.textContent).toBe('Mair-eel');
    });

    it('should handle names without pronunciation', () => {
      const nameData = {
        name: 'Test',
        meaning: 'Test',
        syllables: 1,
        prefix: {
          root: 'test',
          prefix_text: 'Test',
          prefix_phonetic: 'Test',
          prefix_meaning: 'Test'
        },
        suffix: {
          root: 'test',
          suffix_text: 'Test',
          suffix_phonetic: 'Test',
          suffix_meaning: 'Test'
        }
      };

      uiController.displayName(nameData);

      expect(uiController.elements.generatedName.textContent).toBe('Test');
      expect(uiController.elements.namePronunciation.classList.contains('hidden')).toBe(true);
    });
  });

  describe('getPreferences', () => {
    it('should return current user preferences', () => {
      const prefs = uiController.getPreferences();

      expect(prefs).toHaveProperty('subrace');
      expect(prefs).toHaveProperty('complexity');
      expect(prefs).toHaveProperty('targetSyllables');
      expect(prefs).toHaveProperty('style');
    });
  });

  describe('showNotification', () => {
    it('should create and display a toast notification', () => {
      const initialToastCount = document.querySelectorAll('.toast-notification').length;
      
      uiController.showNotification('Test message', 'info');
      
      const toasts = document.querySelectorAll('.toast-notification');
      expect(toasts.length).toBe(initialToastCount + 1);
      expect(toasts[toasts.length - 1].textContent).toBe('Test message');
    });

    it('should apply correct type class', () => {
      uiController.showNotification('Error message', 'error');
      
      const toast = document.querySelector('.toast-notification.error');
      expect(toast).toBeTruthy();
    });
  });
});


