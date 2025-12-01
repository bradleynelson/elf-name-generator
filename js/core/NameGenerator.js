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
            style = CONFIG.DEFAULT_STYLE,
            subrace = 'high-elf' // NEW: subrace selection
        } = options;
        
        let bestName = null;
        let bestDiff = 100;
        
        // Try multiple attempts to get close to target syllable count
        for (let attempts = 0; attempts < CONFIG.MAX_GENERATION_ATTEMPTS; attempts++) {
            const candidate = this._generateCandidate(complexity, style, subrace);
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
    _generateCandidate(complexity, style, subrace) {
        // Select prefix and suffix with subrace filtering
        const prefix = this._selectPrefix(style, subrace);
        const suffix = this._selectSuffix(style, subrace);
        
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
     * Select a prefix component, applying style and subrace preferences
     * @private
     */
    _selectPrefix(style, subrace) {
        return this._selectWeightedComponent(this.prefixCandidates, subrace);
    }
    
    /**
     * Select a suffix component, applying style and subrace preferences
     * @private
     */
    _selectSuffix(style, subrace) {
        let candidates = this.suffixCandidates;
        
        // Apply style filters (keep this for backward compatibility)
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
        
        return this._selectWeightedComponent(candidates, subrace);
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
    
    /**
     * Select a component using weighted probability based on subrace
     * @private
     */
    _selectWeightedComponent(candidates, subrace) {
        // If no subrace filtering, use random selection
        if (subrace === 'high-elf') {
            return this._randomElement(candidates);
        }
        
        // Determine preferred tag based on subrace
        const preferredTag = subrace === 'sun-elf' ? 'sun' : subrace === 'moon-elf' ? 'moon' : null;
        
        if (!preferredTag) {
            return this._randomElement(candidates);
        }
        
        // Filter components by preferred tag
        const preferred = candidates.filter(c => c.tags && c.tags.includes(preferredTag));
        const neutral = candidates.filter(c => c.tags && c.tags.includes('neutral'));
        const other = candidates.filter(c => !c.tags || (!c.tags.includes(preferredTag) && !c.tags.includes('neutral')));
        
        // Weighted random selection
        // 60% chance preferred, 30% chance neutral, 10% chance other
        const roll = Math.random();
        
        if (roll < 0.6 && preferred.length > 0) {
            return this._randomElement(preferred);
        } else if (roll < 0.9 && neutral.length > 0) {
            return this._randomElement(neutral);
        } else if (other.length > 0) {
            return this._randomElement(other);
        }
        
        // Fallback: pick from any available
        return this._randomElement(candidates);
    }
}