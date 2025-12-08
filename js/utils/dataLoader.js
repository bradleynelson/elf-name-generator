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
 * Load all required data files for the Dwarven generator
 * @returns {Promise<Object>} Object containing firstNames and clanNames
 */
export async function loadDwarvenGeneratorData() {
    try {
        const [firstNames, clanNames] = await Promise.all([
            loadJSON('data/dwarvenFirstNames.json'),
            loadJSON('data/dwarvenClanNames.json')
        ]);
        
        return {
            firstNames,
            clanNames
        };
    } catch (error) {
        console.error('Failed to load Dwarven generator data:', error);
        throw new Error('Could not load Dwarven name generator data. Please refresh the page.');
    }
}

/**
 * Load all required data files for the Gnomish generator
 * @returns {Promise<Object>} Object containing personalNames, clanNames, nicknames
 */
export async function loadGnomishGeneratorData() {
    try {
        const [personalNames, clanNames, nicknames] = await Promise.all([
            loadJSON('data/gnomishPersonalNames.json'),
            loadJSON('data/gnomishClanNames.json'),
            loadJSON('data/gnomishNicknames.json')
        ]);
        
        return {
            personalNames,
            clanNames,
            nicknames
        };
    } catch (error) {
        console.error('Failed to load Gnomish generator data:', error);
        throw new Error('Could not load Gnomish name generator data. Please refresh the page.');
    }
}

/**
 * Load all required data files for the Orc generator
 * @returns {Promise<Object>} Object containing personalNames, clanNames, epithets
 */
export async function loadOrcGeneratorData() {
    try {
        const [personalNames, clanNames, epithets] = await Promise.all([
            loadJSON('data/orcPersonalNames.json'),
            loadJSON('data/orcClanNames.json'),
            loadJSON('data/orcEpithets.json')
        ]);
        
        return {
            personalNames,
            clanNames,
            epithets
        };
    } catch (error) {
        console.error('Failed to load Orc generator data:', error);
        throw new Error('Could not load Orc name generator data. Please refresh the page.');
    }
}

/**
 * Load all required data files for the Halfling generator
 * @returns {Promise<Object>} Object containing personalNames, familyNames, nicknames
 */
export async function loadHalflingGeneratorData() {
    try {
        const [personalNames, familyNames, nicknames] = await Promise.all([
            loadJSON('data/halflingPersonalNames.json'),
            loadJSON('data/halflingFamilyNames.json'),
            loadJSON('data/halflingNicknames.json')
        ]);
        
        return {
            personalNames,
            familyNames,
            nicknames
        };
    } catch (error) {
        console.error('Failed to load Halfling generator data:', error);
        throw new Error('Could not load Halfling name generator data. Please refresh the page.');
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

/**
 * Validate loaded Dwarven first names data
 * @param {Array} firstNames - First names array to validate
 * @returns {boolean}
 */
export function validateDwarvenFirstNames(firstNames) {
    if (!Array.isArray(firstNames) || firstNames.length === 0) {
        console.error('Invalid Dwarven first names data');
        return false;
    }
    
    // Check that first names have required fields
    const requiredFields = ['root', 'can_be_prefix', 'can_be_suffix'];
    for (const name of firstNames) {
        for (const field of requiredFields) {
            if (!(field in name)) {
                console.error(`Dwarven first name missing required field: ${field}`, name);
                return false;
            }
        }
    }
    
    return true;
}

/**
 * Validate loaded Dwarven clan names data
 * @param {Array} clanNames - Clan names array to validate
 * @returns {boolean}
 */
export function validateDwarvenClanNames(clanNames) {
    if (!Array.isArray(clanNames) || clanNames.length === 0) {
        console.error('Invalid Dwarven clan names data');
        return false;
    }
    
    // Check that clan names have required fields
    const requiredFields = ['root', 'can_be_prefix', 'can_be_suffix'];
    for (const name of clanNames) {
        for (const field of requiredFields) {
            if (!(field in name)) {
                console.error(`Dwarven clan name missing required field: ${field}`, name);
                return false;
            }
        }
    }
    
    return true;
}
