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
            
            // Generate initial name
            this.generateName();
            
            this.isInitialized = true;
            console.log('Espruar Name Generator initialized successfully');
            
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
        // Generate button (main)
        this.ui.elements.generateBtn.addEventListener('click', () => {
            this.generateName();
        });
        
        // Save to favorites button
        const saveFavoriteBtn = document.querySelector('.save-favorite');
        if (saveFavoriteBtn) {
            saveFavoriteBtn.addEventListener('click', () => {
                this.saveFavorite();
            });
        }
        
        // Generate another button
        const generateAnotherBtn = document.querySelector('.generate-another');
        if (generateAnotherBtn) {
            generateAnotherBtn.addEventListener('click', () => {
                this.generateName();
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
            if (e.target.classList.contains('remove-btn')) {
                const index = parseInt(e.target.dataset.index);
                this.removeFavorite(index);
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
