// UI Controller for the Espruar Name Generator
import { FINAL_VOWELS } from '../config.js';
import * as phonetics from '../utils/phonetics.js';

/**
 * Handles all DOM manipulation and user interactions
 */
export class UIController {
    constructor() {
        this.elements = this._cacheElements();
        this.currentName = null;
    }
    
    /**
     * Cache all DOM elements for performance
     * @private
     */
    _cacheElements() {
        return {
            // Controls
            subraceSelect: document.getElementById('subrace'),
            subraceDescription: document.getElementById('subraceDescription'),
            complexitySelect: document.getElementById('complexity'),
            syllablesInput: document.getElementById('syllables'),
            styleSelect: document.getElementById('style'),
            generateBtn: document.querySelector('.generate-btn'),
            
            // Result display
            result: document.getElementById('result'),
            generatedName: document.getElementById('generatedName'),
            nameMeaning: document.getElementById('nameMeaning'),
            breakdown: document.getElementById('breakdown'),
            
            // Vowel suggestions
            vowelSuggestionsContainer: document.getElementById('vowelSuggestionsContainer'),
            vowelOptions: document.getElementById('vowelOptions'),
            
            // Action buttons
            saveFavoriteBtn: document.querySelector('[onclick="saveFavorite()"]'),
            generateAnotherBtn: document.querySelector('[onclick="generateName()"]'),
            
            // Favorites
            favoritesList: document.getElementById('favoritesList')
        };
    }
    
    /**
     * Get current user preferences from controls
     * @returns {Object}
     */
    getPreferences() {
        return {
            subrace: this.elements.subraceSelect.value,
            complexity: this.elements.complexitySelect.value,
            targetSyllables: parseInt(this.elements.syllablesInput.value),
            style: this.elements.styleSelect.value
        };
    }
    
    /**
     * Display generated name
     * @param {Object} nameData - Generated name data
     */
    displayName(nameData) {
        this.currentName = nameData;
        
        // Update name display
        this.elements.generatedName.textContent = nameData.name;
        this.elements.nameMeaning.textContent = `"${nameData.meaning}"`;
        
        // Announce to screen readers
        this.elements.result.setAttribute(
            'aria-label',
            `Generated name: ${nameData.name}, meaning: ${nameData.meaning}`
        );
        
        // Update breakdown
        this._displayBreakdown(nameData);
        
        // Handle vowel suggestions
        const preferences = this.getPreferences();
        if (phonetics.shouldSuggestFinalVowel(
            nameData.name,
            nameData.syllables,
            preferences.targetSyllables
        )) {
            this._displayVowelSuggestions(nameData);
        } else {
            this.elements.vowelSuggestionsContainer.classList.add('hidden');
        }
    }
    
    /**
     * Display component breakdown
     * @private
     */
    _displayBreakdown(nameData) {
        const { prefix, connector, suffix, syllables } = nameData;
        
        let html = '';
        
        // Prefix
        const cleanPrefixMeaning = prefix.prefix_meaning.replace(/\s*\/\s*/g, ', ');
        html += `<div class="component">
            <span class="component-label">Prefix:</span> 
            ${prefix.prefix_text} (${cleanPrefixMeaning})
        </div>`;
        
        // Connector (if used)
        if (connector) {
            html += `<div class="component">
                <span class="component-label">Connector:</span> 
                ${connector.text}
            </div>`;
        }
        
        // Suffix
        const cleanSuffixMeaning = suffix.suffix_meaning.replace(/\s*\/\s*/g, ', ');
        html += `<div class="component">
            <span class="component-label">Suffix:</span> 
            ${suffix.suffix_text} (${cleanSuffixMeaning})
        </div>`;
        
        // Syllables
        html += `<div class="component">
            <span class="component-label">Syllables:</span> 
            ${syllables}
        </div>`;
        
        // Interchangeability note
        const isInterchangeable = prefix.can_be_suffix && suffix.can_be_prefix;
        html += `<div class="component">
            <span class="component-label">Interchangeable:</span> 
            ${isInterchangeable ? 'Yes - components can swap positions' : 'No - follows role/gender rules'}
        </div>`;
        
        this.elements.breakdown.innerHTML = html;
    }
    
    /**
     * Display vowel suggestions
     * @private
     */
    _displayVowelSuggestions(nameData) {
        const vowelOptionsHTML = FINAL_VOWELS.map(v => `
            <div class="vowel-option" data-vowel="${v.vowel}">
                <span class="vowel-option-name">${nameData.name}${v.vowel}</span>
                <span class="vowel-option-tone">${v.tone}</span>
            </div>
        `).join('');
        
        this.elements.vowelOptions.innerHTML = vowelOptionsHTML;
        this.elements.vowelSuggestionsContainer.classList.remove('hidden');
    }
    
    /**
     * Apply a final vowel to the current name
     * @param {string} vowel - Vowel to apply
     */
    applyFinalVowel(vowel) {
        if (!this.currentName) return;
        
        const newName = this.currentName.baseForm + vowel;
        const newSyllables = phonetics.countSyllables(newName);
        
        // Update current name
        this.currentName.name = newName;
        this.currentName.syllables = newSyllables;
        this.currentName.finalVowel = vowel;
        
        // Update display
        this.elements.generatedName.textContent = newName;
        
        // Update breakdown with final vowel info
        const vowelInfo = FINAL_VOWELS.find(v => v.vowel === vowel);
        let html = this.elements.breakdown.innerHTML;
        
        // Insert final vowel info before syllables
        const syllablesDiv = html.lastIndexOf('<div class="component"><span class="component-label">Syllables:');
        if (syllablesDiv !== -1) {
            const finalVowelHTML = `<div class="component">
                <span class="component-label">Final Vowel:</span> 
                -${vowel} (${vowelInfo.tone})
            </div>`;
            html = html.slice(0, syllablesDiv) + finalVowelHTML + html.slice(syllablesDiv);
        }
        
        // Update syllable count
        html = html.replace(
            /(<span class="component-label">Syllables:<\/span>\s+)\d+/,
            `$1${newSyllables}`
        );
        
        this.elements.breakdown.innerHTML = html;
        
        // Hide vowel suggestions
        this.elements.vowelSuggestionsContainer.classList.add('hidden');
    }
    
    /**
     * Get current name data
     * @returns {Object|null}
     */
    getCurrentName() {
        return this.currentName;
    }
    
    /**
     * Display favorites list
     * @param {Array} favorites - Array of favorite names
     */
    displayFavorites(favorites) {
        if (!favorites || favorites.length === 0) {
            this.elements.favoritesList.className = 'empty-favorites';
            this.elements.favoritesList.textContent = 'No favorites saved yet. Generate and save names you like!';
            return;
        }
        
        this.elements.favoritesList.className = '';
        this.elements.favoritesList.innerHTML = favorites.map((fav, index) => `
            <div class="favorite-item">
                <span class="favorite-name">${fav.name}</span>
                <span class="favorite-meaning">"${fav.meaning}"</span>
                <button class="remove-btn" data-index="${index}" aria-label="Remove ${fav.name} from favorites">
                    Remove
                </button>
            </div>
        `).join('');
    }
    
    /**
     * Show a notification message
     * @param {string} message - Message to display
     * @param {string} type - Type of message ('success', 'error', 'info')
     */
    showNotification(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Remove after animation completes
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    /**
     * Update the subrace description text
     * @param {string} subrace - Selected subrace
     */
    updateSubraceDescription(subrace) {
        const descriptions = {
            'high-elf': 'Balanced names drawing from all High Elf traditions',
            'sun-elf': 'Names emphasizing Gold, Light, Nobility, and Ancient Lore (formal, 3-5 syllables)',
            'moon-elf': 'Names emphasizing Silver, Moonlight, Stars, and Flow (lyrical, 4+ syllables)'
        };
        
        if (this.elements.subraceDescription) {
            this.elements.subraceDescription.textContent = descriptions[subrace] || descriptions['high-elf'];
        }
    }
}