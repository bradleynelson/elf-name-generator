// Phonetic utility functions for Elven name generation
import { CONFIG } from '../config.js';

/**
 * Check if a character is a vowel
 * @param {string} char - Single character to check
 * @returns {boolean}
 */
export function isVowel(char) {
    return CONFIG.VOWELS.includes(char);
}

/**
 * Check if a string ends with a vowel
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function endsWithVowel(str) {
    if (!str || str.length === 0) return false;
    return isVowel(str[str.length - 1]);
}

/**
 * Check if a string starts with a vowel
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function startsWithVowel(str) {
    if (!str || str.length === 0) return false;
    return isVowel(str[0]);
}

/**
 * Check if a string ends with a hard consonant
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function endsWithHardConsonant(str) {
    if (!str || str.length === 0) return false;
    const lastChar = str[str.length - 1].toLowerCase();
    return CONFIG.HARD_CONSONANTS.includes(lastChar);
}

/**
 * Check if a character is a liquid consonant
 * @param {string} char - Single character to check
 * @returns {boolean}
 */
export function isLiquidConsonant(char) {
    return CONFIG.LIQUID_CONSONANTS.includes(char.toLowerCase());
}

/**
 * Count syllables in a word using phonetic rules
 * @param {string} word - Word to analyze
 * @returns {number} Syllable count (minimum 1)
 */
export function countSyllables(word) {
    if (!word || word.length === 0) return 0;
    
    word = word.toLowerCase();
    let count = 0;
    let prevVowel = false;
    
    for (let char of word) {
        if (isVowel(char)) {
            if (!prevVowel) count++;
            prevVowel = true;
        } else {
            prevVowel = false;
        }
    }
    
    // Silent 'e' at the end reduces count (but not if it's the only syllable)
    if (word.endsWith('e') && count > 1) {
        count--;
    }
    
    return Math.max(1, count);
}

/**
 * Determine if a connector is needed between two components
 * Based on Elven phonetic flow rules
 * @param {string} comp1Text - First component text
 * @param {string} comp2Text - Second component text
 * @returns {boolean}
 */
export function needsConnector(comp1Text, comp2Text) {
    if (!comp1Text || !comp2Text) return false;
    
    const end = comp1Text[comp1Text.length - 1];
    const start = comp2Text[0];
    
    // Need connector if both are consonants
    if (!isVowel(end) && !isVowel(start)) {
        // Exception: Liquid consonants blend well together
        if (isLiquidConsonant(end) && isLiquidConsonant(start)) {
            return false;
        }
        return true;
    }
    
    return false;
}

/**
 * Determine if a final vowel should be suggested
 * @param {string} name - Generated name
 * @param {number} syllables - Current syllable count
 * @param {number} targetSyllables - Target syllable count
 * @returns {boolean}
 */
export function shouldSuggestFinalVowel(name, syllables, targetSyllables) {
    // Suggest if name is short
    if (syllables < targetSyllables) return true;
    
    // Suggest if ends with hard consonant
    if (endsWithHardConsonant(name)) return true;
    
    return false;
}

/**
 * Clean component text by removing hyphens
 * @param {string} text - Component text with hyphens
 * @returns {string} Clean text
 */
export function cleanComponentText(text) {
    if (!text) return '';
    return text.replace(/-/g, '');
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string}
 */
export function capitalize(str) {
    if (!str || str.length === 0) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Clean and format meaning text
 * Replace slashes with commas and capitalize words
 * @param {string} meaning - Raw meaning text
 * @returns {string} Formatted meaning
 */
export function formatMeaning(meaning) {
    if (!meaning) return '';
    
    // Replace slashes with commas
    meaning = meaning.replace(/\s*\/\s*/g, ', ');
    
    // Capitalize every word (Title Case)
    return meaning.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

/**
 * Extract main vowel sound from a string
 * @param {string} text - Text to analyze
 * @returns {string|null} Main vowel sound or null
 */
export function getMainVowel(text) {
    if (!text) return null;
    
    const vowelMatches = text.toLowerCase().match(/[aeiou]+/g);
    if (!vowelMatches || vowelMatches.length === 0) return null;
    
    // Return the first vowel cluster
    return vowelMatches[0];
}

/**
 * Check if two strings share a vowel sound (for Moon Elf repetition)
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {boolean}
 */
export function sharesVowelSound(text1, text2) {
    const vowel1 = getMainVowel(text1);
    const vowel2 = getMainVowel(text2);
    
    if (!vowel1 || !vowel2) return false;
    
    // Check if they share any vowel character
    for (let v of vowel1) {
        if (vowel2.includes(v)) return true;
    }
    
    return false;
}

/**
 * Check if combining two texts would create a harsh consonant cluster
 * Elves avoid: gr-, kr-, dr- (except Drow), tr- (rare)
 * @param {string} comp1Text - First component
 * @param {string} comp2Text - Second component
 * @returns {boolean}
 */
export function hasHarshCluster(comp1Text, comp2Text) {
    if (!comp1Text || !comp2Text) return false;
    
    const end = comp1Text.slice(-2).toLowerCase(); // Last 2 chars
    const start = comp2Text.slice(0, 2).toLowerCase(); // First 2 chars
    const junction = (comp1Text.slice(-1) + comp2Text.slice(0, 1)).toLowerCase();
    
    // Harsh clusters to avoid
    const harshClusters = ['gr', 'kr', 'dr', 'tr', 'thr', 'str'];
    
    // Check if junction or either end creates a harsh cluster
    return harshClusters.some(cluster => 
        junction.includes(cluster) || 
        end.includes(cluster) || 
        start.includes(cluster)
    );
}

/**
 * Check if a name has excessive consonant clusters (more than 2 consonants together)
 * @param {string} name - Name to check
 * @returns {boolean}
 */
export function hasExcessiveConsonantCluster(name) {
    if (!name) return false;
    
    // Find all consonant clusters
    const consonantClusters = name.match(/[^aeiou]{3,}/gi);
    return consonantClusters && consonantClusters.length > 0;
}

/**
 * Detect gender implied by suffix
 * @param {Object} nameData - Generated name data
 * @returns {string} 'feminine', 'masculine', or 'neutral'
 */
export function detectSuffixGender(nameData) {
    // Check for gender modifier suffixes
    const feminineEndings = ['iel', 'ael', 'wen', 'yn', 'ae', 'a'];
    const masculineEndings = ['ion', 'on', 'or', 'ar'];
    
    let suffix = null;
    if (nameData.suffix && nameData.suffix.suffix_text) {
        suffix = nameData.suffix.suffix_text.toLowerCase().replace('-', '');
    } else if (nameData.components && nameData.components.length > 0) {
        // Complex mode - check last component
        const lastComp = nameData.components[nameData.components.length - 1];
        suffix = lastComp.text.toLowerCase();
    }
    
    if (!suffix) return 'neutral';
    
    // Check if it's explicitly marked as gender modifier
    if (nameData.suffix && nameData.suffix.is_gender_modifier) {
        if (suffix.includes('iel') || suffix.includes('ial')) return 'feminine';
        if (suffix.includes('ion')) return 'masculine';
    }
    
    // Check endings
    for (const ending of feminineEndings) {
        if (suffix.endsWith(ending)) return 'feminine';
    }
    for (const ending of masculineEndings) {
        if (suffix.endsWith(ending)) return 'masculine';
    }
    
    return 'neutral';
}

/**
 * Determine if gender prefix vowels should be suggested
 * @param {Object} nameData - Generated name data
 * @returns {boolean}
 */
export function shouldSuggestGenderPrefix(nameData) {
    // Always suggest for High Elf names (optional feature for gender emphasis/override)
    return true;
}