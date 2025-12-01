// Data loading utilities
/**
 * Load JSON data from a file
 * @param {string} path - Path to JSON file
 * @returns {Promise<any>} Parsed JSON data
 */
async function loadJSON(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to load ${path}:`, error);
        throw error;
    }
}

/**
 * Load all required data files for the generator
 * @returns {Promise<Object>} Object containing components and connectors
 */
export async function loadGeneratorData() {
    try {
        const [components, connectors] = await Promise.all([
            loadJSON('data/components.json'),
            loadJSON('data/connectors.json')
        ]);
        
        return {
            components,
            connectors
        };
    } catch (error) {
        console.error('Failed to load generator data:', error);
        throw new Error('Could not load name generator data. Please refresh the page.');
    }
}

/**
 * Validate loaded component data
 * @param {Array} components - Component array to validate
 * @returns {boolean}
 */
export function validateComponents(components) {
    if (!Array.isArray(components) || components.length === 0) {
        console.error('Invalid components data');
        return false;
    }
    
    // Check that components have required fields
    const requiredFields = ['root', 'can_be_prefix', 'can_be_suffix'];
    for (const component of components) {
        for (const field of requiredFields) {
            if (!(field in component)) {
                console.error(`Component missing required field: ${field}`, component);
                return false;
            }
        }
    }
    
    return true;
}

/**
 * Validate loaded connector data
 * @param {Array} connectors - Connector array to validate
 * @returns {boolean}
 */
export function validateConnectors(connectors) {
    if (!Array.isArray(connectors) || connectors.length === 0) {
        console.error('Invalid connectors data');
        return false;
    }
    
    // Check that connectors have required fields
    for (const connector of connectors) {
        if (!connector.text || !connector.function) {
            console.error('Connector missing required fields', connector);
            return false;
        }
    }
    
    return true;
}
