# Faerûn Name Generator

A sophisticated web-based name generator for creating authentic Elven, Dwarven, Gnomish (Gnim), Halfling (Hin), and Orc names following Forgotten Realms D&D lore. Supports High Elves, Wood Elves, Drow (Beta), Dwarves, Gnomes, Halflings, and Orcs!

**Live Site:** [https://espruar.com](https://espruar.com)

---

## 🎮 How to Use

Simply visit **[espruar.com](https://espruar.com)** to start generating authentic Elven and Dwarven names! No download or installation required - everything runs in your browser.

### Generator Types

**⚔️ Elven (Espruar):** Generate names following the Espruar naming system  
**⚒️ Dwarven (Dethek):** Generate names following the Dethek naming system  
**⚙️ Gnomish (Gnim):** Generate names for rock/forest/deep gnomes with personal + clan + optional nickname  
**🗡️ Halfling (Hin):** Generate names for Lightfoot/Strongheart, Stout, and Ghostwise; personal + family with optional nickname
**🪓 Orc:** Generate names for Mountain/Gray/Half-Orcs/Orogs with personal + clan + optional epithet

Switch between generators using the tabs at the top of the page.

### Generation Controls

**Elven Subrace:** Choose High Elf (General/Sun/Moon), Wood Elf, or Drow (Female/Male)

**Dwarven Subrace:** Choose from various Dwarven subraces (Gold Dwarf, Shield Dwarf, etc.)

**Name Complexity:**
- **Auto:** Follows phonetic rules, adds connectors when needed
- **Simple:** 2 components, no connectors
- **Complex Mode (Experimental):** 2-4 components, syllable-driven, multiple connectors

**Target Syllable Count:** 3-position slider
- Short (2-3 syllables)
- Ideal (3-5 syllables) - Default
- Long (4-6 syllables)

*Note: Wood Elves and Drow automatically adjust targets based on subrace rules*

**Gender/Style:**
- Neutral, Feminine (softer sounds), Masculine (stronger sounds)

---

## 🌟 Features

### Core Generation
- **Elven Generator:**
  - **120+ Components**: Comprehensive morphological system with 108 High Elf + 12 Drow-specific components
  - **Interchangeable System**: Implements the "Lego System" where most roots can function as prefix or suffix
  - **Phonetic Intelligence**: Applies authentic Elven phonetic flow patterns (liquid consonants, vowel bridges, harsh cluster detection)
  - **Multiple Subraces**: High Elf (General, Sun, Moon), Wood Elf, and Drow (Female/Male) with distinct naming rules

- **Dwarven Generator:**
  - **First Names + Clan Names**: Combines authentic Dwarven first names with clan names
  - **Dethek System**: Follows traditional Dwarven naming conventions from Forgotten Realms
  - **Multiple Subraces**: Supports various Dwarven subraces with appropriate naming styles
  - **Phonetic Pronunciations**: Includes pronunciation guides for generated names

- **Gnomish Generator (Gnim):**
  - **Personal + Clan + Nickname**: Full names with optional nickname; personal-only, clan-only, and nickname-only modes
  - **Subraces**: Rock, forest, and deep gnomes with iconography (⚙️, 🌿, ⛏️)
  - **Phonetic-friendly**: Vowel-rich, soft consonant patterns; nickname toggle via name type selection

- **Halfling Generator (Hin):**
  - **Personal + Family + Nickname**: Full names default to include nicknames; personal-only, family-only, nickname-only modes
  - **Subraces**: Lightfoot/Strongheart, Stout, Ghostwise with dagger icon for the tab
  - **Style**: Warm, nickname-friendly names; Ghostwise nicknames are rarer/formal-use only

- **Orc Generator:**
  - **Personal + Clan + Epithet**: Full names default to include an epithet; personal-only, clan-only, epithet-only modes
  - **Subraces**: Mountain, Gray, Half-Orc, Orog
  - **Style**: Short, harsh roots; epithets for deeds (Skull-Taker, Ironhide)

### User Experience
- **Moon Elf Theme**: Dark blue-purple theme with silver/moonlight palette
- **Complexity Control**: Auto, Simple, or Complex Mode (2-4 components with sophisticated rules)
- **Syllable Targeting**: 3-position slider (Short, Ideal, Long) with subrace-specific adjustments
- **Favorites System**: Save your favorite names locally (browser-only, no cloud sync)
- **Anti-Repeat Logic**: Tracks last 5 generations to reduce repeats
- **Accessibility**: WCAG 2.1 AA compliant, screen reader support, keyboard navigation
- **Mobile Navigation**: Full-width, scrollable bottom bar with “More” overflow for future generators
- **Gnomish Theme**: Copper + green palette; copper beta badge and generate button
- **Halfling Theme**: Warm earthy/gold palette; dagger tab and active states

### Modern Architecture
- **Modular ES6**: Clean separation of concerns (Core, UI, Utils, Data)
- **Responsive Design**: Works on desktop, tablet, and mobile
- **No Dependencies**: Pure vanilla JavaScript, no frameworks
- **GDPR Compliant**: Cookie consent for Google Analytics

## 🎭 Subrace Support

### ⚔️ Elven Subraces

#### High Elf (Ar-Tel-Quessir / Teu-Tel-Quessir)
**Style:** Lyrical, flowing, 3-5 syllables  
**Themes:** Light, nobility, magic, stars, moon  
**Components:** 108 interchangeable morphemes  
**Example:** *Silanmeriel* - "Silver + Spirit + Star + Maiden"

#### Sun Elf Variant
Emphasizes gold, light, nobility, ancient lore (formal)

#### Moon Elf Variant  
Emphasizes silver, moonlight, stars, flow (lyrical, 4+ syllables preferred)

### Wood Elf (Sy-Tel-Quessir) ✅
**Style:** Concise, martial, 2-3 syllables  
**Themes:** Nature, vigilance, martial skill  
**Key Differences:**
- Shorter than High Elves (2-3 vs 3-5 syllables)
- Minimal connectors (prefer rough edges)
- Hard consonant endings (-th, -r, -s)
- Prioritizes martial/nature components

**Example:** *Ratheth* - "Path + Honor"

### Drow (Ss'tel'Quessir) ⚠️ BETA
**Style:** Gender-specific, harsh, chaotic  
**Themes:** Lolth, spiders, poison, death, shadow, servitude  
**Key Differences:**
- **Female:** 4-6 syllables, complex, powerful, vowel endings
- **Male:** 2-3 syllables, short, subservient, hard consonant endings
- EMBRACES harsh clusters (gr-, kr-, dr-, tr-) that surface elves avoid
- No connectors (deliberately clumsy sound)
- Limited component pool (12 vs 108) - more coming soon!

**Examples:**  
- Female: *Pharaqiltyl* - "Mistress + Web + Venom"
- Male: *Zhaunax* - "Death + Blade"

### ⚒️ Dwarven Subraces

#### Gold Dwarf (Shield Dwarf)
**Style:** Traditional, honor-bound, clan-focused  
**Themes:** Gold, honor, tradition, craftsmanship  
**Structure:** First Name + Clan Name  
**Example:** *Thorin Ironforge* - "Bold + Ironforge Clan"

#### Shield Dwarf (Mountain Dwarf)
**Style:** Strong, resilient, mountain-dwelling  
**Themes:** Mountains, strength, endurance, stone  
**Structure:** First Name + Clan Name  
**Example:** *Balin Stonebeard* - "Mighty + Stonebeard Clan"

#### Other Dwarven Subraces
The generator supports various Dwarven subraces from Forgotten Realms, each with appropriate naming conventions and clan associations.

**Key Features:**
- **First Names**: Authentic Dwarven first names with meanings
- **Clan Names**: Traditional clan names that can be combined with first names
- **Phonetic Pronunciations**: Includes pronunciation guides for proper Dwarven speech
- **Cultural Accuracy**: Follows Dethek naming traditions from D&D lore

---

## 📜 License

MIT License - Copyright (c) 2025 Brad Nelson

Free to use, modify, and distribute with attribution.

## 🙏 Credits

**Lore Research:** Forgotten Realms D&D canon sources, official WotC materials, community lore documentation

**Created by:** Brad Nelson for the D&D community

**Disclaimer:** This is an unofficial fan-made tool. Not affiliated with or endorsed by Wizards of the Coast. D&D and Forgotten Realms are trademarks of Wizards of the Coast LLC.

## 🔮 Future Plans

### Potential Expansions
- [ ] More Drow components (expand from 12 to ~30+)
- [ ] Sea Elf (Mar-Tel-Quessir) variant
- [ ] Gray Elf (Fae-Tel-Quessir) variant  
- [ ] Surname generator
- [ ] Export/share functionality
- [ ] Cloud sync for favorites (with accounts)
- [ ] Mobile app version
- [ ] Additional language variants (Draconic, Dwarvish)

---

## 🛠️ Technical Details (For Developers)

### File Structure
```
/
├── index.html              # Main page (semantic HTML5)
├── style.css               # All styling (~1600 lines)
├── favicon.ico/png         # Gold star icons
├── LICENSE                 # MIT License
├── README.md               # This file
├── CNAME                   # Domain configuration
│
├── js/
│   ├── app.js              # Main application controller
│   ├── config.js           # Constants and configuration
│   │
│   ├── core/
│   │   ├── NameGenerator.js         # Elven name generation logic
│   │   ├── DwarvenNameGenerator.js   # Dwarven name generation logic
│   │   └── FavoritesManager.js       # LocalStorage favorites
│   │
│   ├── ui/
│   │   └── UIController.js       # DOM manipulation & display
│   │
│   └── utils/
│       ├── dataLoader.js         # JSON data loading
│       ├── phonetics.js          # Syllable counting, flow rules
│       └── storage.js            # LocalStorage helpers
│
└── data/
    ├── components.json          # 120 Elven name components with tags
    ├── connectors.json          # 23 phonetic bridges
    ├── dwarvenFirstNames.json   # Dwarven first names
    └── dwarvenClanNames.json    # Dwarven clan names
```

### Technologies
- **Frontend:** Pure ES6 JavaScript (modules), CSS custom properties
- **Fonts:** Lato (Google Fonts) with system fallbacks
- **Storage:** LocalStorage for preferences and favorites
- **Analytics:** Google Analytics (GDPR-compliant, opt-in)
- **Hosting:** GitHub Pages with custom domain

### Key Features

**Complex Mode:**
- Syllable-driven (not component-driven)
- Supports 2-4 components with 0-3 connectors
- Vowel repetition logic (Moon Elves, 33% chance)
- Harsh cluster detection and avoidance
- Minimum 2 components, 2 syllables enforced

**Phonetic Rules:**
- Liquid consonant detection (L, R, N, M, W)
- Hard consonant endings (K, P, T, B, D, G, etc.)
- Vowel flow patterns
- Connector insertion logic (subrace-specific)

**Anti-Repeat System:**
- Tracks last 5 generated names
- Filters out recently used components
- Only applies if 10+ alternatives available
- Prevents pool exhaustion

## 📊 Data Structure

### Components (components.json)
Each component has:
- `root`: Unique identifier
- `prefix_text` / `prefix_meaning`: For use as prefix
- `suffix_text` / `suffix_meaning`: For use as suffix
- `can_be_prefix` / `can_be_suffix`: Position flexibility
- `is_gender_modifier`: Special handling flag
- `tags`: Array for subrace filtering (`sun`, `moon`, `wood`, `drow`, `drow-female`, `drow-male`, `neutral`)

### Connectors (connectors.json)
Each connector has:
- `text`: The connector string (e.g., "-ri-")
- `function`: Technical description
- `meaning`: Semantic meaning (optional, displayed in Complex Mode)

## 🎨 Design System

### Themes
**Sun Elf (Light Mode):**
- Background: Aged parchment (#f4e8d0)
- Accent: Warm gold (#8b6914)
- Contrast: 11.5:1 (primary), 9.2:1 (secondary)

**Moon Elf (Dark Mode):**
- Background: Deep blue gradient (#1a1a2e → #16213e)
- Accent: Cool gold (#c9a050)
- Contrast: WCAG AA compliant

### Typography
- **Primary:** Lato (300, 400, 700, 900 weights)
- **Fallbacks:** System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI')
- **Code:** 'Courier New' for examples only

## 🧪 Testing

### Validated With
- Google's Rich Results Test (structured data)
- WAVE accessibility checker
- Lighthouse (Chrome DevTools)
- Cross-browser: Chrome, Firefox, Safari, Edge

### Test Checklist
- [ ] Keyboard navigation (Tab through all controls)
- [ ] Screen reader announcements
- [ ] Mobile responsiveness
- [ ] Theme switching
- [ ] All subrace options
- [ ] Complex Mode with 3+ components
- [ ] Favorites save/load
- [ ] Anti-repeat logic
- [ ] Cookie consent flow

## 🚀 Deployment

1. Push to GitHub repository
2. Enable GitHub Pages (Settings → Pages)
3. Set custom domain in CNAME file
4. Configure DNS (A records or CNAME)
5. SSL auto-generates (10-30 minutes)

## 📜 License

MIT License - Copyright (c) 2025 Brad Nelson

Free to use, modify, and distribute with attribution.

## 🙏 Credits

**Lore Research:** Forgotten Realms D&D canon sources, official WotC materials, community lore documentation

**Created by:** Brad Nelson for the D&D community

**Disclaimer:** This is an unofficial fan-made tool. Not affiliated with or endorsed by Wizards of the Coast. D&D and Forgotten Realms are trademarks of Wizards of the Coast LLC.

## 🔮 Future Plans

### Potential Expansions
- [ ] More Drow components (expand from 12 to ~30+)
- [ ] Sea Elf (Mar-Tel-Quessir) variant
- [ ] Gray Elf (Fae-Tel-Quessir) variant  
- [ ] Surname generator
- [ ] Export/share functionality
- [ ] Cloud sync for favorites (with accounts)
- [ ] Mobile app version
- [ ] Additional language variants (Draconic, Dwarvish)

### Known Limitations
- Drow currently has limited component pool (Beta)
- No cloud sync (browser-only favorites)
- LocalStorage has size limits (~5-10MB)
- Complex Mode may occasionally generate longer names than target

## 📝 Version History

### v3.2.0 - Halfling Generator
- Added Halfling (Hin) generator with personal/family/nickname options, dagger tab, warm theme, and lore section
- Added halfling data loader, JSON pools, and tests
- Favorites filter and integration updated for halfling/gnomish types

### v3.1.0 - Gnomish Generator & Mobile Nav
- Added Gnomish (Gnim) generator with personal/clan/nickname modes and rock/forest/deep subraces
- Copper + green gnomish theme; updated mobile bottom nav to full-width, scrollable with “More” overflow
- Added unit/integration coverage for gnomish generator and app wiring

### v2.0 - Major Refactor
- Modular ES6 architecture
- Added Wood Elf support
- Added Drow support (Beta)
- Complex Mode implementation
- Moon Elf theme
- Anti-repeat logic
- Stacked meaning display
- GDPR compliance

### v1.0 - Initial Release
- Monolithic JavaScript (~1500 lines)
- High Elf (Sun/Moon) only
- Basic component system
- Favorites functionality

---

*"The name is the first gift given to a child by their parents. Choose wisely."*  
— Elven Proverb