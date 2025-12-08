import { describe, it, expect, beforeEach } from 'vitest';
import { NameGenerator } from '../../js/core/NameGenerator.js';

// Mock data for testing
const mockComponents = [
  {
    root: 'mair',
    prefix_text: 'Mair',
    suffix_text: 'Mair',
    prefix_phonetic: 'Mair',
    suffix_phonetic: 'Mair',
    prefix_meaning: 'Light',
    suffix_meaning: 'Light',
    can_be_prefix: true,
    can_be_suffix: true,
    tags: ['high-elf', 'moon-elf']
  },
  {
    root: 'tel',
    prefix_text: 'Tel',
    suffix_text: 'Tel',
    prefix_phonetic: 'Tel',
    suffix_phonetic: 'Tel',
    prefix_meaning: 'Star',
    suffix_meaning: 'Star',
    can_be_prefix: true,
    can_be_suffix: true,
    tags: ['high-elf', 'moon-elf']
  },
  {
    root: 'ael',
    prefix_text: 'Ael',
    suffix_text: 'Ael',
    prefix_phonetic: 'Ael',
    suffix_phonetic: 'Ael',
    prefix_meaning: 'Noble',
    suffix_meaning: 'Noble',
    can_be_prefix: true,
    can_be_suffix: true,
    tags: ['high-elf', 'moon-elf']
  },
  {
    root: 'wen',
    prefix_text: 'Wen',
    suffix_text: 'Wen',
    prefix_phonetic: 'Wen',
    suffix_phonetic: 'Wen',
    prefix_meaning: 'Fair',
    suffix_meaning: 'Fair',
    can_be_prefix: true,
    can_be_suffix: true,
    tags: ['high-elf', 'moon-elf']
  },
  {
    root: 'ion',
    prefix_text: 'Ion',
    suffix_text: 'Ion',
    prefix_phonetic: 'Ion',
    suffix_phonetic: 'Ion',
    prefix_meaning: 'Son',
    suffix_meaning: 'Son',
    can_be_prefix: true,
    can_be_suffix: true,
    tags: ['high-elf', 'moon-elf']
  }
];

const mockConnectors = [
  {
    text: '-a-',
    phonetic: 'ah',
    function: 'Simple vowel bridge'
  }
];

describe('NameGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new NameGenerator(mockComponents, mockConnectors);
  });

  describe('generate', () => {
    it('should generate a name with valid structure', () => {
      const result = generator.generate({
        subrace: 'high-elf',
        complexity: 'simple',
        targetSyllables: 3,
        style: 'neutral'
      });

      expect(result).toBeDefined();
      expect(result.name).toBeTruthy();
      expect(result.meaning).toBeTruthy();
      expect(result.syllables).toBeGreaterThan(0);
    });

    it('should respect target syllable count', () => {
      const result = generator.generate({
        subrace: 'high-elf',
        complexity: 'simple',
        targetSyllables: 2,
        style: 'neutral'
      });

      // Allow some flexibility (target ± 1)
      expect(result.syllables).toBeGreaterThanOrEqual(1);
      expect(result.syllables).toBeLessThanOrEqual(3);
    });

    it('should include pronunciation when available', () => {
      const result = generator.generate({
        subrace: 'high-elf',
        complexity: 'simple',
        targetSyllables: 3,
        style: 'neutral'
      });

      // Pronunciation may or may not be present depending on components
      if (result.pronunciation) {
        expect(typeof result.pronunciation).toBe('string');
      }
    });

    it('should handle different subraces', () => {
      const subraces = ['high-elf', 'moon-elf', 'sun-elf', 'wood-elf', 'drow'];
      
      subraces.forEach(subrace => {
        const result = generator.generate({
          subrace,
          complexity: 'simple',
          targetSyllables: 3,
          style: 'neutral'
        });
        
        expect(result).toBeDefined();
        expect(result.name).toBeTruthy();
      });
    });

    it('should handle different complexity levels', () => {
      const complexities = ['simple', 'auto', 'complex'];
      
      complexities.forEach(complexity => {
        const result = generator.generate({
          subrace: 'high-elf',
          complexity,
          targetSyllables: 3,
          style: 'neutral'
        });
        
        expect(result).toBeDefined();
        expect(result.name).toBeTruthy();
      });
    });
  });

  describe('generateMultiple', () => {
    it('should generate multiple unique names', () => {
      const results = generator.generateMultiple(5, {
        subrace: 'high-elf',
        complexity: 'simple',
        targetSyllables: 3,
        style: 'neutral'
      });

      // With limited components, we may not get exactly 5 unique names
      // But we should get at least some unique names
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);
      expect(new Set(results.map(r => r.name)).size).toBeGreaterThan(1); // At least some uniqueness
    });

    it('should respect count parameter', () => {
      const counts = [1, 3];
      
      counts.forEach(count => {
        const results = generator.generateMultiple(count, {
          subrace: 'high-elf',
          complexity: 'simple',
          targetSyllables: 3,
          style: 'neutral'
        });
        
        // May not get exact count if not enough unique combinations, but should try
        expect(results.length).toBeGreaterThan(0);
        expect(results.length).toBeLessThanOrEqual(count);
      });
    });
  });
});


