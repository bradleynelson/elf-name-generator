import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnifiedNameGenerator } from '../../js/app.js';
import { NameGenerator } from '../../js/core/NameGenerator.js';
import { loadGeneratorData, loadDwarvenGeneratorData } from '../../js/utils/dataLoader.js';

// Mock data loading
vi.mock('../../js/utils/dataLoader.js', () => ({
    loadGeneratorData: vi.fn(),
    loadDwarvenGeneratorData: vi.fn(),
    validateComponents: vi.fn(() => true),
    validateConnectors: vi.fn(() => true),
    validateDwarvenFirstNames: vi.fn(() => true),
    validateDwarvenClanNames: vi.fn(() => true)
}));

// Mock components and connectors
const mockElvenData = {
    components: [
        {
            root: 'mair',
            prefix_text: 'Mair',
            suffix_text: 'Mair',
            prefix_phonetic: 'Mair',
            suffix_phonetic: 'Mair',
            prefix_meaning: 'Light',
            suffix_meaning: 'Light',
            can_be_prefix: true,
            can_be_suffix: true,
            tags: ['high-elf', 'moon-elf']
        },
        {
            root: 'tel',
            prefix_text: 'Tel',
            suffix_text: 'Tel',
            prefix_phonetic: 'Tel',
            suffix_phonetic: 'Tel',
            prefix_meaning: 'Star',
            suffix_meaning: 'Star',
            can_be_prefix: true,
            can_be_suffix: true,
            tags: ['high-elf', 'moon-elf']
        }
    ],
    connectors: [
        { text: '-a-', phonetic: 'ah', function: 'Simple vowel bridge' }
    ]
};

const mockDwarvenData = {
    firstNames: [
        {
            root: 'thorin',
            prefix_text: 'Thorin',
            suffix_text: 'Thorin',
            prefix_phonetic: 'Thoh-rin',
            suffix_phonetic: 'Thoh-rin',
            prefix_meaning: 'Bold',
            suffix_meaning: 'Bold',
            can_be_prefix: true,
            can_be_suffix: true
        }
    ],
    clanNames: [
        {
            root: 'stone',
            meaning: 'Stone',
            text: 'Stone'
        }
    ]
};

describe('Integration Tests - App Functionality', () => {
    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        loadGeneratorData.mockResolvedValue(mockElvenData);
        loadDwarvenGeneratorData.mockResolvedValue(mockDwarvenData);
        
        // Setup minimal DOM structure
        document.body.innerHTML = `
            <button class="generate-btn-large"></button>
            <div id="generatedName"></div>
            <div id="namePronunciation"></div>
            <div id="nameMeaning"></div>
            <div id="result"></div>
            <select id="subrace"><option value="high-elf">High Elf</option></select>
            <select id="complexity"><option value="simple">Simple</option></select>
            <input id="syllables" type="range" value="3">
            <select id="style"><option value="neutral">Neutral</option></select>
            <button id="elvenTab" class="generator-tab active"></button>
            <button id="dwarvenTab" class="generator-tab"></button>
            <div id="favoritesList"></div>
            <div id="modifierSuggestionsContainer"></div>
            <div id="genderPrefixSection"></div>
            <div id="genderPrefixOptions"></div>
            <div id="finalVowelSection"></div>
            <div id="vowelOptions"></div>
            <button id="speakerBtn"></button>
            <div id="speakerContainer"></div>
            <div id="breakdown"></div>
        `;
        
        // Clear localStorage
        localStorage.clear();
    });

    describe('App Initialization', () => {
        it('should initialize app and create generators', async () => {
            const app = new UnifiedNameGenerator();
            await app.init();
            
            expect(app.elvenGenerator).toBeDefined();
            expect(app.dwarvenGenerator).toBeDefined();
            expect(app.ui).toBeDefined();
            expect(app.favorites).toBeDefined();
            expect(app.isInitialized).toBe(true);
        });

        it('should wire up generate button click handler', async () => {
            const app = new UnifiedNameGenerator();
            await app.init();
            
            const generateBtn = document.querySelector('.generate-btn-large');
            expect(generateBtn).toBeDefined();
            
            // Mock generateName to verify it's called
            const generateSpy = vi.spyOn(app, 'generateName');
            
            // Simulate button click
            generateBtn.click();
            
            expect(generateSpy).toHaveBeenCalled();
        });
    });

    describe('Generate Button Functionality', () => {
        it('should generate and display name when button clicked', async () => {
            const app = new UnifiedNameGenerator();
            await app.init();
            
            const generateBtn = document.querySelector('.generate-btn-large');
            const nameDisplay = document.getElementById('generatedName');
            
            // Get initial name (may be populated from initialization)
            const initialName = nameDisplay.textContent || '';
            
            // Click generate button multiple times to ensure we get a different name
            // (in case first click generates same name by chance)
            let newName = initialName;
            for (let i = 0; i < 5 && newName === initialName; i++) {
                generateBtn.click();
                await new Promise(resolve => setTimeout(resolve, 100));
                newName = nameDisplay.textContent || '';
            }
            
            // Verify name appeared on page
            expect(newName).toBeTruthy();
            expect(newName.length).toBeGreaterThan(0);
            
            // If initial name existed, verify it changed (or we tried 5 times)
            if (initialName) {
                // After 5 attempts, name should have changed (very unlikely to get same name 5 times)
                expect(newName).not.toBe(initialName);
            }
        });

        it('should show name meaning after generation', async () => {
            const app = new UnifiedNameGenerator();
            await app.init();
            
            const generateBtn = document.querySelector('.generate-btn-large');
            const meaningDisplay = document.getElementById('nameMeaning');
            
            generateBtn.click();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify meaning is displayed
            expect(meaningDisplay.textContent).toBeTruthy();
        });
    });

    describe('Tab Switching', () => {
        it('should have generator initialized', async () => {
            const app = new UnifiedNameGenerator();
            await app.init();
            
            // Verify generators are initialized
            expect(app.elvenGenerator).toBeDefined();
            expect(app.elvenGenerator).toBeInstanceOf(NameGenerator);
            expect(app.dwarvenGenerator).toBeDefined();
        });
    });
});

