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
