import { describe, it, expect, vi } from 'vitest';
import { loadGeneratorData, validateComponents, validateConnectors } from '../../js/utils/dataLoader.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('DataLoader', () => {
  describe('validateComponents', () => {
    it('should validate correct component structure', () => {
      const validComponents = [
        {
          root: 'mair',
          prefix_text: 'Mair',
          suffix_text: 'Mair',
          can_be_prefix: true,
          can_be_suffix: true,
          tags: ['high-elf']
        }
      ];

      expect(validateComponents(validComponents)).toBe(true);
    });

    it('should reject invalid component structure', () => {
      const invalidComponents = [
        {
          // Missing required fields
          prefix_text: 'Mair'
        }
      ];

      expect(validateComponents(invalidComponents)).toBe(false);
    });

    it('should handle empty array', () => {
      expect(validateComponents([])).toBe(false);
    });
  });

  describe('validateConnectors', () => {
    it('should validate correct connector structure', () => {
      const validConnectors = [
        {
          text: '-a-',
          phonetic: 'ah',
          function: 'Simple vowel bridge'
        }
      ];

      expect(validateConnectors(validConnectors)).toBe(true);
    });

    it('should reject invalid connector structure', () => {
      const invalidConnectors = [
        {
          // Missing required fields
          text: '-a-'
        }
      ];

      expect(validateConnectors(invalidConnectors)).toBe(false);
    });
  });

  describe('loadGeneratorData', () => {
    it('should load data successfully', async () => {
      // Mock fetch to work in Node.js environment
      global.fetch = vi.fn((url) => {
        let filePath;
        if (url.includes('components.json')) {
          filePath = join(__dirname, '../../data/components.json');
        } else if (url.includes('connectors.json')) {
          filePath = join(__dirname, '../../data/connectors.json');
        } else {
          return Promise.reject(new Error('Unknown file'));
        }
        
        try {
          const content = readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(data)
          });
        } catch (error) {
          return Promise.reject(error);
        }
      });

      const data = await loadGeneratorData();
      expect(data).toBeDefined();
      expect(data.components).toBeDefined();
      expect(data.connectors).toBeDefined();
      expect(Array.isArray(data.components)).toBe(true);
      expect(Array.isArray(data.connectors)).toBe(true);
    });
  });
});


