# High Elf Name Generator

A web-based name generator for creating authentic High Elf names following the Espruar naming system from Forgotten Realms D&D lore.

## Features

- **Linguistic Accuracy**: Follows the complete Espruar morphological system with 108+ components
- **Interchangeable Components**: Implements the "Lego System" where most roots can function as either prefix or suffix
- **Phonetic Rules**: Applies authentic Elven phonetic flow patterns (liquid consonants, vowel bridges, etc.)
- **Final Vowel Options**: Suggests optional aesthetic vowel endings based on syllable count and consonant hardness
- **Gender/Style Options**: Generate feminine, masculine, or neutral names with appropriate component selection
- **Complexity Control**: Choose simple (2 components) or complex (3 components with connectors) names
- **Favorites System**: Save your favorite generated names locally
- **Component Breakdown**: See the meaning and structure of each generated name

## Usage

Simply open `index.html` in a web browser. No server or installation required - runs completely client-side.

### Controls

- **Name Complexity**: Auto (follows phonetic rules), Simple, or Complex
- **Target Syllable Count**: 2-6 syllables (ideal is 3-5 per Elven naming conventions)
- **Gender/Style**: Neutral, Feminine (softer sounds), or Masculine (stronger sounds)

## Naming System

This generator is based on extensive research into Forgotten Realms High Elf naming conventions:

- **Prefixes**: 56 morphemes with meanings like "eternal," "warrior," "star," etc.
- **Connectors**: 23 phonetic bridges for smooth sound transitions
- **Suffixes**: 58 morphemes including role indicators and gender modifiers
- **Rules**: Follows canonical restrictions (gender modifiers stay as suffixes, strong prefixes don't swap, etc.)

### Example Names

- **Aelriel** - "Warrior Maiden" (Feminine)
- **Merikian** - "Star Slayer" (Masculine)  
- **Silwendae** - "Silver Fair Whisper" (Neutral, with final vowel)

## Technical Details

- Pure HTML/CSS/JavaScript - no dependencies
- Local storage for favorites persistence
- Responsive design
- ~108 interchangeable components following lore-accurate rules

## Files

- `index.html` - Main page structure
- `style.css` - All styling and theming
- `script.js` - Name generation logic and component data
- `LICENSE` - MIT License

## Credits

Morphological system and naming rules compiled from Forgotten Realms D&D canon sources. Component data researched through official materials and community lore documentation.

Generator created by Brad Nelson for the D&D community.

## License

MIT License - See LICENSE file for details. Free to use, modify, and distribute with attribution.

---

*Based on High Elf (Sun/Moon) naming conventions. Wood Elf and Drow follow similar but distinct patterns.*
