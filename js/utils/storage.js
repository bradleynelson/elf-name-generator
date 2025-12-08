// LocalStorage utility functions with error handling
import { CONFIG } from "../config.js";

/**
 * Storage utility class with error handling
 */
export class StorageManager {
    constructor(storageKey = CONFIG.FAVORITES_STORAGE_KEY) {
        this.storageKey = storageKey;
    }

    /**
     * Check if localStorage is available
     * @returns {boolean}
     */
    isAvailable() {
        try {
            const test = "__storage_test__";
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Load data from localStorage
     * @returns {Array} Parsed data or empty array if error
     */
    load() {
        if (!this.isAvailable()) {
            console.warn("localStorage is not available");
            return [];
        }

        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Failed to load from localStorage:", error);
            return [];
        }
    }

    /**
     * Save data to localStorage
     * @param {Array} data - Data to save
     * @returns {boolean} Success status
     */
    save(data) {
        if (!this.isAvailable()) {
            console.warn("localStorage is not available");
            return false;
        }

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error("Failed to save to localStorage:", error);

            // Check if it's a quota exceeded error
            if (error.name === "QuotaExceededError") {
                console.error("localStorage quota exceeded");
            }

            return false;
        }
    }

    /**
     * Clear all data from storage
     * @returns {boolean} Success status
     */
    clear() {
        if (!this.isAvailable()) {
            return false;
        }

        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error("Failed to clear localStorage:", error);
            return false;
        }
    }
}
