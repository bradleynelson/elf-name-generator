# High Elf Name Generator (Refactored)

A web-based name generator for creating authentic High Elf names following the Espruar naming system from Forgotten Realms D&D lore.

**Live Site:** [https://espruar.com](https://espruar.com)

## 🆕 What's New in This Version

This is a **refactored version** with improved code architecture and modern best practices:

### Architecture Improvements
- **Modular ES6 Structure**: Code split into logical modules with clear separation of concerns
- **Class-Based Design**: Main functionality organized into classes (NameGenerator, FavoritesManager, UIController, Application)
- **External Data Files**: Component and connector data moved to JSON files for easier maintenance
- **Error Handling**: Comprehensive try-catch blocks and graceful error recovery
- **Storage Management**: Robust localStorage handling with quota checking

### Code Quality
- **No Global Variables**: Everything properly scoped within modules
- **CSS Custom Properties**: Centralized color/spacing management for easy theming
- **Named Constants**: Magic numbers replaced with descriptive configuration
- **DRY Principles**: Eliminated code duplication throughout
- **Utility Functions**: Reusable phonetics and formatting utilities

### Developer Experience
- **Better Organization**: Clear file structure with dedicated folders
- **Validation**: Data validation on load to catch issues early
- **Comments & Documentation**: JSDoc-style comments on all major functions
- **Event Delegation**: Efficient event handling with proper delegation

## Features

- **Linguistic Accuracy**: Follows the complete Espruar morphological system with 108+ components
- **Interchangeable Components**: Implements the "Lego System" where most roots can function as either prefix or suffix
- **Phonetic Rules**: Applies authentic Elven phonetic flow patterns (liquid consonants, vowel bridges, etc.)
- **Final Vowel Options**: Suggests optional aesthetic vowel endings based on syllable count and consonant hardness
- **Gender/Style Options**: Generate feminine, masculine, or neutral names with appropriate component selection
- **Complexity Control**: Choose simple (2 components) or complex (3 components with connectors) names
- **Favorites System**: Save your favorite generated names locally with error handling
- **Component Breakdown**: See the meaning and structure of each generated name

## Project Structure

```
/
├── index.html              # Main HTML file (unchanged visually)
├── style.css               # Refactored CSS with custom properties
├── data/
│   ├── components.json     # 108 name components with meanings
│   └── connectors.json     # 23 phonetic connectors
├── js/
│   ├── app.js              # Main application class
│   ├── config.js           # Configuration constants
│   ├── core/
│   │   ├── NameGenerator.js      # Name generation logic
│   │   └── FavoritesManager.js   # Favorites persistence
│   ├── ui/
│   │   └── UIController.js       # DOM manipulation & display
│   └── utils/
│       ├── phonetics.js          # Phonetic utility functions
│       ├── storage.js            # LocalStorage management
│       └── dataLoader.js         # JSON data loading
├── favicon.png
├── CNAME                   # Custom domain config
├── LICENSE                 # MIT License
└── README.md              # This file
```

## Technical Details

### Naming System Implementation

The generator implements authentic Espruar naming rules:

- **Prefixes**: 56 morphemes with meanings like "eternal," "warrior," "star," etc.
- **Connectors**: 23 phonetic bridges for smooth sound transitions
- **Suffixes**: 58 morphemes including role indicators and gender modifiers
- **Rules**: Follows canonical restrictions (gender modifiers stay as suffixes, strong prefixes don't swap, etc.)

### Example Names

- **Aelriel** - "Warrior Maiden" (Feminine)
- **Merikian** - "Star Slayer" (Masculine)  
- **Silwendae** - "Silver Fair Whisper" (Neutral, with final vowel)

## Installation & Usage

### Simple Deployment
1. Upload all files to your web server
2. Ensure `data/` and `js/` folders maintain their structure
3. The site works entirely client-side - no server processing needed

### Local Development
```bash
# Serve with any local server, e.g.:
python -m http.server 8000
# Then open http://localhost:8000
```

**Note:** The site must be served via HTTP/HTTPS (not `file://`) to load JSON data files.

## Browser Compatibility

- **ES6 Modules**: Requires modern browsers (Chrome 61+, Firefox 60+, Safari 11+, Edge 16+)
- **LocalStorage**: Required for favorites feature
- All modern browsers fully supported

## Configuration

Edit `js/config.js` to customize:
- Generation attempt limits
- Syllable preferences
- Phonetic classification
- Storage settings
- UI thresholds

## Data Management

Component data is now in `data/components.json` and `data/connectors.json`:

```json
{
  "root": "ae",
  "prefix_text": "Ae-",
  "prefix_meaning": "ever, eternal",
  "can_be_prefix": true,
  "can_be_suffix": true,
  "suffix_text": "-ae",
  "suffix_meaning": "Whisper / Secret"
}
```

Non-programmers can edit these files to add/modify components without touching code.

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly with ARIA labels
- Skip navigation link
- Focus indicators on all interactive elements

## Future Enhancements

Potential additions:
- [ ] Build process (Vite/Parcel)
- [ ] Unit tests (Jest/Vitest)
- [ ] TypeScript conversion
- [ ] Advanced filtering options
- [ ] Name history/undo functionality
- [ ] Export to various formats
- [ ] Wood Elf/Drow variants
- [ ] Cloud sync for favorites

## Credits

Morphological system and naming rules compiled from Forgotten Realms D&D canon sources. Component data researched through official materials and community lore documentation.

Generator created by Brad Nelson for the D&D community.

## License

MIT License - See LICENSE file for details. Free to use, modify, and distribute with attribution.

---

## Development Notes

### Why This Refactor?

The original version worked great but had some technical debt:
- All code in global scope
- Data hardcoded in JavaScript
- Magic numbers throughout
- Limited error handling
- No code organization

This refactor addresses those issues while maintaining 100% visual and functional parity.

### Migration from Original

If you're updating from the original version:
1. Favorites will automatically migrate (same localStorage key)
2. All URLs and links remain the same
3. Visual appearance is identical
4. User experience unchanged

### Contributing

When adding features:
1. Keep modules focused and single-purpose
2. Add error handling for any new functionality
3. Update relevant configuration in `config.js`
4. Maintain visual consistency with existing design
5. Test across browsers

---

*Based on High Elf (Sun/Moon) naming conventions. Wood Elf and Drow follow similar but distinct patterns.*
