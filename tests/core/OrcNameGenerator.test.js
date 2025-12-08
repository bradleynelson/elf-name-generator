import { describe, it, expect, beforeEach } from 'vitest';
import { OrcNameGenerator } from '../../js/core/OrcNameGenerator.js';

const personal = [
  { root: 'grom', text: 'Grom', meaning: 'thunder' },
  { root: 'vrash', text: 'Vrash', meaning: 'storm lash' }
];

const epithets = [
  { text: 'Skull-Taker', meaning: 'claims skulls' }
];

describe('OrcNameGenerator', () => {
  let gen;

  beforeEach(() => {
    gen = new OrcNameGenerator(personal, [], epithets);
  });

  it('generates full name with epithet by default', () => {
    const result = gen.generate({ nameType: 'full' });
    expect(result.name).toContain('the ');
    expect(result.breakdown.personal).toBeTruthy();
    expect(result.breakdown.epithet).toBeTruthy();
  });

  it('generates full name without epithet when requested', () => {
    const result = gen.generate({ nameType: 'full-no-epithet' });
    expect(result.name).not.toContain('"');
    expect(result.breakdown.personal).toBeTruthy();
  });

  it('generates personal-only', () => {
    const result = gen.generate({ nameType: 'personal' });
    expect(result.name.length).toBeGreaterThan(0);
    expect(result.breakdown.personal).toBeTruthy();
  });

  it('generates epithet-only', () => {
    const result = gen.generate({ nameType: 'epithet' });
    expect(result.name).toContain('the ');
    expect(result.breakdown.epithet).toBeTruthy();
  });
});
