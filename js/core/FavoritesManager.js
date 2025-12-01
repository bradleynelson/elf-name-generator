// Favorites management with storage handling
import { StorageManager } from '../utils/storage.js';
import { CONFIG } from '../config.js';

/**
 * Manages favorite names with localStorage persistence
 */
export class FavoritesManager {
    constructor() {
        this.storage = new StorageManager();
        this.favorites = this.storage.load();
        this.listeners = [];
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
        
        // Check if already exists
        if (this.favorites.some(fav => fav.name === nameData.name)) {
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
        this.favorites.push(nameData);
        
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
     * Remove a favorite by index
     * @param {number} index - Index of favorite to remove
     * @returns {boolean} Success status
     */
    remove(index) {
        if (index < 0 || index >= this.favorites.length) {
            console.error('Invalid favorite index:', index);
            return false;
        }
        
        this.favorites.splice(index, 1);
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
