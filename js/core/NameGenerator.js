// Main Name Generator class following Espruar naming rules
import { CONFIG } from '../config.js';
import * as phonetics from '../utils/phonetics.js';

/**
 * High Elf Name Generator
 * Implements the Espruar "Lego System" with interchangeable components
 */
export class NameGenerator {
    constructor(components, connectors) {
        this.components = components;
        this.connectors = connectors;
        
        // Pre-filter components for faster access
        this.prefixCandidates = components.filter(c => c.can_be_prefix && c.prefix_text);
        this.suffixCandidates = components.filter(c => c.can_be_suffix && c.suffix_text);
    }
    
    /**
     * Generate a High Elf name based on user preferences
     * @param {Object} options - Generation options
     * @returns {Object} Generated name data
     */
    generate(options = {}) {
        const {
            complexity = CONFIG.DEFAULT_COMPLEXITY,
            targetSyllables = CONFIG.DEFAULT_SYLLABLES,
            style = CONFIG.DEFAULT_STYLE
        } = options;
        
        let bestName = null;
        let bestDiff = 100;
        
        // Try multiple attempts to get close to target syllable count
        for (let attempts = 0; attempts < CONFIG.MAX_GENERATION_ATTEMPTS; attempts++) {
            const candidate = this._generateCandidate(complexity, style);
            const diff = Math.abs(candidate.syllables - targetSyllables);
            
            if (diff < bestDiff) {
                bestDiff = diff;
                bestName = candidate;
            }
            
            // Stop if we're close enough
            if (diff <= CONFIG.ACCEPTABLE_SYLLABLE_DIFFERENCE) {
                break;
            }
        }
        
        return bestName;
    }
    
    /**
     * Generate a single name candidate
     * @private
     */
    _generateCandidate(complexity, style) {
        // Select prefix and suffix
        const prefix = this._selectPrefix(style);
        const suffix = this._selectSuffix(style);
        
        // Get clean text (remove hyphens)
        const prefixText = phonetics.cleanComponentText(prefix.prefix_text);
        const suffixText = phonetics.cleanComponentText(suffix.suffix_text);
        
        // Determine if connector is needed
        let connector = null;
        const needsConnector = complexity === 'complex' || 
                             (complexity === 'auto' && 
                              phonetics.needsConnector(prefixText, suffixText));
        
        if (needsConnector) {
            connector = this._selectConnector(style);
        }
        
        // Build the name
        const nameParts = [
            prefixText,
            connector ? phonetics.cleanComponentText(connector.text) : '',
            suffixText
        ];
        
        const fullName = phonetics.capitalize(nameParts.join(''));
        const syllables = phonetics.countSyllables(fullName);
        
        // Build meaning string
        const prefixMeaning = phonetics.formatMeaning(prefix.prefix_meaning);
        const suffixMeaning = phonetics.formatMeaning(suffix.suffix_meaning);
        const meaning = `${prefixMeaning} + ${suffixMeaning}`;
        
        return {
            name: fullName,
            baseForm: fullName,
            meaning,
            prefix,
            connector,
            suffix,
            syllables,
            finalVowel: null
        };
    }
    
    /**
     * Select a prefix component, applying style preferences
     * @private
     */
    _selectPrefix(style) {
        return this._randomElement(this.prefixCandidates);
    }
    
    /**
     * Select a suffix component, applying style preferences
     * @private
     */
    _selectSuffix(style) {
        let candidates = this.suffixCandidates;
        
        // Apply style filters
        if (style === 'feminine' && Math.random() > CONFIG.CONNECTOR_PROBABILITY_FEMININE) {
            const femSuffixes = candidates.filter(s => 
                s.root.includes('iel') || s.root.includes('wen') || 
                s.root.includes('lia') || s.root.includes('riel') || 
                s.root.includes('rae') || s.root.includes('ae')
            );
            if (femSuffixes.length > 0) {
                candidates = femSuffixes;
            }
        } else if (style === 'masculine' && Math.random() > CONFIG.CONNECTOR_PROBABILITY_MASCULINE) {
            const mascSuffixes = candidates.filter(s => 
                s.root.includes('ion') || s.root.includes('ar') || 
                s.root.includes('kian') || s.root.includes('drith') ||
                s.root.includes('dor') || s.root.includes('val')
            );
            if (mascSuffixes.length > 0) {
                candidates = mascSuffixes;
            }
        }
        
        return this._randomElement(candidates);
    }
    
    /**
     * Select a connector, applying style preferences
     * @private
     */
    _selectConnector(style) {
        // Liquid connectors (l, r, n) for smooth flow
        const liquidConnectors = this.connectors.filter(c => 
            c.text.includes('l') || c.text.includes('r') || c.text.includes('n')
        );
        
        // Feminine style prefers softer sounds
        if (style === 'feminine') {
            const softConnectors = this.connectors.filter(c => 
                c.text.includes('i') || c.text.includes('e') || c.text.includes('ella')
            );
            if (softConnectors.length > 0 && Math.random() > CONFIG.CONNECTOR_PROBABILITY_FEMININE) {
                return this._randomElement(softConnectors);
            }
        }
        
        // Masculine style prefers stronger sounds
        if (style === 'masculine') {
            const strongConnectors = this.connectors.filter(c => 
                c.text.includes('th') || c.text.includes('or') || c.text.includes('an')
            );
            if (strongConnectors.length > 0 && Math.random() > CONFIG.CONNECTOR_PROBABILITY_MASCULINE) {
                return this._randomElement(strongConnectors);
            }
        }
        
        // Default: prefer liquid connectors for natural flow
        if (liquidConnectors.length > 0 && Math.random() > CONFIG.LIQUID_CONNECTOR_PROBABILITY) {
            return this._randomElement(liquidConnectors);
        }
        
        return this._randomElement(this.connectors);
    }
    
    /**
     * Get a random element from an array
     * @private
     */
    _randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}
