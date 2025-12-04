// Main Application class - coordinates all modules for both Elven and Dwarven generators
import { CONFIG } from './config.js';
import { loadGeneratorData, validateComponents, validateConnectors, loadDwarvenGeneratorData, validateDwarvenFirstNames, validateDwarvenClanNames } from './utils/dataLoader.js';
import { NameGenerator } from './core/NameGenerator.js';
import { DwarvenNameGenerator } from './core/DwarvenNameGenerator.js';
import { FavoritesManager } from './core/FavoritesManager.js';
import { UIController } from './ui/UIController.js';

/**
 * Unified Name Generator - supports both Elven (Espruar) and Dwarven (Dethek) generators
 * Coordinates all modules and handles user interactions
 */
export class UnifiedNameGenerator {
    constructor() {
        this.elvenGenerator = null;
        this.dwarvenGenerator = null;
        this.currentGenerator = null;
        this.favorites = null;
        this.ui = null;
        this.isInitialized = false;
        this.currentGeneratorType = 'elven';
        
        // Subrace icon mapping for generate button (Elven)
        this.subraceIcons = {
            'high-elf': '✨',
            'sun-elf': '☀️',
            'moon-elf': '🌙',
            'wood-elf': '🌲',
            'drow': '🕷️',
            'feyri': '🫧'
        };
        
        // Subrace icon mapping for Dwarven generate button
        this.dwarvenSubraceIcons = {
            'general': '✨',
            'gold-dwarf': '💰',
            'shield-dwarf': '🛡️',
            'duergar': '💀'
        };
    }
    
    /**
     * Initialize the application
     * Loads data, sets up modules, and binds events
     */
    async init() {
        try {
            // Load both Elven and Dwarven data
            const [elvenData, dwarvenData] = await Promise.all([
                loadGeneratorData(),
                loadDwarvenGeneratorData()
            ]);
            
            // Validate Elven data
            if (!validateComponents(elvenData.components) || !validateConnectors(elvenData.connectors)) {
                throw new Error('Invalid Elven data format');
            }
            
            // Validate Dwarven data
            if (!validateDwarvenFirstNames(dwarvenData.firstNames) || !validateDwarvenClanNames(dwarvenData.clanNames)) {
                throw new Error('Invalid Dwarven data format');
            }
            
            // Initialize Elven generator
            this.elvenGenerator = new NameGenerator(elvenData.components, elvenData.connectors);
            
            // Initialize Dwarven generator
            this.dwarvenGenerator = new DwarvenNameGenerator(dwarvenData.firstNames, dwarvenData.clanNames);
            
            // Initialize shared modules
            this.favorites = new FavoritesManager();
            this.ui = new UIController();
            
            // Determine initial generator type based on:
            // 1. URL parameter (?generator=dwarven)
            // 2. Domain (dethek.com defaults to dwarven)
            // 3. localStorage preference
            // 4. Default to elven
            const initialGenerator = this._determineInitialGenerator();
            this.currentGeneratorType = initialGenerator;
            this.currentGenerator = initialGenerator === 'dwarven' ? this.dwarvenGenerator : this.elvenGenerator;
            
            // Set initial theme and generator attributes
            if (initialGenerator === 'dwarven') {
                document.documentElement.setAttribute('data-generator', 'dwarven');
                document.documentElement.removeAttribute('data-theme');
            } else {
                document.documentElement.setAttribute('data-theme', 'moon-elf');
                document.documentElement.setAttribute('data-generator', 'elven');
            }
            
            // Update favorites manager with current generator type
            this.favorites.setGeneratorType(this.currentGeneratorType);
            
            // Set up event listeners
            this._bindEvents();
            
            // Set up favorites change listener
            this.favorites.onChange((favorites) => {
                this.ui.displayFavorites(favorites);
            });
            
            // Display initial favorites
            this.ui.displayFavorites(this.favorites.getAll());
            
            // Listen for filter changes
            window.addEventListener('favoritesFilterChanged', () => {
                this.ui.displayFavorites(this.favorites.getAll());
            });
            
            // Initialize accordions
            this._initAccordions();
            
            // Initialize cookie consent banner
            this._initCookieBanner();
            
            // Initialize range slider fill
            this._initRangeSliderFill();
            
            this.isInitialized = true;
            console.log('Faerûn Name Generator initialized successfully');
            
            // Initialize UI state based on loaded generator
            this._initializeUIForGenerator(this.currentGeneratorType);
            
            // Set initial button icons based on current generator and subrace
            if (this.currentGeneratorType === 'elven') {
                const initialSubrace = this.ui.elements.subraceSelect?.value || 'high-elf';
                this._updateButtonIcons(initialSubrace);
            } else {
                const initialDwarvenSubrace = document.getElementById('dwarvenSubrace')?.value || 'general';
                this._updateDwarvenButtonIcons(initialDwarvenSubrace);
            }
            
            // Generate initial name (after isInitialized = true)
            this.generateName();
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this._showError('Failed to load the name generator. Please refresh the page.');
        }
    }
    
    /**
     * Bind all event listeners
     * @private
     */
    _bindEvents() {
        // Tab switching
        const elvenTab = document.getElementById('elvenTab');
        const dwarvenTab = document.getElementById('dwarvenTab');
        
        if (elvenTab) {
            elvenTab.addEventListener('click', (e) => {
                if (elvenTab.classList.contains('active')) {
                    e.preventDefault();
                    return;
                }
                this.switchGenerator('elven');
            });
        }
        
        if (dwarvenTab) {
            dwarvenTab.addEventListener('click', (e) => {
                if (dwarvenTab.classList.contains('active')) {
                    e.preventDefault();
                    return;
                }
                this.switchGenerator('dwarven');
            });
        }
        
        // Elven Subrace selector
        if (this.ui.elements.subraceSelect) {
            this.ui.elements.subraceSelect.addEventListener('change', (e) => {
                this.ui.updateSubraceDescription(e.target.value);
                this._updateButtonIcons(e.target.value);
            });
        }
        
        // Dwarven Subrace selector
        const dwarvenSubraceSelect = document.getElementById('dwarvenSubrace');
        if (dwarvenSubraceSelect) {
            dwarvenSubraceSelect.addEventListener('change', (e) => {
                this._updateDwarvenButtonIcons(e.target.value);
            });
        }
        
        // Large generate button (main action)
        const generateBtnLarge = document.querySelector('.generate-btn-large');
        if (generateBtnLarge) {
            generateBtnLarge.addEventListener('mousedown', () => {
                // Add class to prevent shimmer animation on click
                generateBtnLarge.classList.add('just-clicked');
            });
            generateBtnLarge.addEventListener('mouseup', () => {
                // Remove class after a short delay to allow hover animation again
                setTimeout(() => {
                    generateBtnLarge.classList.remove('just-clicked');
                }, 2000); // 2 seconds - longer than animation duration
            });
            generateBtnLarge.addEventListener('click', () => {
                this.generateName();
            });
        }
        
        // Save to favorites button
        const saveFavoriteBtn = document.querySelector('.save-favorite');
        if (saveFavoriteBtn) {
            saveFavoriteBtn.addEventListener('click', () => {
                this.saveFavorite();
            });
        }
        
        // Copy button (bottom)
        const copyBtnBottom = document.getElementById('copyBtnBottom');
        if (copyBtnBottom) {
            copyBtnBottom.addEventListener('click', () => {
                this.copyNameToClipboard();
            });
        }
        
        // Settings accordion toggle
        const settingsToggle = document.getElementById('settingsToggle');
        const settingsContent = document.getElementById('settingsContent');
        if (settingsToggle && settingsContent) {
            settingsToggle.addEventListener('click', () => {
                const isExpanded = settingsToggle.getAttribute('aria-expanded') === 'true';
                settingsToggle.setAttribute('aria-expanded', !isExpanded);
                if (isExpanded) {
                    settingsContent.setAttribute('hidden', '');
                } else {
                    settingsContent.removeAttribute('hidden');
                }
            });
        }
        
        // Breakdown toggle
        const breakdownToggle = document.getElementById('breakdownToggle');
        const breakdownContent = document.getElementById('breakdownContent');
        if (breakdownToggle && breakdownContent) {
            breakdownToggle.addEventListener('click', () => {
                const isExpanded = breakdownToggle.getAttribute('aria-expanded') === 'true';
                breakdownToggle.setAttribute('aria-expanded', !isExpanded);
                if (isExpanded) {
                    breakdownContent.setAttribute('hidden', '');
                } else {
                    breakdownContent.removeAttribute('hidden');
                }
            });
        }
        
        // Keep window functions for vowel suggestions (they use onclick in HTML)
        window.applyGenderPrefix = (vowel) => this.applyGenderPrefix(vowel);
        window.applyFinalVowel = (vowel) => this.applyFinalVowel(vowel);
        
        // Gender prefix options (event delegation)
        if (this.ui.elements.genderPrefixOptions) {
            this.ui.elements.genderPrefixOptions.addEventListener('click', (e) => {
                const prefixOption = e.target.closest('.vowel-option');
                if (prefixOption) {
                    const vowel = prefixOption.dataset.vowel;
                    this.applyGenderPrefix(vowel);
                }
            });
        }
        
        // Vowel options (event delegation)
        this.ui.elements.vowelOptions.addEventListener('click', (e) => {
            const vowelOption = e.target.closest('.vowel-option');
            if (vowelOption) {
                const vowel = vowelOption.dataset.vowel;
                this.applyFinalVowel(vowel);
            }
        });
        
        // Favorites list (event delegation)
        this.ui.elements.favoritesList.addEventListener('click', (e) => {
            // Remove button - show confirmation
            if (e.target.classList.contains('remove-btn')) {
                const button = e.target;
                const index = parseInt(button.dataset.index);
                
                // Change to confirmation state
                button.innerHTML = `
                    <span class="confirm-cancel" title="Cancel">🛇</span>
                    <span class="confirm-delete" title="Delete">🗑️</span>
                `;
                button.classList.add('confirming');
                
                // Prevent immediate re-clicks
                e.stopPropagation();
            }
            
            // Cancel confirmation
            else if (e.target.classList.contains('confirm-cancel')) {
                const button = e.target.closest('.remove-btn');
                button.innerHTML = 'Remove';
                button.classList.remove('confirming');
                e.stopPropagation();
            }
            
            // Confirm deletion
            else if (e.target.classList.contains('confirm-delete')) {
                const button = e.target.closest('.remove-btn');
                const index = parseInt(button.dataset.index);
                this.removeFavorite(index);
                e.stopPropagation();
            }
        });
    }
    
    /**
     * Determine initial generator type based on URL, domain, or localStorage
     * @private
     * @returns {string} 'elven' or 'dwarven'
     */
    _determineInitialGenerator() {
        // 1. Check URL parameter (?generator=dwarven or ?tab=dwarven) - highest priority
        const urlParams = new URLSearchParams(window.location.search);
        const urlGenerator = urlParams.get('generator') || urlParams.get('tab');
        if (urlGenerator === 'dwarven' || urlGenerator === 'dwarf') {
            return 'dwarven';
        }
        if (urlGenerator === 'elven' || urlGenerator === 'elf') {
            return 'elven';
        }
        
        // 2. Check domain (dethek.com or dethek subdomain defaults to dwarven)
        const hostname = window.location.hostname.toLowerCase();
        if (hostname === 'dethek.com' || 
            hostname === 'www.dethek.com' ||
            hostname.startsWith('dethek.')) {
            return 'dwarven';
        }
        
        // 3. Check localStorage preference (for other domains)
        const lastGenerator = localStorage.getItem(CONFIG.LAST_GENERATOR_KEY);
        if (lastGenerator === 'dwarven' || lastGenerator === 'elven') {
            return lastGenerator;
        }
        
        // 4. Default to elven
        return 'elven';
    }
    
    /**
     * Generate a new name
     */
    generateName() {
        if (!this.isInitialized) return;
        
        try {
            const preferences = this.ui.getPreferences(this.currentGeneratorType);
            const nameData = this.currentGenerator.generate(preferences);
            this.ui.displayName(nameData, this.currentGeneratorType);
        } catch (error) {
            console.error('Error generating name:', error);
            this.ui.showNotification('Error generating name. Please try again.', 'error');
        }
    }
    
    /**
     * Switch between Elven and Dwarven generators
     * @param {string} generatorType - 'elven' or 'dwarven'
     */
    switchGenerator(generatorType) {
        if (generatorType === this.currentGeneratorType) return;
        
        this.currentGeneratorType = generatorType;
        
        // Save to localStorage
        localStorage.setItem(CONFIG.LAST_GENERATOR_KEY, generatorType);
        
        // Update favorites manager generator type
        this.favorites.setGeneratorType(generatorType);
        
        // Update current generator
        this.currentGenerator = generatorType === 'dwarven' ? this.dwarvenGenerator : this.elvenGenerator;
        
        // Update UI state
        this._initializeUIForGenerator(generatorType);
        
        // Generate new name with new generator
        this.generateName();
    }
    
    /**
     * Initialize UI state for a specific generator
     * @private
     * @param {string} generatorType - 'elven' or 'dwarven'
     */
    _initializeUIForGenerator(generatorType) {
        // Get UI elements
        const elvenTab = document.getElementById('elvenTab');
        const dwarvenTab = document.getElementById('dwarvenTab');
        const titleName = document.querySelector('.title-name');
        const subtitle = document.querySelector('.subtitle');
        const betaLabel = document.getElementById('betaLabel');
        const elvenEducation = document.getElementById('elvenEducationalSection');
        const dwarvenEducation = document.getElementById('dwarvenEducationalSection');
        const elvenControls = document.querySelector('.elven-controls');
        const dwarvenControls = document.querySelector('.dwarven-controls');
        const titleIcons = document.querySelectorAll('.title-sword');
        
        if (generatorType === 'elven') {
            if (elvenTab) elvenTab.classList.add('active');
            if (dwarvenTab) dwarvenTab.classList.remove('active');
            document.documentElement.setAttribute('data-generator', 'elven');
            document.documentElement.setAttribute('data-theme', 'moon-elf');
            
            if (titleName) titleName.textContent = 'Elven Name';
            if (subtitle) subtitle.textContent = 'Espruar Naming System - Forgotten Realms';
            if (betaLabel) betaLabel.style.display = 'none';
            if (elvenEducation) elvenEducation.style.display = 'block';
            if (dwarvenEducation) dwarvenEducation.style.display = 'none';
            if (elvenControls) elvenControls.style.display = 'block';
            if (dwarvenControls) dwarvenControls.style.display = 'none';
            titleIcons.forEach(icon => icon.textContent = '⚔️');
            
            // Update button icons for current elven subrace
            const currentSubrace = this.ui.elements.subraceSelect?.value || 'high-elf';
            this._updateButtonIcons(currentSubrace);
            
        } else if (generatorType === 'dwarven') {
            if (dwarvenTab) dwarvenTab.classList.add('active');
            if (elvenTab) elvenTab.classList.remove('active');
            document.documentElement.setAttribute('data-generator', 'dwarven');
            document.documentElement.removeAttribute('data-theme');
            
            if (titleName) titleName.textContent = 'Dwarven Name';
            if (subtitle) subtitle.textContent = 'Dethek Naming System - Forgotten Realms';
            if (betaLabel) betaLabel.style.display = 'block';
            if (elvenEducation) elvenEducation.style.display = 'none';
            if (dwarvenEducation) dwarvenEducation.style.display = 'block';
            if (elvenControls) elvenControls.style.display = 'none';
            if (dwarvenControls) dwarvenControls.style.display = 'block';
            titleIcons.forEach(icon => icon.textContent = '⚒️');
            
            // Update button icons for current dwarven subrace
            const currentDwarvenSubrace = document.getElementById('dwarvenSubrace')?.value || 'general';
            this._updateDwarvenButtonIcons(currentDwarvenSubrace);
        }
    }
    
    /**
     * Save current name to favorites
     */
    saveFavorite() {
        if (!this.isInitialized) return;
        
        const currentName = this.ui.getCurrentName();
        if (!currentName) {
            this.ui.showNotification('No name to save!', 'error');
            return;
        }
        
        const result = this.favorites.add(currentName);
        this.ui.showNotification(result.message, result.success ? 'success' : 'error');
    }
    
    /**
     * Copy name to clipboard
     */
    copyNameToClipboard() {
        if (!this.isInitialized) return;
        
        const currentName = this.ui.getCurrentName();
        if (!currentName || !currentName.name) {
            this.ui.showNotification('No name to copy!', 'error');
            return;
        }
        
        // Use modern clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(currentName.name)
                .then(() => {
                    this.ui.showNotification(`Copied "${currentName.name}" to clipboard!`, 'success');
                })
                .catch(() => {
                    this.ui.showNotification('Failed to copy to clipboard', 'error');
                });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = currentName.name;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.ui.showNotification(`Copied "${currentName.name}" to clipboard!`, 'success');
            } catch (err) {
                this.ui.showNotification('Failed to copy to clipboard', 'error');
            }
            document.body.removeChild(textArea);
        }
    }
    
    /**
     * Remove a favorite by index
     * @param {number} index - Index of favorite to remove
     */
    removeFavorite(index) {
        if (!this.isInitialized) return;
        
        const success = this.favorites.remove(index);
        if (!success) {
            this.ui.showNotification('Failed to remove favorite', 'error');
        }
    }
    
    /**
     * Apply a gender prefix vowel to the current name
     * @param {string} vowel - Vowel to apply
     */
    applyGenderPrefix(vowel) {
        if (!this.isInitialized) return;
        this.ui.applyGenderPrefix(vowel);
    }
    
    /**
     * Apply a final vowel to the current name
     * @param {string} vowel - Vowel to apply
     */
    applyFinalVowel(vowel) {
        if (!this.isInitialized) return;
        this.ui.applyFinalVowel(vowel);
    }
    
    /**
     * Show error message to user
     * @private
     */
    _showError(message) {
        // Create error overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
            font-family: 'Lato', sans-serif;
            padding: 20px;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 500px;">
                <h2 style="color: #ff6666; margin-bottom: 20px;">⚠️ Error</h2>
                <p style="font-size: 1.2em; margin-bottom: 20px;">${message}</p>
                <button onclick="location.reload()" style="
                    padding: 10px 30px;
                    background: #c9a050;
                    color: #1a1a2e;
                    border: none;
                    border-radius: 8px;
                    font-size: 1em;
                    cursor: pointer;
                    font-weight: bold;
                ">Reload Page</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
    
    /**
     * Initialize accordion functionality
     * @private
     */
    _initAccordions() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const isExpanded = header.getAttribute('aria-expanded') === 'true';
                const content = header.nextElementSibling;
                
                // Toggle this accordion
                header.setAttribute('aria-expanded', !isExpanded);
                
                if (isExpanded) {
                    content.classList.remove('open');
                } else {
                    content.classList.add('open');
                }
            });
        });
        
        // Back to section buttons
        document.querySelectorAll('.back-to-section-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const accordion = e.target.closest('.accordion');
                const header = accordion.querySelector('.accordion-header');
                header.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
        
        // Back to top buttons
        document.querySelectorAll('.back-to-top-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }
    
    /**
     * Flip the card between result and settings
     * @private
     */
    
    /**
     * Initialize cookie consent banner
     * @private
     */
    _initCookieBanner() {
        const banner = document.getElementById('cookieBanner');
        const modal = document.getElementById('cookieModal');
        const acceptBtn = document.getElementById('cookieAccept');
        const declineBtn = document.getElementById('cookieDecline');
        const learnMoreLink = document.getElementById('cookieLearnMore');
        const modalCloseBtn = document.getElementById('cookieModalClose');
        
        // Safety check - ensure all elements exist
        if (!banner || !modal || !acceptBtn || !declineBtn || !learnMoreLink || !modalCloseBtn) {
            console.error('Cookie banner elements not found');
            return;
        }
        
        // Check if consent already given
        const consent = localStorage.getItem('analytics_consent');
        if (consent === null) {
            // No choice made yet, show banner
            banner.removeAttribute('hidden');
        } else if (consent === 'true') {
            // Previously accepted, load GA now
            this._loadGoogleAnalytics();
        }
        // If consent === 'false', do nothing (GA stays unloaded)
        
        // Accept button
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('analytics_consent', 'true');
            banner.setAttribute('hidden', '');
            this._loadGoogleAnalytics();
        });
        
        // Decline button
        declineBtn.addEventListener('click', () => {
            localStorage.setItem('analytics_consent', 'false');
            banner.setAttribute('hidden', '');
        });
        
        // Learn more link
        learnMoreLink.addEventListener('click', (e) => {
            e.preventDefault();
            modal.removeAttribute('hidden');
        });
        
        // Close modal
        modalCloseBtn.addEventListener('click', () => {
            modal.setAttribute('hidden', '');
        });
        
        // Close modal on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.setAttribute('hidden', '');
            }
        });
        
        // Escape key closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
                modal.setAttribute('hidden', '');
            }
        });
    }
    
    /**
     * Update button icons based on selected subrace
     * @private
     */
    _updateButtonIcons(subrace) {
        if (this.currentGeneratorType !== 'elven') return;
        
        const icon = this.subraceIcons[subrace] || '✨';
        
        // Update main generate button text
        const generateBtnText = document.querySelector('.generate-btn-large .generate-btn-text');
        if (generateBtnText) {
            generateBtnText.textContent = `${icon} Generate Name ${icon}`;
        }
        
        // Update all "Back to Generator" buttons with sparkles
        const backButtons = document.querySelectorAll('.back-to-top-btn');
        backButtons.forEach(btn => {
            btn.innerHTML = `✨ Back to Generator`;
        });
    }
    
    /**
     * Update button icons for Dwarven subrace
     * @private
     */
    _updateDwarvenButtonIcons(subrace) {
        if (this.currentGeneratorType !== 'dwarven') return;
        
        const icon = this.dwarvenSubraceIcons[subrace] || '✨';
        
        const generateBtnText = document.querySelector('.generate-btn-large .generate-btn-text');
        if (generateBtnText) {
            generateBtnText.textContent = `${icon} Generate Name ${icon}`;
        }
        
        const backButtons = document.querySelectorAll('.back-to-top-btn');
        backButtons.forEach(btn => {
            btn.innerHTML = `✨ Back to Generator`;
        });
    }
    
    /**
     * Initialize range slider fill effect
     * @private
     */
    _initRangeSliderFill() {
        const rangeSlider = document.getElementById('syllables');
        if (!rangeSlider) return;
        
        // Moon-elf theme color (only theme used for elven)
        const moonElfColor = '#b8c5d6';
        
        const updateSliderFill = () => {
            // Always use moon-elf color for elven generator
            const color = moonElfColor;
            const percent = ((rangeSlider.value - rangeSlider.min) / (rangeSlider.max - rangeSlider.min)) * 100;
            
            rangeSlider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, rgba(255,255,255,0.1) ${percent}%, rgba(255,255,255,0.1) 100%)`;
        };
        
        // Update on input
        rangeSlider.addEventListener('input', updateSliderFill);
        
        // Initial update
        updateSliderFill();
    }
    
    /**
     * Load Google Analytics script
     * @private
     */
    _loadGoogleAnalytics() {
        if (window.gtag) {
            console.log('Google Analytics already loaded');
            return; // Already loaded
        }
        
        console.log('Loading Google Analytics...');
        
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-8T9GFW6PVK';
        document.head.appendChild(script);
        
        window.dataLayer = window.dataLayer || [];
        function gtag(){window.dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', 'G-8T9GFW6PVK');
        
        console.log('Google Analytics loaded successfully');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new UnifiedNameGenerator();
        app.init();
    });
} else {
    // DOM already loaded
    const app = new UnifiedNameGenerator();
    app.init();
}