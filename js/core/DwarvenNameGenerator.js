// Dwarven Name Generator following Dethek naming rules
import { CONFIG } from '../config.js';
import * as phonetics from '../utils/phonetics.js';

/**
 * Dwarven Name Generator
 * Implements Dethek naming system with first names and clan names
 */
export class DwarvenNameGenerator {
    constructor(firstNames, clanNames) {
        this.firstNames = firstNames;
        this.clanNames = clanNames;
        
        // Pre-filter components for faster access
        this.firstNamePrefixes = firstNames.filter(c => c.can_be_prefix && c.prefix_text);
        this.firstNameSuffixes = firstNames.filter(c => c.can_be_suffix && c.suffix_text);
        
        this.clanNamePrefixes = clanNames.filter(c => c.can_be_prefix && c.prefix_text);
        this.clanNameSuffixes = clanNames.filter(c => c.can_be_suffix && c.suffix_text);
        
        // Track recently used components to reduce repeats
        this.recentlyUsed = [];
        this.maxRecentHistory = 5;
    }
    
    /**
     * Generate a Dwarven name based on user preferences
     * @param {Object} options - Generation options
     * @returns {Object} Generated name data
     */
    generate(options = {}) {
        const {
            nameType = CONFIG.DWARVEN_DEFAULT_NAME_TYPE,
            gender = CONFIG.DWARVEN_DEFAULT_GENDER,
            subrace = 'general'
        } = options;
        
        let result = {};
        
        // Generate based on name type
        if (nameType === 'first' || nameType === 'full') {
            result.firstName = this._generateFirstName(gender, subrace);
        }
        
        if (nameType === 'clan' || nameType === 'full') {
            result.clanName = this._generateClanName(subrace);
        }
        
        // Build full name
        if (nameType === 'full') {
            result.name = `${result.firstName.name} ${result.clanName.name}`;
            result.meaning = `${result.firstName.meaning} + ${result.clanName.meaning}`;
            result.pronunciation = `${result.firstName.pronunciation} ${result.clanName.pronunciation}`;
            result.syllables = result.firstName.syllables + result.clanName.syllables;
        } else if (nameType === 'first') {
            result.name = result.firstName.name;
            result.meaning = result.firstName.meaning;
            result.pronunciation = result.firstName.pronunciation;
            result.syllables = result.firstName.syllables;
        } else {
            result.name = result.clanName.name;
            result.meaning = result.clanName.meaning;
            result.pronunciation = result.clanName.pronunciation;
            result.syllables = result.clanName.syllables;
        }
        
        result.nameType = nameType;
        result.gender = gender;
        result.subrace = subrace;
        
        return result;
    }
    
    /**
     * Filter components by subrace preference
     * @private
     */
    _filterBySubrace(components, subrace) {
        if (subrace === 'general') {
            return components;
        }
        
        // Define subrace preferences by category/keywords
        const subracePreferences = {
            'gold-dwarf': {
                preferredCategories: ['stone-earth'], // Will weight towards gold, gem, hall, high
                preferredKeywords: ['gold', 'gem', 'hall', 'high', 'sun', 'honor', 'temple', 'bright', 'wealth']
            },
            'shield-dwarf': {
                preferredCategories: ['war-battle', 'craft-forge'],
                preferredKeywords: ['steel', 'axe', 'battle', 'iron', 'hammer', 'defense', 'shield', 'war', 'guard']
            },
            'duergar': {
                preferredCategories: ['stone-earth', 'geography'],
                preferredKeywords: ['gray', 'slave', 'deep', 'dark', 'under', 'mind', 'stone', 'ash', 'coal']
            }
        };
        
        const preferences = subracePreferences[subrace];
        if (!preferences) return components;
        
        // Weight components: preferred get 3x weight, others get 1x
        const weightedComponents = [];
        
        components.forEach(comp => {
            const text = (comp.prefix_text || comp.suffix_text || comp.text || '').toLowerCase();
            const meaning = (comp.prefix_meaning || comp.suffix_meaning || comp.meaning || '').toLowerCase();
            const category = (comp.category || '').toLowerCase();
            
            let weight = 1;
            
            // Check if component matches preferred category
            if (preferences.preferredCategories.includes(category)) {
                weight = 3;
            }
            
            // Check if component matches preferred keywords
            const allText = text + ' ' + meaning;
            if (preferences.preferredKeywords.some(keyword => allText.includes(keyword))) {
                weight = 3;
            }
            
            // Add component multiple times based on weight
            for (let i = 0; i < weight; i++) {
                weightedComponents.push(comp);
            }
        });
        
        return weightedComponents;
    }
    
    /**
     * Generate a first name
     * @private
     */
    _generateFirstName(gender, subrace = 'general') {
        // Filter by gender if specified
        let prefixCandidates = this.firstNamePrefixes;
        let suffixCandidates = this.firstNameSuffixes;
        
        if (gender !== 'neutral') {
            prefixCandidates = this.firstNamePrefixes.filter(c => 
                c.gender === gender || c.gender === 'neutral'
            );
            suffixCandidates = this.firstNameSuffixes.filter(c => 
                c.gender === gender || c.gender === 'neutral'
            );
        }
        
        // Filter by subrace preference
        prefixCandidates = this._filterBySubrace(prefixCandidates, subrace);
        suffixCandidates = this._filterBySubrace(suffixCandidates, subrace);
        
        // Select random prefix and suffix
        const prefix = this._randomElement(prefixCandidates);
        const suffix = this._randomElement(suffixCandidates);
        
        // Build the name with phonetic smoothing
        const prefixText = phonetics.cleanComponentText(prefix.prefix_text);
        const suffixText = phonetics.cleanComponentText(suffix.suffix_text);
        const combinedName = this._smoothConsonantCluster(prefixText, suffixText);
        const fullName = phonetics.capitalize(combinedName);
        
        // Build meaning
        const prefixMeaning = phonetics.formatMeaning(prefix.prefix_meaning);
        const suffixMeaning = phonetics.formatMeaning(suffix.suffix_meaning);
        const meaning = `${prefixMeaning} + ${suffixMeaning}`;
        
        // Build phonetic pronunciation
        let pronunciation = '';
        if (prefix.prefix_phonetic) {
            pronunciation += prefix.prefix_phonetic;
        }
        if (suffix.suffix_phonetic) {
            if (pronunciation) pronunciation += '-';
            pronunciation += suffix.suffix_phonetic;
        }
        
        const syllables = phonetics.countSyllables(fullName);
        
        return {
            name: fullName,
            meaning,
            pronunciation,
            prefix,
            suffix,
            syllables
        };
    }
    
    /**
     * Generate a clan name
     * Clan names can mix English words (from clanNames) AND Dethek components (from firstNames)
     * Examples: "Stonegrim" (English + Dethek), "Bronguard" (Dethek + English), "Stonehammer" (English + English)
     * @private
     */
    _generateClanName(subrace = 'general') {
        // Combine English word prefixes with Dethek prefixes
        const allPrefixCandidates = [
            ...this._filterBySubrace(this.clanNamePrefixes, subrace), // English words
            ...this._filterBySubrace(this.firstNamePrefixes, subrace)  // Dethek components
        ];
        
        // Combine English word suffixes with Dethek suffixes
        const allSuffixCandidates = [
            ...this._filterBySubrace(this.clanNameSuffixes, subrace), // English words
            ...this._filterBySubrace(this.firstNameSuffixes, subrace)  // Dethek components
        ];
        
        // Select random prefix and suffix (can be English or Dethek)
        const prefix = this._randomElement(allPrefixCandidates);
        const suffix = this._randomElement(allSuffixCandidates);
        
        // Build the name with phonetic smoothing (no hyphens)
        // Handle both English words (no hyphens) and Dethek components (may have hyphens)
        const prefixText = phonetics.cleanComponentText(prefix.prefix_text || prefix.text || '').toLowerCase();
        const suffixText = phonetics.cleanComponentText(suffix.suffix_text || suffix.text || '').toLowerCase();
        const combinedName = this._smoothConsonantCluster(prefixText, suffixText);
        const fullName = phonetics.capitalize(combinedName);
        
        // Build meaning (handle both English words and Dethek components)
        const prefixMeaning = phonetics.formatMeaning(prefix.prefix_meaning || prefix.meaning || '');
        const suffixMeaning = phonetics.formatMeaning(suffix.suffix_meaning || suffix.meaning || '');
        const meaning = `${prefixMeaning} + ${suffixMeaning}`;
        
        // Build phonetic pronunciation (handle both English words and Dethek components)
        let pronunciation = '';
        if (prefix.prefix_phonetic || prefix.phonetic) {
            pronunciation += (prefix.prefix_phonetic || prefix.phonetic);
        }
        if (suffix.suffix_phonetic || suffix.phonetic) {
            if (pronunciation) pronunciation += '-';
            pronunciation += (suffix.suffix_phonetic || suffix.phonetic);
        }
        
        const syllables = phonetics.countSyllables(fullName);
        
        return {
            name: fullName,
            meaning,
            pronunciation,
            prefix,
            suffix,
            syllables
        };
    }
    
    /**
     * Smooth harsh consonant clusters at component boundaries
     * @private
     * @param {string} prefix - Prefix text
     * @param {string} suffix - Suffix text
     * @returns {string} Combined text with smoothed consonants
     */
    _smoothConsonantCluster(prefix, suffix) {
        const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
        
        // Get last character of prefix and first character of suffix
        const lastChar = prefix.slice(-1).toLowerCase();
        const lastTwoChars = prefix.slice(-2).toLowerCase();
        const firstChar = suffix.charAt(0).toLowerCase();
        const firstTwoChars = suffix.slice(0, 2).toLowerCase();
        
        // Check for triple or quadruple consonant (ddd, dddd)
        const combined = prefix + suffix;
        if (/([bcdfghjklmnpqrstvwxyz])\1{2,}/i.test(combined)) {
            // Remove duplicate consonants at the boundary
            // e.g., "Audd" + "dd" -> "Aud" + "d"
            let cleanPrefix = prefix;
            let cleanSuffix = suffix;
            
            // If prefix ends with repeated consonant, trim to single
            if (lastChar === lastTwoChars.charAt(0) && !vowels.has(lastChar)) {
                cleanPrefix = prefix.slice(0, -1);
            }
            
            // If suffix starts with same consonant, keep suffix as-is
            return cleanPrefix + cleanSuffix;
        }
        
        // Check for harsh clusters: double consonant + different consonant
        // e.g., "dd" + "b", "gg" + "r", but NOT "nn" which is common in Dwarven
        if (!vowels.has(lastChar) && lastChar === lastTwoChars.charAt(0) && 
            !vowels.has(firstChar) && firstChar !== lastChar && lastChar !== 'n') {
            // Reduce double consonant to single at prefix end (except 'nn')
            return prefix.slice(0, -1) + suffix;
        }
        
        // Default: return unchanged
        return prefix + suffix;
    }
    
    /**
     * Get a random element from an array
     * @private
     */
    _randomElement(array) {
        if (!array || array.length === 0) {
            throw new Error('Cannot select from empty array');
        }
        return array[Math.floor(Math.random() * array.length)];
    }
}

