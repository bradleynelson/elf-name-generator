import { describe, it, expect, beforeEach } from 'vitest';
import { GnomishNameGenerator } from '../../js/core/GnomishNameGenerator.js';

const personal = [
  { root: 'al', prefix_text: 'Al', prefix_meaning: 'High', can_be_prefix: true, can_be_suffix: false, gender: 'neutral', subrace: ['rock'], prefix_phonetic: 'Ahl' },
  { root: 'tik', suffix_text: 'tik', suffix_meaning: 'Quick', can_be_prefix: false, can_be_suffix: true, gender: 'neutral', subrace: ['rock'], suffix_phonetic: 'Tik' }
];

const clans = [
  { root: 'spark', prefix_text: 'Spark', prefix_meaning: 'Spark', can_be_prefix: true, can_be_suffix: false, subrace: ['rock'], phonetic: 'Spahrk' },
  { root: 'gem', suffix_text: 'gem', suffix_meaning: 'Gem', can_be_prefix: false, can_be_suffix: true, subrace: ['rock'], phonetic: 'Jem' }
];

const nicknames = [
  { text: 'Cogs', meaning: 'Inventor', phonetic: 'Kogs' }
];

describe('GnomishNameGenerator', () => {
  let gen;

  beforeEach(() => {
    gen = new GnomishNameGenerator(personal, clans, nicknames);
  });

  it('generates a full name with breakdown', () => {
    const result = gen.generate({ subrace: 'rock', nameType: 'full', gender: 'neutral' });
    expect(result.name).toMatch(/\s".*"\s/);
    expect(result.breakdown.personal).toBeTruthy();
    expect(result.breakdown.clan).toBeTruthy();
    expect(result.breakdown.nickname).toBeTruthy();
  });

  it('generates personal-only name', () => {
    const result = gen.generate({ nameType: 'personal', gender: 'neutral', subrace: 'rock' });
    expect(result.name.length).toBeGreaterThan(0);
    expect(result.meaning.length).toBeGreaterThan(0);
  });

  it('generates clan-only name', () => {
    const result = gen.generate({ nameType: 'clan', subrace: 'rock' });
    expect(result.name.length).toBeGreaterThan(0);
  });

  it('generates nickname-only name', () => {
    const result = gen.generate({ nameType: 'nickname' });
    expect(result.name).toContain('"');
    expect(result.meaning).toContain('Inventor');
  });
});
