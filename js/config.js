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
    FAVORITES_STORAGE_KEY: 'faerunNameFavorites', // Unified storage for all generator types
    LEGACY_ELF_FAVORITES_KEY: 'elfNameFavorites', // For migration
    LEGACY_DWARVEN_FAVORITES_KEY: 'dwarvenNameFavorites', // For migration
    LAST_GENERATOR_KEY: 'faerunLastGenerator', // Remember last used generator
    MAX_FAVORITES: 100,
    
    // UI thresholds
    CONNECTOR_PROBABILITY_FEMININE: 0.3,
    CONNECTOR_PROBABILITY_MASCULINE: 0.3,
    LIQUID_CONNECTOR_PROBABILITY: 0.5,
    
    // Default values (Elven)
    DEFAULT_COMPLEXITY: 'auto',
    DEFAULT_SYLLABLES: 4,
    DEFAULT_STYLE: 'neutral',
    
    // Default values (Dwarven)
    DWARVEN_DEFAULT_NAME_TYPE: 'full',
    DWARVEN_DEFAULT_GENDER: 'neutral'
};

// Gender modifier prefix vowels (optional - prepended to beginning)
export const GENDER_PREFIX_VOWELS = [
    { vowel: 'A', gender: 'feminine', note: 'Explicit feminine marker' },
    { vowel: 'E', gender: 'masculine', note: 'Explicit masculine marker' },
    { vowel: 'I', gender: 'feminine', note: 'Vowel substitution (feminine)' },
    { vowel: 'Y', gender: 'feminine', note: 'Vowel substitution (feminine)' },
    { vowel: 'O', gender: 'masculine', note: 'Vowel substitution (masculine)' }
];

// Final vowels (optional - appended to end for musicality)
export const FINAL_VOWELS = [
    { vowel: 'a', tone: 'Clear, bright, feminine' },
    { vowel: 'i', tone: 'Sharp, intellectual' },
    { vowel: 'u', tone: 'Mysterious, ancient' },
    { vowel: 'ae', tone: 'Lyrical, elegant' }
];