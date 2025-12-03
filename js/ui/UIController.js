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
        this.speechSynthesis = null;
        this.currentUtterance = null;
        this._initSpeechSynthesis();
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
            namePronunciation: document.getElementById('namePronunciation'),
            speakerBtn: document.getElementById('speakerBtn'),
            speakerContainer: document.getElementById('speakerContainer'),
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
        
        // Build stacked meaning display
        const stackedMeaning = this._buildStackedMeaning(nameData.meaning);
        this.elements.nameMeaning.innerHTML = stackedMeaning;
        
        // Display pronunciation if available
        if (nameData.pronunciation) {
            this.elements.namePronunciation.textContent = nameData.pronunciation;
            this.elements.namePronunciation.classList.remove('hidden');
            if (this.elements.speakerContainer) {
                this.elements.speakerContainer.style.display = 'flex';
            }
            if (this.elements.speakerBtn) {
                this.elements.speakerBtn.setAttribute('data-name', nameData.name);
            }
        } else {
            this.elements.namePronunciation.classList.add('hidden');
            if (this.elements.speakerContainer) {
                this.elements.speakerContainer.style.display = 'none';
            }
        }
        
        // Announce to screen readers (use plain text version)
        const plainMeaning = nameData.meaning.replace(/,/g, ' or');
        const ariaLabel = nameData.pronunciation 
            ? `Generated name: ${nameData.name}, pronounced: ${nameData.pronunciation}, meaning: ${plainMeaning}`
            : `Generated name: ${nameData.name}, meaning: ${plainMeaning}`;
        this.elements.result.setAttribute('aria-label', ariaLabel);
        
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
     * Build stacked meaning display
     * @param {string} meaning - Meaning string with + separators
     * @returns {string} HTML with stacked meanings
     * @private
     */
    _buildStackedMeaning(meaning) {
        // Split by + to get each component's meaning
        const parts = meaning.split(' + ');
        
        const stackedParts = parts.map(part => {
            // Split by comma to get alternatives
            const alternatives = part.split(',').map(s => s.trim());
            
            // Build a vertical stack
            const optionsHTML = alternatives
                .map(alt => `<span class="meaning-option">${alt}</span>`)
                .join('');
            
            return `<span class="meaning-stack">${optionsHTML}</span>`;
        });
        
        // Join with + separator (quotes now added via CSS ::before/::after)
        return stackedParts.join('<span class="meaning-separator">+</span>');
    }
    
    /**
     * Display component breakdown
     * @private
     */
    _displayBreakdown(nameData) {
        const { syllables } = nameData;
        
        let html = '';
        
        // Check if this is a complex mode name (has components array)
        if (nameData.components && nameData.components.length > 0) {
            // Complex mode - display all components
            let connectorIndex = 0;
            
            for (let i = 0; i < nameData.components.length; i++) {
                const comp = nameData.components[i];
                const cleanMeaning = comp.meaning.replace(/\s*\/\s*/g, ', ');
                
                html += `<div class="component">
                    <span class="component-label">Component ${i + 1}:</span> 
                    ${comp.component.prefix_text || comp.component.suffix_text} (${cleanMeaning})
                </div>`;
                
                // Add connector if exists
                if (i < nameData.components.length - 1 && 
                    nameData.connectors && 
                    connectorIndex < nameData.connectors.length) {
                    const conn = nameData.connectors[connectorIndex];
                    html += `<div class="component">
                        <span class="component-label">Connector:</span> 
                        ${conn.connector.text}`;
                    
                    if (conn.connector.meaning) {
                        html += ` (${conn.connector.meaning})`;
                    }
                    
                    html += `</div>`;
                    connectorIndex++;
                }
            }
        } else {
            // Standard mode - display prefix and suffix
            const { prefix, connector, suffix } = nameData;
            
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
                    ${connector.text}`;
                
                if (connector.meaning) {
                    html += ` (${connector.meaning})`;
                }
                
                html += `</div>`;
            }
            
            // Suffix
            const cleanSuffixMeaning = suffix.suffix_meaning.replace(/\s*\/\s*/g, ', ');
            html += `<div class="component">
                <span class="component-label">Suffix:</span> 
                ${suffix.suffix_text} (${cleanSuffixMeaning})
            </div>`;
        }
        
        // Syllables
        html += `<div class="component">
            <span class="component-label">Syllables:</span> 
            ${syllables}
        </div>`;
        
        // Interchangeability note (only for standard mode)
        if (!nameData.components) {
            const { prefix, suffix } = nameData;
            const isInterchangeable = prefix.can_be_suffix && suffix.can_be_prefix;
            html += `<div class="component">
                <span class="component-label">Interchangeable:</span> 
                ${isInterchangeable ? 'Yes - components can swap positions' : 'No - follows role/gender rules'}
            </div>`;
        }
        
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
            'moon-elf': 'Names emphasizing Silver, Moonlight, Stars, and Flow (lyrical, 4+ syllables)',
            'wood-elf': 'Short, strong names (2-3 syllables) emphasizing Nature, Vigilance, and Martial Skill',
            'drow': 'Gender-specific harsh names - Female: complex/powerful (4-6 syl), Male: short/martial (2-3 syl) - Use Gender selector below'
        };
        
        if (this.elements.subraceDescription) {
            this.elements.subraceDescription.textContent = descriptions[subrace] || descriptions['high-elf'];
        }
    }
    
    /**
     * Initialize speech synthesis and set up speaker button event listener
     * @private
     */
    _initSpeechSynthesis() {
        // Check if browser supports speech synthesis
        if ('speechSynthesis' in window) {
            try {
                this.speechSynthesis = window.speechSynthesis;
                
                // Load voices (some browsers need this)
                if (this.speechSynthesis.getVoices().length === 0) {
                    this.speechSynthesis.addEventListener('voiceschanged', () => {
                        // Voices loaded
                    });
                }
                
                // Set up speaker button click handler
                if (this.elements.speakerBtn) {
                    this.elements.speakerBtn.addEventListener('click', () => {
                        // If already speaking, stop it
                        if (this.speechSynthesis.speaking) {
                            this.speechSynthesis.cancel();
                            this.elements.speakerBtn.classList.remove('speaking');
                            this.elements.speakerBtn.setAttribute('aria-label', 'Pronounce name');
                        } else {
                            this._speakName();
                        }
                    });
                }
            } catch (error) {
                console.error('Error initializing speech synthesis:', error);
                // Hide speaker button on error
                if (this.elements.speakerContainer) {
                    this.elements.speakerContainer.style.display = 'none';
                }
            }
        } else {
            // Hide speaker button if not supported
            if (this.elements.speakerContainer) {
                this.elements.speakerContainer.style.display = 'none';
            }
        }
    }
    
    /**
     * Convert phonetic pronunciation guide to TTS-friendly spelling
     * Converts phonetic notation to actual spellings that TTS engines can recognize
     * @param {string} phonetic - Phonetic guide like "Ahn-ih-rah-drihth"
     * @returns {string} TTS-friendly spelling that sounds like the phonetic guide
     * @private
     */
    _convertPhoneticToTTS(phonetic) {
        if (!phonetic) return '';
        
        // Split by hyphens to get syllables
        const syllables = phonetic.split('-').map(s => s.trim().toLowerCase());
        
        // Convert each syllable from phonetic notation to readable spelling
        const convertedSyllables = syllables.map(syllable => {
            let converted = syllable;
            
            // Map phonetic sounds to TTS-friendly spellings
            // Based on the guide: A="ah", E="eh", I="ee", O="oh", U="oo"
            
            // Handle "ahn" -> "an" (TTS will read "an" close to "ahn")
            converted = converted.replace(/ahn/g, 'an');
            
            // Handle "ah" at end or standalone -> "a"
            converted = converted.replace(/ah$/g, 'a');
            converted = converted.replace(/^ah([^a-z])/g, 'a$1');
            
            // Handle "ahl" -> "al"
            converted = converted.replace(/ahl/g, 'al');
            
            // Handle "ahm" -> "am"
            converted = converted.replace(/ahm/g, 'am');
            
            // Handle "ahr" -> "ar"
            converted = converted.replace(/ahr/g, 'ar');
            
            // Handle "ehl" -> "el" (final e pronounced "eh")
            converted = converted.replace(/ehl/g, 'el');
            
            // Handle "eh" at end -> "e"
            converted = converted.replace(/eh$/g, 'e');
            
            // Handle "ehn" -> "en"
            converted = converted.replace(/ehn/g, 'en');
            
            // Handle "eem" -> "em"
            converted = converted.replace(/ehm/g, 'em');
            
            // Handle "ih" -> "i" (short i sound like "bit")
            converted = converted.replace(/ih([^a-z]|$)/g, 'i$1');
            
            // Handle "ihr" -> "ir"
            converted = converted.replace(/ihr/g, 'ir');
            
            // Handle "ihl" -> "il"
            converted = converted.replace(/ihl/g, 'il');
            
            // Handle "ihn" -> "in"
            converted = converted.replace(/ihn/g, 'in');
            
            // Handle "ihm" -> "im"
            converted = converted.replace(/ihm/g, 'im');
            
            // Handle "drihth" -> "drith"
            converted = converted.replace(/drihth/g, 'drith');
            
            // Handle "rihth" -> "rith"
            converted = converted.replace(/rihth/g, 'rith');
            
            // Handle "lihth" -> "lith"
            converted = converted.replace(/lihth/g, 'lith');
            
            // Handle "th" endings - keep as "th"
            // (already handled above for specific cases)
            
            // Handle "rah" -> "ra" (sounds like "rah")
            converted = converted.replace(/rah([^a-z]|$)/g, 'ra$1');
            
            // Handle "lah" -> "la" 
            converted = converted.replace(/lah([^a-z]|$)/g, 'la$1');
            
            // Handle "nah" -> "na"
            converted = converted.replace(/nah([^a-z]|$)/g, 'na$1');
            
            // Handle "mah" -> "ma"
            converted = converted.replace(/mah([^a-z]|$)/g, 'ma$1');
            
            // Handle "sah" -> "sa"
            converted = converted.replace(/sah([^a-z]|$)/g, 'sa$1');
            
            // Handle "tah" -> "ta"
            converted = converted.replace(/tah([^a-z]|$)/g, 'ta$1');
            
            // Handle "dah" -> "da"
            converted = converted.replace(/dah([^a-z]|$)/g, 'da$1');
            
            // Handle "oh" -> "o"
            converted = converted.replace(/oh([^a-z]|$)/g, 'o$1');
            converted = converted.replace(/ohn/g, 'on');
            converted = converted.replace(/ohl/g, 'ol');
            converted = converted.replace(/ohr/g, 'or');
            
            // Keep "ee" for long e sound
            // Keep "oo" for long u sound
            // Keep "ay" for diphthong
            // Keep "ow" for diphthong
            
            return converted;
        });
        
        // Join syllables together (no spaces) so TTS reads it as one word
        // This prevents letter-by-letter reading
        let result = convertedSyllables.join('');
        
        // Capitalize first letter for proper noun treatment
        if (result.length > 0) {
            result = result.charAt(0).toUpperCase() + result.slice(1);
        }
        
        return result;
    }
    
    /**
     * Speak the generated name using Web Speech API
     * @private
     */
    _speakName() {
        // Check if speech synthesis is available
        if (!('speechSynthesis' in window)) {
            this.showNotification('Speech synthesis is not supported in your browser.', 'error');
            return;
        }
        
        if (!this.speechSynthesis) {
            this.speechSynthesis = window.speechSynthesis;
        }
        
        if (!this.currentName) {
            this.showNotification('No name available to pronounce.', 'error');
            return;
        }
        
        try {
            // Stop any current speech
            this.speechSynthesis.cancel();
            
            // Get the name to speak - use phonetic guide if available for better pronunciation
            let nameToSpeak = this.currentName.name;
            
            // If we have a phonetic guide, try to use it for better pronunciation
            // The Web Speech API doesn't support phonetic notation directly, but we can
            // use the phonetic guide to create a more phonetically accurate spelling
            if (this.currentName.pronunciation) {
                const phoneticTTS = this._convertPhoneticToTTS(this.currentName.pronunciation);
                // Use phonetic version if conversion was successful and different from original
                if (phoneticTTS && phoneticTTS !== this.currentName.name) {
                    nameToSpeak = phoneticTTS;
                }
            }
            
            // Create utterance
            const utterance = new SpeechSynthesisUtterance(nameToSpeak);
            
            // Configure voice settings for better pronunciation
            utterance.rate = 0.75; // Slower for clarity with phonetic spelling
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // Try to find a suitable voice (prefer English voices)
            const voices = this.speechSynthesis.getVoices();
            const preferredVoices = voices.filter(voice => 
                voice.lang.startsWith('en') && voice.localService
            );
            
            if (preferredVoices.length > 0) {
                // Prefer a female voice for elven names (more melodic)
                const femaleVoice = preferredVoices.find(voice => 
                    voice.name.toLowerCase().includes('female') || 
                    voice.name.toLowerCase().includes('zira') ||
                    voice.name.toLowerCase().includes('samantha')
                );
                utterance.voice = femaleVoice || preferredVoices[0];
            }
            
            // Update button state
            if (this.elements.speakerBtn) {
                this.elements.speakerBtn.classList.add('speaking');
                this.elements.speakerBtn.setAttribute('aria-label', 'Stop pronunciation');
            }
            
            // Handle speech end
            utterance.onend = () => {
                if (this.elements.speakerBtn) {
                    this.elements.speakerBtn.classList.remove('speaking');
                    this.elements.speakerBtn.setAttribute('aria-label', 'Pronounce name');
                }
                this.currentUtterance = null;
            };
            
            // Handle speech error
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                
                // Show user-friendly error message
                let errorMessage = 'Unable to pronounce name.';
                if (event.error === 'network') {
                    errorMessage = 'Network error. Please check your connection.';
                } else if (event.error === 'synthesis-failed') {
                    errorMessage = 'Speech synthesis failed. Please try again.';
                } else if (event.error === 'synthesis-unavailable') {
                    errorMessage = 'Speech synthesis is unavailable.';
                } else if (event.error === 'audio-busy') {
                    errorMessage = 'Audio system is busy. Please try again in a moment.';
                } else if (event.error === 'not-allowed') {
                    errorMessage = 'Speech synthesis is not allowed. Please check browser permissions.';
                }
                
                this.showNotification(errorMessage, 'error');
                
                if (this.elements.speakerBtn) {
                    this.elements.speakerBtn.classList.remove('speaking');
                    this.elements.speakerBtn.setAttribute('aria-label', 'Pronounce name');
                }
                this.currentUtterance = null;
            };
            
            // Store current utterance and speak
            this.currentUtterance = utterance;
            this.speechSynthesis.speak(utterance);
            
        } catch (error) {
            console.error('Error speaking name:', error);
            this.showNotification('An error occurred while trying to pronounce the name.', 'error');
            
            if (this.elements.speakerBtn) {
                this.elements.speakerBtn.classList.remove('speaking');
                this.elements.speakerBtn.setAttribute('aria-label', 'Pronounce name');
            }
            this.currentUtterance = null;
        }
    }
}