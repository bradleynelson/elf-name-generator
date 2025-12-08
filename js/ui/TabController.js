// Tab Controller for switching between Elven and Dwarven generators

/**
 * Manages tab switching between generators
 */
export class TabController {
    constructor() {
        this.currentGenerator = "elven"; // 'elven' or 'dwarven'
        this.listeners = [];
    }

    /**
     * Add a listener for tab changes
     * @param {Function} callback - Called when tab changes
     */
    onChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify all listeners of changes
     * @private
     */
    _notifyListeners() {
        this.listeners.forEach((callback) => callback(this.currentGenerator));
    }

    /**
     * Get current generator type
     * @returns {string} 'elven' or 'dwarven'
     */
    getCurrentGenerator() {
        return this.currentGenerator;
    }

    /**
     * Switch to a generator
     * @param {string} generator - 'elven' or 'dwarven'
     */
    switchTo(generator) {
        if (generator !== "elven" && generator !== "dwarven") {
            console.error("Invalid generator type:", generator);
            return;
        }

        if (this.currentGenerator === generator) {
            return; // Already on this generator
        }

        this.currentGenerator = generator;
        this._notifyListeners();

        // Save preference
        try {
            localStorage.setItem("preferredGenerator", generator);
        } catch (e) {
            console.warn("Could not save generator preference:", e);
        }
    }

    /**
     * Initialize tabs from saved preference or default
     */
    init() {
        try {
            const saved = localStorage.getItem("preferredGenerator");
            if (saved === "dwarven" || saved === "elven") {
                this.currentGenerator = saved;
            }
        } catch (e) {
            console.warn("Could not load generator preference:", e);
        }

        // Check URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const generatorParam = urlParams.get("generator");
        if (generatorParam === "dwarven" || generatorParam === "elven") {
            this.currentGenerator = generatorParam;
        }
    }
}
