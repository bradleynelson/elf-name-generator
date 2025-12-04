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
        
        // Track recently used components to reduce repeats
        this.recentlyUsed = [];
        this.maxRecentHistory = 5; // Remember last 5 generations
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
        
        // Map drow + gender to internal tags
        let effectiveSubrace = subrace;
        if (subrace === 'drow') {
            // Use gender/style selector to determine drow variant
            effectiveSubrace = (style === 'feminine') ? 'drow-female' : 'drow-male';
        }
        
        // Wood Elves prefer shorter names (2-3 syllables)
        // Drow females prefer longer names (4-6 syllables)
        // Drow males prefer shorter names (2-3 syllables)
        let adjustedTarget = targetSyllables;
        if (subrace === 'wood-elf' || effectiveSubrace === 'drow-male') {
            adjustedTarget = Math.max(2, targetSyllables - 1); // Lower by 1, min 2
        } else if (effectiveSubrace === 'drow-female') {
            adjustedTarget = Math.min(6, targetSyllables + 1); // Higher by 1, max 6
        }
        
        let bestName = null;
        let bestDiff = 100;
        const acceptableCandidates = []; // Store all acceptable candidates for random selection
        
        // Try multiple attempts to get close to target syllable count
        for (let attempts = 0; attempts < CONFIG.MAX_GENERATION_ATTEMPTS; attempts++) {
            const candidate = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);
            const diff = Math.abs(candidate.syllables - adjustedTarget);
            
            // Track best match
            if (diff < bestDiff) {
                bestDiff = diff;
                bestName = candidate;
            }
            
            // Store acceptable candidates (within target ±1) for random selection
            if (diff <= CONFIG.ACCEPTABLE_SYLLABLE_DIFFERENCE) {
                acceptableCandidates.push(candidate);
            }
            
            // Stop early if we have enough acceptable candidates (adds randomness)
            if (acceptableCandidates.length >= 3) {
                // Randomly pick from acceptable candidates instead of always best
                bestName = acceptableCandidates[Math.floor(Math.random() * acceptableCandidates.length)];
                break;
            }
            
            // Stop if we're close enough and have at least one acceptable candidate
            if (diff <= CONFIG.ACCEPTABLE_SYLLABLE_DIFFERENCE && acceptableCandidates.length > 0) {
                // 50% chance to use best, 50% chance to use random acceptable
                if (Math.random() < 0.5 && acceptableCandidates.length > 1) {
                    bestName = acceptableCandidates[Math.floor(Math.random() * acceptableCandidates.length)];
                }
                break;
            }
        }
        
        // Track components used in this generation
        this._trackUsedComponents(bestName);
        
        return bestName;
    }
    
    /**
     * Generate multiple unique names
     * @param {number} count - Number of names to generate
     * @param {Object} options - Generation options (same as generate)
     * @returns {Array<Object>} Array of generated name data
     */
    generateMultiple(count, options = {}) {
        const results = [];
        const seenNames = new Set();
        const maxAttempts = count * 10; // Prevent infinite loops
        let attempts = 0;
        
        while (results.length < count && attempts < maxAttempts) {
            attempts++;
            const nameData = this.generate(options);
            
            // Only add if unique
            if (!seenNames.has(nameData.name)) {
                seenNames.add(nameData.name);
                results.push(nameData);
            }
        }
        
        return results;
    }
    
    /**
     * Track components used in a name to avoid immediate repeats
     * @private
     */
    _trackUsedComponents(nameData) {
        const usedRoots = new Set();
        
        // Standard mode
        if (nameData.prefix) {
            usedRoots.add(nameData.prefix.root);
        }
        if (nameData.suffix) {
            usedRoots.add(nameData.suffix.root);
        }
        
        // Complex mode
        if (nameData.components) {
            nameData.components.forEach(comp => {
                usedRoots.add(comp.component.root);
            });
        }
        
        // Add to history (keep last N)
        this.recentlyUsed.push(usedRoots);
        if (this.recentlyUsed.length > this.maxRecentHistory) {
            this.recentlyUsed.shift();
        }
    }
    
    /**
     * Generate a single name candidate
     * @private
     */
    _generateCandidate(complexity, style, subrace, targetSyllables) {
        // Route to complex mode for 3+ component names
        if (complexity === 'complex') {
            return this._generateComplexCandidate(style, subrace, targetSyllables);
        }
        
        // Standard 2-component generation
        const prefix = this._selectPrefix(style, subrace);
        const suffix = this._selectSuffix(style, subrace);
        
        // Get clean text (remove hyphens)
        const prefixText = phonetics.cleanComponentText(prefix.prefix_text);
        const suffixText = phonetics.cleanComponentText(suffix.suffix_text);
        
        // Determine if connector is needed
        let connector = null;
        let needsConnector = complexity === 'auto' && 
                           phonetics.needsConnector(prefixText, suffixText);
        
        // Wood Elves discourage connectors - only use for REALLY harsh clusters
        if (subrace === 'wood-elf' && needsConnector) {
            // Only use connector if it's a harsh cluster, not just any consonant collision
            needsConnector = phonetics.hasHarshCluster(prefixText, suffixText);
        }
        
        // Drow EMBRACE harsh clusters - don't use connectors to smooth them
        if (subrace === 'drow' && needsConnector) {
            // Drow want the harsh, clumsy sound - skip connectors
            needsConnector = false;
        }
        
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
        
        // Build meaning string (include connector meaning if it exists)
        const prefixMeaning = phonetics.formatMeaning(prefix.prefix_meaning);
        const suffixMeaning = phonetics.formatMeaning(suffix.suffix_meaning);
        let meaning = prefixMeaning + ' + ' + suffixMeaning;
        
        // Add connector meaning if it has one
        if (connector && connector.meaning) {
            const connectorMeaning = phonetics.formatMeaning(connector.meaning);
            meaning = prefixMeaning + ' + ' + connectorMeaning + ' + ' + suffixMeaning;
        }
        
        // Build phonetic pronunciation
        let pronunciation = '';
        if (prefix.prefix_phonetic) {
            pronunciation += prefix.prefix_phonetic;
        }
        if (connector && connector.phonetic) {
            pronunciation += '-' + connector.phonetic;
        }
        if (suffix.suffix_phonetic) {
            pronunciation += '-' + suffix.suffix_phonetic;
        }
        
        return {
            name: fullName,
            baseForm: fullName,
            meaning,
            pronunciation,
            prefix,
            connector,
            suffix,
            syllables,
            genderPrefixVowel: null,
            finalVowel: null
        };
    }
    
    /**
     * Generate a complex name with 2-4 components (syllable-driven)
     * @private
     */
    _generateComplexCandidate(style, subrace, targetSyllables) {
        const components = [];
        const connectors = [];
        let nameParts = [];
        let currentSyllables = 0;
        // Use the passed targetSyllables, not hardcoded
        
        // Get flexible components (can be either prefix or suffix)
        const flexibleComponents = this.components.filter(c => 
            c.can_be_prefix && c.can_be_suffix && !c.is_gender_modifier
        );
        
        // Start with a prefix
        let component = this._selectWeightedComponent(this.prefixCandidates, subrace);
        let componentText = phonetics.cleanComponentText(component.prefix_text);
        let componentMeaning = phonetics.formatMeaning(component.prefix_meaning);
        
        components.push({ component, text: componentText, meaning: componentMeaning });
        nameParts.push(componentText);
        currentSyllables = phonetics.countSyllables(componentText);
        
        let lastText = componentText;
        let attempts = 0;
        const maxComponents = 3; // Lowered from 4 - keep names shorter
        const minComponents = 2; // Always need at least 2 components
        const minSyllables = 2; // Never generate 1-syllable names
        
        // Keep adding components until we reach target syllables
        while (currentSyllables < targetSyllables && components.length < maxComponents && attempts < 10) {
            attempts++;
            
            // Select next component from flexible pool
            component = this._selectWeightedComponent(flexibleComponents, subrace);
            
            // Randomly use as prefix or suffix (ensure component has the required form)
            let useAsPrefix = Math.random() > 0.5;
            
            // If component doesn't have the preferred form, use the available one
            if (useAsPrefix && !component.prefix_text) {
                useAsPrefix = false;
            } else if (!useAsPrefix && !component.suffix_text) {
                useAsPrefix = true;
            }
            
            // Ensure we have a valid form (fallback if somehow both are missing)
            if (!component.prefix_text && !component.suffix_text) {
                // Skip this component and try again
                attempts--;
                continue;
            }
            
            componentText = phonetics.cleanComponentText(
                useAsPrefix ? component.prefix_text : component.suffix_text
            );
            componentMeaning = phonetics.formatMeaning(
                useAsPrefix ? component.prefix_meaning : component.suffix_meaning
            );
            
            // Check syllable count if we add this component
            const componentSyllables = phonetics.countSyllables(componentText);
            const projectedTotal = currentSyllables + componentSyllables;
            
            // Don't add if it would exceed target+1 (unless we need minimum components)
            if (projectedTotal > targetSyllables + 1 && components.length >= minComponents) {
                break;
            }
            
            // Check if we need a connector
            const needsConn = phonetics.needsConnector(lastText, componentText) || 
                            phonetics.hasHarshCluster(lastText, componentText);
            
            if (needsConn) {
                let connector = this._selectConnector(style);
                let connectorText = phonetics.cleanComponentText(connector.text);
                
                // Moon Elf vowel repetition (1/3 chance)
                if (subrace === 'moon-elf' && Math.random() < 0.33) {
                    const matchingConnectors = this.connectors.filter(c => 
                        phonetics.sharesVowelSound(c.text, componentText)
                    );
                    if (matchingConnectors.length > 0) {
                        connector = matchingConnectors[Math.floor(Math.random() * matchingConnectors.length)];
                        connectorText = phonetics.cleanComponentText(connector.text);
                    }
                }
                
                // Check if connector makes name too long
                const connectorSyllables = phonetics.countSyllables(connectorText);
                if (currentSyllables + connectorSyllables + componentSyllables > targetSyllables + 1) {
                    break;
                }
                
                connectors.push({ connector, text: connectorText });
                nameParts.push(connectorText);
                currentSyllables += connectorSyllables;
                lastText = connectorText;
            }
            
            // Add the component
            components.push({ component, text: componentText, meaning: componentMeaning });
            nameParts.push(componentText);
            currentSyllables += componentSyllables;
            lastText = componentText;
            
            // Stop immediately if we've met the target (don't wait for next loop)
            if (currentSyllables >= targetSyllables && components.length >= minComponents) {
                break;
            }
        }
        
        // Ensure we end with a proper suffix if last component isn't suffix-capable
        const lastComponent = components[components.length - 1].component;
        if (!lastComponent.suffix_text || !lastComponent.can_be_suffix) {
            // Replace last component with a proper suffix
            const finalSuffix = this._selectSuffix(style, subrace);
            const finalSuffixText = phonetics.cleanComponentText(finalSuffix.suffix_text);
            const finalSuffixMeaning = phonetics.formatMeaning(finalSuffix.suffix_meaning);
            
            // Remove last component
            components.pop();
            nameParts.pop();
            currentSyllables -= phonetics.countSyllables(lastText);
            
            // Get new lastText
            if (nameParts.length > 0) {
                lastText = nameParts[nameParts.length - 1];
            }
            
            // Check if connector needed
            if (phonetics.needsConnector(lastText, finalSuffixText)) {
                const connector = this._selectConnector(style);
                const connectorText = phonetics.cleanComponentText(connector.text);
                
                connectors.push({ connector, text: connectorText });
                nameParts.push(connectorText);
            }
            
            components.push({ 
                component: finalSuffix, 
                text: finalSuffixText, 
                meaning: finalSuffixMeaning 
            });
            nameParts.push(finalSuffixText);
        }
        
        // Build the final name - join first, THEN capitalize only first letter
        const fullName = phonetics.capitalize(nameParts.join('').toLowerCase());
        const syllables = phonetics.countSyllables(fullName);
        
        // Build meaning string - ONLY component meanings, filter out empty ones
        const componentMeanings = components.map(c => c.meaning).filter(m => m && m.trim());
        const meaning = componentMeanings.join(' + ');
        
        // Build phonetic pronunciation
        let pronunciationParts = [];
        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            
            // Add component phonetic
            if (comp.component.prefix_phonetic && comp.component.can_be_prefix) {
                pronunciationParts.push(comp.component.prefix_phonetic);
            } else if (comp.component.suffix_phonetic && comp.component.can_be_suffix) {
                pronunciationParts.push(comp.component.suffix_phonetic);
            }
            
            // Add connector phonetic if there's one after this component
            if (i < connectors.length && connectors[i] && connectors[i].connector && connectors[i].connector.phonetic) {
                pronunciationParts.push(connectors[i].connector.phonetic);
            }
        }
        const pronunciation = pronunciationParts.join('-');
        
        return {
            name: fullName,
            baseForm: fullName,
            meaning,
            pronunciation,
            components,
            connectors,
            syllables,
            genderPrefixVowel: null,
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
        
        // Apply style filters with weighted probability (not always-on)
        // Use style preference 50% of the time to maintain randomness
        if (style === 'feminine' && Math.random() < 0.5) {
            // Filter for feminine suffixes (check suffix_text, not root, for accuracy)
            const femSuffixes = candidates.filter(s => {
                const suffixText = (s.suffix_text || '').toLowerCase();
                return suffixText.includes('iel') || suffixText.includes('wen') || 
                       suffixText.includes('lia') || suffixText.includes('riel') || 
                       suffixText.includes('rae') || suffixText.includes('ae') ||
                       s.is_gender_modifier && suffixText.includes('iel');
            });
            if (femSuffixes.length > 0) {
                candidates = femSuffixes;
            }
        } else if (style === 'masculine' && Math.random() < 0.5) {
            // Filter for masculine suffixes
            const mascSuffixes = candidates.filter(s => {
                const suffixText = (s.suffix_text || '').toLowerCase();
                return suffixText.includes('ion') || suffixText.includes('ar') || 
                       suffixText.includes('kian') || suffixText.includes('drith') ||
                       suffixText.includes('dor') || suffixText.includes('val') ||
                       s.is_gender_modifier && (suffixText.includes('ion') || suffixText.includes('kian') || suffixText.includes('drith'));
            });
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
        // Feminine style prefers softer sounds (50% chance to apply preference)
        if (style === 'feminine' && Math.random() < 0.5) {
            const softConnectors = this.connectors.filter(c => 
                c.text.includes('i') || c.text.includes('e') || c.text.includes('ella')
            );
            if (softConnectors.length > 0) {
                return this._randomElement(softConnectors);
            }
        }
        
        // Masculine style prefers stronger sounds (50% chance to apply preference)
        if (style === 'masculine' && Math.random() < 0.5) {
            const strongConnectors = this.connectors.filter(c => 
                c.text.includes('th') || c.text.includes('or') || c.text.includes('an')
            );
            if (strongConnectors.length > 0) {
                return this._randomElement(strongConnectors);
            }
        }
        
        // Default: prefer liquid connectors for natural flow (60% chance)
        const liquidConnectors = this.connectors.filter(c => 
            c.text.includes('l') || c.text.includes('r') || c.text.includes('n')
        );
        if (liquidConnectors.length > 0 && Math.random() < 0.6) {
            return this._randomElement(liquidConnectors);
        }
        
        // Otherwise, completely random from all connectors
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
        // Filter out recently used components (anti-repeat for better randomness)
        let availableCandidates = candidates;
        if (this.recentlyUsed.length > 0) {
            // Flatten all recently used roots
            const recentRoots = new Set();
            this.recentlyUsed.forEach(usedSet => {
                usedSet.forEach(root => recentRoots.add(root));
            });
            
            // Filter out recently used (but keep if that leaves too few options)
            // Lowered threshold from 10 to 5 to be more aggressive about avoiding repeats
            const filtered = candidates.filter(c => !recentRoots.has(c.root));
            if (filtered.length > 5) { // Only filter if we have enough left
                availableCandidates = filtered;
            }
        }
        
        // If no subrace filtering, use random selection
        if (subrace === 'high-elf') {
            return this._randomElement(availableCandidates);
        }
        
        // Determine preferred tag based on subrace
        const preferredTag = subrace === 'sun-elf' ? 'sun' : 
                            subrace === 'moon-elf' ? 'moon' : 
                            subrace === 'wood-elf' ? 'wood' :
                            subrace === 'drow-female' ? 'drow-female' :
                            subrace === 'drow-male' ? 'drow-male' : null;
        
        if (!preferredTag) {
            return this._randomElement(availableCandidates);
        }
        
        // Filter components by preferred tag
        const preferred = availableCandidates.filter(c => c.tags && c.tags.includes(preferredTag));
        const neutral = availableCandidates.filter(c => c.tags && c.tags.includes('neutral'));
        const other = availableCandidates.filter(c => !c.tags || (!c.tags.includes(preferredTag) && !c.tags.includes('neutral')));
        
        // Weighted random selection
        // Drow use ONLY their specific components (no neutral fallback for authenticity)
        // 90% chance preferred, 10% chance other drow components
        if (subrace === 'drow-female' || subrace === 'drow-male') {
            const drow = availableCandidates.filter(c => c.tags && c.tags.includes('drow'));
            if (Math.random() < 0.9 && preferred.length > 0) {
                return this._randomElement(preferred);
            } else if (drow.length > 0) {
                return this._randomElement(drow);
            }
            return this._randomElement(availableCandidates);
        }
        
        // Standard weighting for other subraces
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
        return this._randomElement(availableCandidates);
    }
}