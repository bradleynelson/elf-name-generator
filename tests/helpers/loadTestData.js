// Test helper to load data files directly from filesystem
// Use this instead of loadGeneratorData() which requires browser fetch API
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load Elven generator data files directly from filesystem
 * @returns {Object} Object containing components and connectors arrays
 */
export function loadTestData() {
    const components = JSON.parse(
        readFileSync(join(__dirname, '../../data/components.json'), 'utf-8')
    );
    const connectors = JSON.parse(
        readFileSync(join(__dirname, '../../data/connectors.json'), 'utf-8')
    );
    
    return { components, connectors };
}

/**
 * Load Dwarven generator data files directly from filesystem
 * @returns {Object} Object containing firstNames and clanNames arrays
 */
export function loadDwarvenTestData() {
    const firstNames = JSON.parse(
        readFileSync(join(__dirname, '../../data/dwarvenFirstNames.json'), 'utf-8')
    );
    const clanNames = JSON.parse(
        readFileSync(join(__dirname, '../../data/dwarvenClanNames.json'), 'utf-8')
    );
    
    return { firstNames, clanNames };
}

