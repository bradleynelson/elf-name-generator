// Main Application class - coordinates all modules
import { loadGeneratorData, validateComponents, validateConnectors } from './utils/dataLoader.js';
import { NameGenerator } from './core/NameGenerator.js';
import { FavoritesManager } from './core/FavoritesManager.js';
import { UIController } from './ui/UIController.js';

/**
 * Main application class for the Espruar Name Generator
 * Coordinates all modules and handles user interactions
 */
export class EspruarNameGenerator {
    constructor() {
        this.generator = null;
        this.favorites = null;
        this.ui = null;
        this.isInitialized = false;
        
        // Theme configuration
        this.themes = ['moon-elf', 'sun-elf', 'wood-elf', 'drow'];
        this.themeIcons = {
            'moon-elf': '🌙',
            'sun-elf': '☀️',
            'wood-elf': '🌲',
            'drow': '🕷️'
        };
        this.themeLabels = {
            'moon-elf': 'Moon Elf',
            'sun-elf': 'Sun Elf',
            'wood-elf': 'Wood Elf',
            'drow': 'Dark Elf'
        };
        
        // Subrace icon mapping for generate button
        this.subraceIcons = {
            'high-elf': '⚡',
            'sun-elf': '☀️',
            'moon-elf': '🌙',
            'wood-elf': '🌲',
            'drow': '🕷️'
        };
    }
    
    /**
     * Initialize the application
     * Loads data, sets up modules, and binds events
     */
    async init() {
        try {
            // Load component data
            const data = await loadGeneratorData();
            
            // Validate data
            if (!validateComponents(data.components) || !validateConnectors(data.connectors)) {
                throw new Error('Invalid data format');
            }
            
            // Initialize modules
            this.generator = new NameGenerator(data.components, data.connectors);
            this.favorites = new FavoritesManager();
            this.ui = new UIController();
            
            // Set up event listeners
            this._bindEvents();
            
            // Set up favorites change listener
            this.favorites.onChange((favorites) => {
                this.ui.displayFavorites(favorites);
            });
            
            // Display initial favorites
            this.ui.displayFavorites(this.favorites.getAll());
            
            // Initialize accordions
            this._initAccordions();
            
            // Initialize cookie consent banner
            this._initCookieBanner();
            
            // Initialize theme toggle
            this._initThemeToggle();
            
            this.isInitialized = true;
            console.log('Espruar Name Generator initialized successfully');
            
            // Set initial button icons based on default subrace
            const initialSubrace = this.ui.elements.subraceSelect?.value || 'high-elf';
            this._updateButtonIcons(initialSubrace);
            
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
        // Subrace selector
        if (this.ui.elements.subraceSelect) {
            this.ui.elements.subraceSelect.addEventListener('change', (e) => {
                this.ui.updateSubraceDescription(e.target.value);
                this._updateButtonIcons(e.target.value);
            });
        }
        
        // Large generate button (main action)
        const generateBtnLarge = document.querySelector('.generate-btn-large');
        if (generateBtnLarge) {
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
        window.applyFinalVowel = (vowel) => this.applyFinalVowel(vowel);
        
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
     * Generate a new name
     */
    generateName() {
        if (!this.isInitialized) return;
        
        try {
            const preferences = this.ui.getPreferences();
            const nameData = this.generator.generate(preferences);
            this.ui.displayName(nameData);
        } catch (error) {
            console.error('Error generating name:', error);
            this.ui.showNotification('Error generating name. Please try again.', 'error');
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
     * Initialize theme toggle (cycles through 4 themes)
     * @private
     */
    _initThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        const icon = document.getElementById('themeIcon');
        const label = document.getElementById('themeLabel');
        
        if (!toggle || !icon || !label) {
            console.warn('Theme toggle elements not found');
            return;
        }
        
        // Check for saved preference, otherwise use system preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const defaultTheme = systemPrefersDark ? 'moon-elf' : 'sun-elf';
        const currentTheme = savedTheme || defaultTheme;
        
        // Apply theme immediately
        this._setTheme(currentTheme, icon, label);
        
        // Toggle button click - cycle to next theme
        toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'moon-elf';
            const currentIndex = this.themes.indexOf(currentTheme);
            const nextIndex = (currentIndex + 1) % this.themes.length;
            const nextTheme = this.themes[nextIndex];
            
            this._setTheme(nextTheme, icon, label);
            localStorage.setItem('theme', nextTheme);
        });
        
        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'moon-elf' : 'sun-elf';
                this._setTheme(newTheme, icon, label);
            }
        });
    }
    
    /**
     * Set theme and update UI
     * @private
     */
    _setTheme(theme, icon, label) {
        if (!icon || !label) {
            console.warn('Icon or label element missing');
            return;
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        icon.textContent = this.themeIcons[theme] || '🌙';
        label.textContent = this.themeLabels[theme] || 'Moon Elf';
    }
    
    /**
     * Update button icons based on selected subrace
     * @private
     */
    _updateButtonIcons(subrace) {
        const icon = this.subraceIcons[subrace] || '⚡';
        
        // Update main generate button
        const generateBtn = document.querySelector('.generate-btn-large');
        if (generateBtn) {
            generateBtn.innerHTML = `${icon} Generate Name ${icon}`;
        }
        
        // Update all "Back to Generator" buttons with lightning bolt
        const backButtons = document.querySelectorAll('.back-to-top-btn');
        backButtons.forEach(btn => {
            btn.innerHTML = `⚡ Back to Generator`;
        });
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
        const app = new EspruarNameGenerator();
        app.init();
    });
} else {
    // DOM already loaded
    const app = new EspruarNameGenerator();
    app.init();
}