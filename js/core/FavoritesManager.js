// Favorites management with storage handling
import { StorageManager } from '../utils/storage.js';
import { CONFIG } from '../config.js';

/**
 * Manages favorite names with localStorage persistence
 * Supports both Elven and Dwarven generators
 */
export class FavoritesManager {
    constructor(generatorType = 'elven') {
        this.generatorType = generatorType;
        // Use unified storage for all favorites
        this.storage = new StorageManager(CONFIG.FAVORITES_STORAGE_KEY);
        this.favorites = this.storage.load();
        
        // Migrate legacy favorites if they exist
        this._migrateLegacyFavorites();
        
        this.listeners = [];
    }
    
    /**
     * Migrate favorites from legacy separate storage keys
     * @private
     */
    _migrateLegacyFavorites() {
        const legacyElf = new StorageManager(CONFIG.LEGACY_ELF_FAVORITES_KEY).load();
        const legacyDwarven = new StorageManager(CONFIG.LEGACY_DWARVEN_FAVORITES_KEY).load();
        
        let migrated = false;
        
        // Migrate elven favorites
        if (legacyElf.length > 0) {
            legacyElf.forEach(fav => {
                if (!fav.generatorType) fav.generatorType = 'elven';
                if (!this.favorites.some(f => f.name === fav.name && f.generatorType === fav.generatorType)) {
                    this.favorites.push(fav);
                    migrated = true;
                }
            });
        }
        
        // Migrate dwarven favorites
        if (legacyDwarven.length > 0) {
            legacyDwarven.forEach(fav => {
                if (!fav.generatorType) fav.generatorType = 'dwarven';
                if (!this.favorites.some(f => f.name === fav.name && f.generatorType === fav.generatorType)) {
                    this.favorites.push(fav);
                    migrated = true;
                }
            });
        }
        
        // Save migrated favorites and clear legacy storage
        if (migrated) {
            this.storage.save(this.favorites);
            localStorage.removeItem(CONFIG.LEGACY_ELF_FAVORITES_KEY);
            localStorage.removeItem(CONFIG.LEGACY_DWARVEN_FAVORITES_KEY);
        }
    }
    
    /**
     * Set the generator type (for tagging new favorites)
     * @param {string} generatorType - 'elven' or 'dwarven'
     */
    setGeneratorType(generatorType) {
        this.generatorType = generatorType;
        // No need to reload, we use unified storage now
        this._notifyListeners();
    }
    
    /**
     * Add a listener for favorites changes
     * @param {Function} callback - Called when favorites change
     */
    onChange(callback) {
        this.listeners.push(callback);
    }
    
    /**
     * Notify all listeners of changes
     * @private
     */
    _notifyListeners() {
        this.listeners.forEach(callback => callback(this.favorites));
    }
    
    /**
     * Get all favorites
     * @returns {Array}
     */
    getAll() {
        return [...this.favorites];
    }
    
    /**
     * Add a name to favorites
     * @param {Object} nameData - Name data to save
     * @returns {Object} Result with success status and message
     */
    add(nameData) {
        if (!nameData) {
            return {
                success: false,
                message: 'No name data provided'
            };
        }
        
        // Tag with generator type
        const taggedData = {
            ...nameData,
            generatorType: this.generatorType
        };
        
        // Check if already exists
        if (this.favorites.some(fav => fav.name === nameData.name && fav.generatorType === this.generatorType)) {
            return {
                success: false,
                message: 'This name is already in your favorites!'
            };
        }
        
        // Check if at max capacity
        if (this.favorites.length >= CONFIG.MAX_FAVORITES) {
            return {
                success: false,
                message: `Maximum ${CONFIG.MAX_FAVORITES} favorites reached. Please remove some before adding more.`
            };
        }
        
        // Add to favorites
        this.favorites.push(taggedData);
        
        // Save to storage
        const saved = this.storage.save(this.favorites);
        
        if (!saved) {
            // Rollback if save failed
            this.favorites.pop();
            return {
                success: false,
                message: 'Could not save favorite. Storage may be full or disabled.'
            };
        }
        
        this._notifyListeners();
        
        return {
            success: true,
            message: 'Name saved to favorites!'
        };
    }
    
    /**
     * Get favorites filtered by current generator type
     * @returns {Array}
     */
    getFiltered() {
        return this.favorites.filter(fav => fav.generatorType === this.generatorType);
    }
    
    /**
     * Remove a favorite by filtered index (index in the filtered list)
     * @param {number} filteredIndex - Index in the filtered favorites list
     * @returns {boolean} Success status
     */
    remove(filteredIndex) {
        const filtered = this.getFiltered();
        if (filteredIndex < 0 || filteredIndex >= filtered.length) {
            console.error('Invalid favorite filtered index:', filteredIndex);
            return false;
        }
        
        // Get the favorite from filtered list
        const favoriteToRemove = filtered[filteredIndex];
        
        // Find its index in the full favorites array
        const actualIndex = this.favorites.findIndex(fav => 
            fav.name === favoriteToRemove.name && 
            fav.generatorType === favoriteToRemove.generatorType
        );
        
        if (actualIndex === -1) {
            console.error('Could not find favorite to remove');
            return false;
        }
        
        this.favorites.splice(actualIndex, 1);
        const saved = this.storage.save(this.favorites);
        
        if (saved) {
            this._notifyListeners();
        }
        
        return saved;
    }
    
    /**
     * Clear all favorites
     * @returns {boolean} Success status
     */
    clear() {
        this.favorites = [];
        const cleared = this.storage.clear();
        
        if (cleared) {
            this._notifyListeners();
        }
        
        return cleared;
    }
    
    /**
     * Get count of favorites
     * @returns {number}
     */
    count() {
        return this.favorites.length;
    }
}
