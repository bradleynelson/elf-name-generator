// UI Controller for the Espruar Name Generator
import { FINAL_VOWELS, GENDER_PREFIX_VOWELS } from '../config.js';
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
        this.currentFilter = 'all'; // Default filter
        this._initSpeechSynthesis();
        this._initFavoritesFilter();
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
            
            // Modifier suggestions (combined gender prefix + final vowel)
            modifierSuggestionsContainer: document.getElementById('modifierSuggestionsContainer'),
            genderPrefixSection: document.getElementById('genderPrefixSection'),
            genderPrefixOptions: document.getElementById('genderPrefixOptions'),
            finalVowelSection: document.getElementById('finalVowelSection'),
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
     * @param {string} generatorType - 'elven', 'dwarven', 'gnomish', 'halfling', or 'orc'
     * @returns {Object}
     */
    getPreferences(generatorType = 'elven') {
        if (generatorType === 'dwarven') {
            const subraceSelect = document.getElementById('dwarvenSubrace');
            const nameTypeSelect = document.getElementById('dwarvenNameType');
            const genderSelect = document.getElementById('dwarvenGender');
            
            return {
                subrace: subraceSelect ? subraceSelect.value : 'general',
                nameType: nameTypeSelect ? nameTypeSelect.value : 'full',
                gender: genderSelect ? genderSelect.value : 'neutral'
            };
        } else if (generatorType === 'gnomish') {
            const subraceSelect = document.getElementById('gnomishSubrace');
            const nameTypeSelect = document.getElementById('gnomishNameType');
            const genderSelect = document.getElementById('gnomishGender');
            const nameType = nameTypeSelect ? nameTypeSelect.value : 'full';
            return {
                subrace: subraceSelect ? subraceSelect.value : 'rock',
                nameType,
                gender: genderSelect ? genderSelect.value : 'neutral',
                includeNickname: nameType === 'full' ? true : nameType === 'full-no-nickname' ? false : true
            };
        } else if (generatorType === 'halfling') {
            const subraceSelect = document.getElementById('halflingSubrace');
            const nameTypeSelect = document.getElementById('halflingNameType');
            const genderSelect = document.getElementById('halflingGender');
            const nameType = nameTypeSelect ? nameTypeSelect.value : 'full';
            const includeNickname = nameType === 'full' || nameType === 'full-with-nickname';
            return {
                subrace: subraceSelect ? subraceSelect.value : 'lightfoot',
                nameType,
                gender: genderSelect ? genderSelect.value : 'neutral',
                includeNickname
            };
        } else if (generatorType === 'orc') {
            const nameTypeSelect = document.getElementById('orcNameType');
            const genderSelect = document.getElementById('orcGender');
            const nameType = nameTypeSelect ? nameTypeSelect.value : 'full';
            const includeEpithet = nameType === 'full' || nameType === 'full-with-epithet';
            return {
                subrace: 'orc',
                nameType,
                gender: genderSelect ? genderSelect.value : 'neutral',
                includeEpithet
            };
        } else {
            return {
                subrace: this.elements.subraceSelect ? this.elements.subraceSelect.value : 'high-elf',
                complexity: this.elements.complexitySelect ? this.elements.complexitySelect.value : 'auto',
                targetSyllables: this.elements.syllablesInput ? parseInt(this.elements.syllablesInput.value) : 4,
                style: this.elements.styleSelect ? this.elements.styleSelect.value : 'neutral'
            };
        }
    }
    
    /**
     * Display generated name
     * @param {Object} nameData - Generated name data
     * @param {string} generatorType - 'elven' or 'dwarven'
     */
    displayName(nameData, generatorType = 'elven') {
        this.currentName = nameData;
        
        // Update name display
        this.elements.generatedName.textContent = nameData.name;
        
        // Build stacked meaning display
        if (generatorType === 'dwarven' && nameData.firstName && nameData.clanName) {
            // For Dwarven full names, don't use + separator between first and clan
            const firstNameMeaning = this._buildStackedMeaning(nameData.firstName.meaning);
            const clanNameMeaning = this._buildStackedMeaning(nameData.clanName.meaning);
            this.elements.nameMeaning.innerHTML = firstNameMeaning + '<span class="meaning-separator"> </span>' + clanNameMeaning;
        } else {
            const stackedMeaning = this._buildStackedMeaning(nameData.meaning);
            this.elements.nameMeaning.innerHTML = stackedMeaning;
        }
        
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
        if (generatorType === 'elven') {
            this._displayBreakdown(nameData);
        } else if (generatorType === 'dwarven') {
            this._displayDwarvenBreakdown(nameData);
        } else if (generatorType === 'gnomish') {
            this._displayGnomishBreakdown(nameData);
        } else if (generatorType === 'halfling') {
            this._displayHalflingBreakdown(nameData);
        } else if (generatorType === 'orc') {
            this._displayOrcBreakdown(nameData);
        }
        
        // Handle modifier suggestions (Elven only)
        if (generatorType === 'elven') {
            const preferences = this.getPreferences('elven');
            const showGenderPrefix = phonetics.shouldSuggestGenderPrefix(nameData);
            const showFinalVowel = phonetics.shouldSuggestFinalVowel(
                nameData.name,
                nameData.syllables,
                preferences.targetSyllables
            );
            
            // Show combined container if either modifier should be displayed
            if (showGenderPrefix || showFinalVowel) {
                this._displayModifierSuggestions(nameData, showGenderPrefix, showFinalVowel);
            } else {
                // Hide entire modifier container
                if (this.elements.modifierSuggestionsContainer) {
                    this.elements.modifierSuggestionsContainer.classList.add('hidden');
                }
            }
        } else {
            // Hide modifiers for non-elven
            if (this.elements.modifierSuggestionsContainer) {
                this.elements.modifierSuggestionsContainer.classList.add('hidden');
            }
        }
    }
    
    /**
     * Display Dwarven name breakdown
     * @private
     */
    _displayDwarvenBreakdown(nameData) {
        if (!this.elements.breakdown) return;
        
        let html = '';
        
        if (nameData.nameType === 'full' && nameData.firstName && nameData.clanName) {
            // Full name breakdown
            html += `<div class="component">
                <span class="component-label">First Name:</span> 
                ${nameData.firstName.prefix.prefix_text}${nameData.firstName.suffix.suffix_text} 
                (${nameData.firstName.meaning})
            </div>`;
            html += `<div class="component">
                <span class="component-label">Clan Name:</span> 
                ${nameData.clanName.prefix.prefix_text}${nameData.clanName.suffix.suffix_text} 
                (${nameData.clanName.meaning})
            </div>`;
        } else if (nameData.firstName) {
            // First name only
            html += `<div class="component">
                <span class="component-label">Prefix:</span> 
                ${nameData.firstName.prefix.prefix_text} (${nameData.firstName.prefix.prefix_meaning})
            </div>`;
            html += `<div class="component">
                <span class="component-label">Suffix:</span> 
                ${nameData.firstName.suffix.suffix_text} (${nameData.firstName.suffix.suffix_meaning})
            </div>`;
        } else if (nameData.clanName) {
            // Clan name only
            html += `<div class="component">
                <span class="component-label">Prefix:</span> 
                ${nameData.clanName.prefix.prefix_text} (${nameData.clanName.prefix.prefix_meaning})
            </div>`;
            html += `<div class="component">
                <span class="component-label">Suffix:</span> 
                ${nameData.clanName.suffix.suffix_text} (${nameData.clanName.suffix.suffix_meaning})
            </div>`;
        }
        
        // Add syllables if available
        if (nameData.syllables !== undefined) {
            html += `<div class="component">
                <span class="component-label">Syllables:</span> 
                ${nameData.syllables}
            </div>`;
        }
        
        this.elements.breakdown.innerHTML = html;
    }

    /**
     * Display Gnomish name breakdown
     * @private
     */
    _displayGnomishBreakdown(nameData) {
        if (!this.elements.breakdown || !nameData.breakdown) return;
        const { personal, nickname, clan } = nameData.breakdown;
        let html = '';
        if (personal) {
            html += `<div class="component"><span class="component-label">Personal:</span> ${personal.name} <span class="component-meaning">(${personal.meaning || ''})</span></div>`;
        }
        if (nickname && nickname.text) {
            html += `<div class="component"><span class="component-label">Nickname:</span> "${nickname.text}" <span class="component-meaning">(${nickname.meaning || ''})</span></div>`;
        }
        if (clan) {
            html += `<div class="component"><span class="component-label">Clan:</span> ${clan.name} <span class="component-meaning">(${clan.meaning || ''})</span></div>`;
        }
        this.elements.breakdown.innerHTML = html;
    }
    
    /**
     * Display Halfling name breakdown
     * @private
     */
    _displayHalflingBreakdown(nameData) {
        if (!this.elements.breakdown || !nameData.breakdown) return;
        const { personal, family, nickname } = nameData.breakdown;
        let html = '';
        if (personal) {
            html += `<div class="component"><span class="component-label">Personal:</span> ${personal.text} <span class="component-meaning">(${personal.meaning || ''})</span></div>`;
        }
        if (family) {
            html += `<div class="component"><span class="component-label">Family:</span> ${family.text} <span class="component-meaning">(${family.meaning || ''})</span></div>`;
        }
        if (nickname && nickname.text) {
            html += `<div class="component"><span class="component-label">Nickname:</span> "${nickname.text}" <span class="component-meaning">(${nickname.meaning || ''})</span></div>`;
        }
        this.elements.breakdown.innerHTML = html;
    }

    /**
     * Display Orc name breakdown
     * @private
     */
    _displayOrcBreakdown(nameData) {
        if (!this.elements.breakdown || !nameData.breakdown) return;
        const { personal, epithet } = nameData.breakdown;
        let html = '';
        if (personal) {
            html += `<div class="component"><span class="component-label">Personal:</span> ${personal.text} <span class="component-meaning">(${personal.meaning || ''})</span></div>`;
        }
        if (epithet && epithet.text) {
            const display = epithet.displayText || epithet.text;
            html += `<div class="component"><span class="component-label">Epithet:</span> ${display} <span class="component-meaning">(${epithet.meaning || ''})</span></div>`;
        }
        this.elements.breakdown.innerHTML = html;
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
     * Display modifier suggestions (combined gender prefix + final vowel)
     * @private
     */
    _displayModifierSuggestions(nameData, showGenderPrefix, showFinalVowel) {
        // Populate gender prefix section
        if (showGenderPrefix) {
            const genderPrefixOptionsHTML = GENDER_PREFIX_VOWELS.map(v => `
                <div class="vowel-option" data-vowel="${v.vowel}">
                    <span class="vowel-option-name">${v.vowel}${nameData.name.toLowerCase()}</span>
                    <span class="vowel-option-tone">${v.note}</span>
                </div>
            `).join('');
            
            if (this.elements.genderPrefixOptions) {
                this.elements.genderPrefixOptions.innerHTML = genderPrefixOptionsHTML;
            }
            if (this.elements.genderPrefixSection) {
                this.elements.genderPrefixSection.classList.remove('hidden');
            }
        } else {
            if (this.elements.genderPrefixSection) {
                this.elements.genderPrefixSection.classList.add('hidden');
            }
        }
        
        // Populate final vowel section
        if (showFinalVowel) {
            const vowelOptionsHTML = FINAL_VOWELS.map(v => `
                <div class="vowel-option" data-vowel="${v.vowel}">
                    <span class="vowel-option-name">${nameData.name}${v.vowel}</span>
                    <span class="vowel-option-tone">${v.tone} (Final Vowel)</span>
                </div>
            `).join('');
            
            if (this.elements.vowelOptions) {
                this.elements.vowelOptions.innerHTML = vowelOptionsHTML;
            }
            if (this.elements.finalVowelSection) {
                this.elements.finalVowelSection.classList.remove('hidden');
            }
        } else {
            if (this.elements.finalVowelSection) {
                this.elements.finalVowelSection.classList.add('hidden');
            }
        }
        
        // Show the combined container
        if (this.elements.modifierSuggestionsContainer) {
            this.elements.modifierSuggestionsContainer.classList.remove('hidden');
        }
    }
    
    /**
     * Apply a gender prefix vowel to the current name
     * @param {string} vowel - Vowel to apply
     */
    applyGenderPrefix(vowel) {
        if (!this.currentName) return;
        
        const baseForm = this.currentName.baseForm || this.currentName.name;
        const newName = vowel + baseForm.toLowerCase();
        const newSyllables = phonetics.countSyllables(newName);
        
        // Update current name
        this.currentName.name = newName;
        this.currentName.syllables = newSyllables;
        this.currentName.genderPrefixVowel = vowel;
        
        // Update display
        this.elements.generatedName.textContent = newName;
        
        // Update breakdown with gender prefix info
        const vowelInfo = GENDER_PREFIX_VOWELS.find(v => v.vowel === vowel);
        let html = this.elements.breakdown.innerHTML;
        
        // Insert gender prefix info after the title
        const firstComponent = html.indexOf('<div class="component">');
        if (firstComponent !== -1) {
            const genderPrefixHTML = `<div class="component">
                <span class="component-label">Gender Prefix:</span> 
                ${vowel}- (${vowelInfo ? vowelInfo.note : 'Gender marker'})
            </div>`;
            html = html.slice(0, firstComponent) + genderPrefixHTML + html.slice(firstComponent);
        }
        
        // Update syllable count
        html = html.replace(
            /(<span class="component-label">Syllables:<\/span>\s+)\d+/,
            `$1${newSyllables}`
        );
        
        this.elements.breakdown.innerHTML = html;
        
        // Hide entire modifier suggestions
        if (this.elements.modifierSuggestionsContainer) {
            this.elements.modifierSuggestionsContainer.classList.add('hidden');
        }
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
        
        // Hide entire modifier suggestions
        if (this.elements.modifierSuggestionsContainer) {
            this.elements.modifierSuggestionsContainer.classList.add('hidden');
        }
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
        
        // Filter favorites based on current filter
        const filteredFavorites = this.currentFilter === 'all' 
            ? favorites 
            : favorites.filter(fav => (fav.generatorType || 'elven') === this.currentFilter);
        
        if (filteredFavorites.length === 0) {
            this.elements.favoritesList.className = 'empty-favorites';
            const filterNameMap = {
                'elven': 'Elven',
                'dwarven': 'Dwarven',
                'gnomish': 'Gnomish',
                'halfling': 'Halfling'
            };
            const filterName = filterNameMap[this.currentFilter] || 'selected';
            this.elements.favoritesList.textContent = `No ${filterName} favorites saved yet.`;
            return;
        }
        
        this.elements.favoritesList.className = '';
        this.elements.favoritesList.innerHTML = filteredFavorites.map((fav, _index) => {
            const type = fav.generatorType || 'elven';
            const generatorIcon = {
                'elven': '✨',
                'dwarven': '⚒️',
                'gnomish': '🛠️',
                'halfling': '🗡️',
                'orc': '⚔️'
            }[type] || '⚔️';
            const generatorLabel = {
                'elven': 'Elven',
                'dwarven': 'Dwarven',
                'gnomish': 'Gnomish',
                'halfling': 'Halfling',
                'orc': 'Orc'
            }[type] || 'Elven';
            // Use original index from unfiltered array for correct removal
            const originalIndex = favorites.indexOf(fav);
            
            return `
            <div class="favorite-item" data-generator-type="${fav.generatorType || 'elven'}">
                <span class="favorite-type-badge" title="${generatorLabel} name">${generatorIcon}</span>
                <span class="favorite-name">${fav.name}</span>
                <span class="favorite-meaning">"${fav.meaning}"</span>
                <button class="remove-btn" data-index="${originalIndex}" aria-label="Remove ${fav.name} from favorites">
                    Remove
                </button>
            </div>
        `}).join('');
    }
    
    /**
     * Initialize favorites filter buttons
     * @private
     */
    _initFavoritesFilter() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state and aria-pressed
                filterButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                
                // Update filter and trigger redisplay
                this.currentFilter = btn.dataset.filter;
                
                // Trigger favorites redisplay (will be called from app.js via favorites onChange)
                const event = new CustomEvent('favoritesFilterChanged', { detail: { filter: this.currentFilter } });
                window.dispatchEvent(event);
            });
        });
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
     * @param {string} generatorType - 'elven' or 'dwarven'
     */
    updateSubraceDescription(subrace, generatorType = 'elven') {
        if (generatorType === 'dwarven') {
            const descriptions = {
                'general': 'Balanced names drawing from all Dwarven traditions',
                'gold-dwarf': 'Names emphasizing Gold, Gems, Halls, and Wealth (stately, traditional)',
                'shield-dwarf': 'Names emphasizing Steel, Axes, Battle, and Defense (martial, functional)',
                'duergar': 'Names emphasizing Gray, Deep, Dark Stone, and Servitude (harsh, guttural)'
            };
            
            if (this.elements.dwarvenSubraceDescription) {
                this.elements.dwarvenSubraceDescription.textContent = descriptions[subrace] || descriptions['general'];
            }
        } else {
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
        const convertedSyllables = syllables.map((syllable, index) => {
            let converted = syllable;
            const original = syllable; // Keep original to check later
            
            // Map phonetic sounds to TTS-friendly spellings
            // Based on the guide: A="ah", E="eh", I="ee", O="oh", U="oo"
            
            // Handle "ahs" -> "ahs" (keep as-is, but note it ends with 's' for smart joining)
            // When "ahs" is followed by a consonant-starting syllable, the 's' will combine
            // e.g., "ahs" + "trah" = "ahstrah" (s+t = st cluster)
            if (converted === 'ahs') {
                // Keep as "ahs" - the 's' will naturally combine with next consonant
            }
            
            // Handle "vahl" -> "vahl" (keep "ah" sound)
            if (converted === 'vahl') {
                // Keep as "vahl" to preserve "ah" sound
            }
            
            // Handle "meer" -> "mirr" (like mirror, not "meer")
            if (converted === 'meer') {
                converted = 'mirr';
            }
            
            // Handle "meh" -> "meh" (keep "eh" sound, don't convert to "may")
            if (converted === 'meh') {
                // Keep as "meh" to preserve "eh" sound
            }
            
            // Handle "nahl" -> "nahl" (keep "ah" sound)
            if (converted === 'nahl') {
                // Keep as "nahl" to preserve "ah" sound
            }
            
            // Handle "tahn" -> "tahn" (keep "ah" sound)
            if (converted === 'tahn') {
                // Keep as "tahn" to preserve "ah" sound
            }
            
            // Handle "thahr" -> "tharr" (for "tharr" sound)
            if (converted === 'thahr') {
                converted = 'tharr';
            }
            
            // Handle "theer" -> "thir" (for "thir" sound)
            if (converted === 'theer') {
                converted = 'thir';
            }
            
            // Handle "mihth" -> "mith" (remove extra 'h')
            if (converted === 'mihth') {
                converted = 'mith';
            }
            
            // Handle "kwehs" -> "kweys" (for "kweys" sound with long A)
            if (converted === 'kwehs') {
                converted = 'kweys';
            }
            
            // Handle standalone "a" at start -> "ah" (for "Ah" sound, not long A)
            if (converted === 'a' && index === 0) {
                converted = 'ah';
            }
            
            // Handle "ah" in middle -> keep as "ah" (preserve "ah" sound)
            if (converted === 'ah') {
                // Keep as "ah" to preserve "ah" sound
            }
            
            // Handle "rahn" -> "rahn" (keep "ah" sound, TTS reads "rahn" better than "ran")
            // Must come before general "ahn" rule
            if (converted === 'rahn') {
                // Keep as "rahn" to preserve "ah" sound
            } else if (converted === 'tahn') {
                // Keep "tahn" to preserve "ah" sound  
            } else if (converted === 'sahn') {
                // Keep "sahn" to preserve "ah" sound
            } else {
                // Handle "ahn" -> "an" (only for other cases)
                converted = converted.replace(/ahn/g, 'an');
            }
            
            // Handle "ah" at end or standalone -> keep as "ah" (preserve "ah" sound)
            // Only convert if it's a very short standalone "a" that's not meant to be "ah"
            // For elven names, "ah" should generally be preserved
            if (original !== 'ahs' && original !== 'ah' && converted.length > 2) {
                // Only convert "ah" in longer patterns, not standalone
                converted = converted.replace(/ah$/g, 'ah'); // Keep as "ah"
            }
            
            // Handle "ahl" -> "al"
            converted = converted.replace(/ahl/g, 'al');
            
            // Handle "ahm" -> "am"
            converted = converted.replace(/ahm/g, 'am');
            
            // Handle "ahr" -> "ar"
            converted = converted.replace(/ahr/g, 'ar');
            
            // Handle "fehl" -> "fehl" (keep "eh" sound, don't convert to "fel")
            // Must come before general "ehl" rule
            if (converted === 'fehl') {
                // Keep as "fehl" to preserve "eh" sound
            } else {
                // Handle "ehl" -> "el" (final e pronounced "eh")
                converted = converted.replace(/ehl/g, 'el');
            }
            
            // Handle "leh" -> "ley" (for "lEY" sound)
            if (converted === 'leh') {
                converted = 'ley';
            }
            
            // Handle "eh" at end -> "e" (but not if it was "leh" which becomes "ley")
            if (original !== 'leh') {
                converted = converted.replace(/eh$/g, 'e');
            }
            
            // Handle "ehs" -> "seh" (reverse to get "sEH" sound, like "kweh" -> "kwehs")
            converted = converted.replace(/ehs([^a-z]|$)/g, 'seh$1');
            
            // Handle "ehn" -> "en"
            converted = converted.replace(/ehn/g, 'en');
            
            // Handle "eem" -> "em"
            converted = converted.replace(/ehm/g, 'em');
            
            // Handle "kwehs" -> "kways" (for "kwAYs" sound with long A)
            if (converted === 'kwehs') {
                converted = 'kways';
            } else {
                // Handle "weh" -> "wehs" (add 's' to get "wehs" sound, like "kweh" -> "kwehs")
                converted = converted.replace(/weh$/g, 'wehs');
                converted = converted.replace(/weh([^a-z])/g, 'wehs$1');
            }
            
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
            
            // Handle "rah" -> "rah" (keep "ah" sound, don't convert to "ra")
            // TTS reads "rah" better than "ra" for the "rAH" sound
            // Only convert if it's part of a longer pattern
            if (converted === 'rah') {
                // Keep as "rah" to preserve "ah" sound
            } else {
                // For patterns like "rahd" etc, might need different handling
                converted = converted.replace(/rah([^a-z]|$)/g, 'rah$1');
            }
            
            // Handle "lah" -> "la" 
            converted = converted.replace(/lah([^a-z]|$)/g, 'la$1');
            
            // Handle "nah" -> "na"
            converted = converted.replace(/nah([^a-z]|$)/g, 'na$1');
            
            // Handle "mah" -> "ma"
            converted = converted.replace(/mah([^a-z]|$)/g, 'ma$1');
            
            // Handle "sah" -> "sa" (but preserve if it came from "ahs" - we now keep "ahs" as-is)
            // Only convert standalone "sah" patterns
            if (original !== 'ahs' && converted !== 'sah') {
                converted = converted.replace(/sah([^a-z]|$)/g, 'sa$1');
            }
            
            // Handle "tah" -> "ta"
            converted = converted.replace(/tah([^a-z]|$)/g, 'ta$1');
            
            // Handle "dah" -> "da"
            converted = converted.replace(/dah([^a-z]|$)/g, 'da$1');
            
            // Handle "trah" -> "trah" (keep "ah" sound, don't add 's' to avoid conflicts)
            // TTS should read "trah" with the "ah" sound preserved
            if (converted === 'trah') {
                // Keep as "trah" to preserve "ah" sound and avoid "sah-strah" issue
            } else {
                converted = converted.replace(/trah([^a-z]|$)/g, 'trah$1');
            }
            
            // Handle "zhawn" -> "shzawn" (convert "zh" to "shz" for TTS recognition)
            // Must come before "oh" handling
            if (converted === 'zhawn') {
                converted = 'shzawn';
            } else if (converted.startsWith('zh')) {
                // Convert "zh" to "shz" for better TTS recognition of "zh" sound
                converted = converted.replace(/^zh/g, 'shz');
            }
            
            // Handle "doh" -> "doh" (keep "oh" sound, don't convert to "do")
            if (converted === 'doh') {
                // Keep as "doh" to preserve "oh" sound
            } else {
                // Handle "oh" -> "o" (but preserve "doh")
                converted = converted.replace(/oh([^a-z]|$)/g, 'o$1');
            }
            
            converted = converted.replace(/ohn/g, 'on');
            converted = converted.replace(/ohl/g, 'ol');
            converted = converted.replace(/ohr/g, 'or');
            
            // Handle "ahnee" -> "anee" (convert "ahn" part, preserve "ee" as long E)
            // This handles the "-ani-" connector which has phonetic "ahnee"
            // When converted, "ahn" becomes "an", so "ahnee" -> "anee"
            // TTS should read "anee" as "an-ee" (two syllables with long E)
            if (converted === 'ahnee') {
                converted = 'anee'; // "an-ee" - TTS reads this as "an" + long E sound
            }
            
            // Handle standalone "ee" -> convert to "ee" pattern TTS recognizes as long E
            // Some TTS APIs read standalone "ee" as two separate "e" letters
            // Solution: convert to "ee" but ensure it's in a context TTS understands
            if (converted === 'ee') {
                // For standalone "ee", keep as "ee" but it should be part of a compound
                // If this still causes issues, might need to use "ee" in a compound context
                converted = 'ee';
            }
            
            // Handle "ee" at end of words (preserve as long E)
            // "ee" at end should be preserved as long E sound
            converted = converted.replace(/ee$/g, 'ee'); // Keep final "ee" as long E
            
            // Keep "oo" for long u sound
            // Keep "ay" for diphthong
            // Keep "ow" for diphthong
            
            return converted;
        });
        
        // Smart joining: handle consonant clusters that shift emphasis
        // When a syllable ends with 's' and next starts with consonant (t, h, l, k, etc),
        // the 's' combines to form clusters like "st", "sh", "sl", "sk" which shift emphasis
        let result = '';
        for (let i = 0; i < convertedSyllables.length; i++) {
            const current = convertedSyllables[i];
            const next = convertedSyllables[i + 1];
            
            if (i === 0) {
                result = current;
            } else {
                const prev = convertedSyllables[i - 1];
                const prevEndsWithS = prev.endsWith('s') || prev.endsWith('hs') || prev.endsWith('ls');
                const currentStartsWithConsonant = next && /^[bcdfghjklmnpqrstvwxyz]/.test(next);
                
                // Special cases for vowel-vowel combinations that should join
                const prevEndsWithVowel = /[aeiou]$/.test(prev);
                const currentStartsWithVowel = /^[aeiou]/.test(current);
                
                // If previous ends with vowel and current starts with vowel, join directly
                // e.g., "ee" + "ah" = "eeah" (not "ee-ah")
                if (prevEndsWithVowel && currentStartsWithVowel) {
                    result += current; // Join vowels directly
                }
                // Special case: "eh" + "lah" = "ehllah" (combine for better flow)
                else if (prev === 'eh' && current === 'lah') {
                    result += 'llah'; // Join to form "ehllah"
                }
                // If previous syllable ends with 's' and current starts with consonant,
                // join without hyphen to allow natural "st", "sh", "sl", "sk" clusters
                else if (prevEndsWithS && currentStartsWithConsonant) {
                    result += current; // Join directly for consonant clusters
                } else if (prev.endsWith('l') && current.startsWith('a')) {
                    // Special case: "vahl" + "ahs" - use hyphen to separate "l" and "a"
                    // but the "s" from "ahs" will still combine with next consonant
                    result += '-' + current;
                } else {
                    result += '-' + current; // Use hyphen for separation
                }
            }
        }
        
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
            utterance.lang = 'en-US'; // Explicitly set to General American English for consistent pronunciation
            
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