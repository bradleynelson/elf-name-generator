// Configuration constants for the Espruar Name Generator
export const CONFIG = {
    // Generation settings
    MAX_GENERATION_ATTEMPTS: 50,
    ACCEPTABLE_SYLLABLE_DIFFERENCE: 1,
    
    // Character classification
    VOWELS: 'aeiouAEIOU',
    LIQUID_CONSONANTS: 'lrnmw',
    HARD_CONSONANTS: 'kptbdgcszxfv',
    
    // Storage
    FAVORITES_STORAGE_KEY: 'elfNameFavorites',
    MAX_FAVORITES: 100,
    
    // UI thresholds
    CONNECTOR_PROBABILITY_FEMININE: 0.3,
    CONNECTOR_PROBABILITY_MASCULINE: 0.3,
    LIQUID_CONNECTOR_PROBABILITY: 0.5,
    
    // Default values
    DEFAULT_COMPLEXITY: 'auto',
    DEFAULT_SYLLABLES: 4,
    DEFAULT_STYLE: 'neutral'
};

export const FINAL_VOWELS = [
    { vowel: 'a', tone: 'Clear, bright, feminine' },
    { vowel: 'i', tone: 'Sharp, intellectual' },
    { vowel: 'o', tone: 'Deep, noble (rare)' },
    { vowel: 'u', tone: 'Mysterious, ancient' },
    { vowel: 'ae', tone: 'Lyrical, elegant' }
];
