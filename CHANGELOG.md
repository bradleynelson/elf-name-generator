# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.3.0] - 2025-12-12

### Added

- **History Section**: Added a new "History (Last 10 Names)" accordion section that displays the last 10 generated names, allowing users to click on any name to restore it as the current generated name
- **Spacebar Keybind**: Added spacebar keyboard shortcut to generate a new name (works when not focused on form inputs)
- **Desktop Helper Text**: Added "Click or Press Spacebar" helper text under the Generate Name button on desktop (hidden on mobile)

### Changed

- **Gnome Name Randomization**: Enhanced anti-repeat logic for Gnomish name generation to prevent immediate repetition of personal names, clan names, and nicknames
- **Mobile Name Display**: Fixed name overflow on mobile devices - names now wrap properly instead of running off the screen
- **Mobile UI**: Hidden title sword icons on mobile devices for cleaner mobile experience

### Fixed

- **Mobile Overflow**: Fixed issue where long names would overflow horizontally on mobile devices
- **Gnome Repetition**: Addressed repetition issues in Gnome name generation with improved anti-repeat tracking

## [3.2.2] - 2025-12-12

### Fixed

- **High Elf Name Generation**: Fixed issue where Drow-tagged components (including famous characters like Drizzt and Jarlaxle) were appearing in High Elf, Sun Elf, Moon Elf, and Wood Elf names
- **Famous Character Names**: Famous character names (like Drizzt, Jarlaxle) are now used as complete names when selected in simple mode, preventing awkward combinations
- **Famous Name Frequency**: Reduced frequency of famous character names appearing for non-Drow Elven subraces (95% bias against selection)

## [3.2.1] - 2025-12-12

### Fixed

- Version number correction in index.html

## [3.2.0] - 2025-12-12 - "The Name Generator Level-Update"

### Added

- **Massive Component Expansion**: Added 531 new components across all generators (+133% overall)
    - **Elven Components**: Added 65 new components including Drow houses (Do'Urden, Baenre, Agrach Dyrr), famous character names (Drizzt, Jarlaxle, Coran, etc.), and expanded Drow-specific components
    - **Dwarven Names**: Added famous Dwarf characters (Bruenor, Pwent, Gundren, etc.) from BG2, BG3, and Salvatore novels; expanded clan names
    - **Gnomish Names**: Added 57 personal names from Volo's Guide & Mordenkainen's Tome; expanded clan names from 5 to 33 (+560%); expanded nicknames from 5 to 49 (+880%)
    - **Halfling Names**: Added 58 personal names from Mordenkainen's Tome; expanded family names from 10 to 63 (+530%); expanded nicknames from 10 to 65 (+550%)
    - **Orc Names**: Added 24 personal names from Volo's Guide; added 12 clan names; expanded epithets from 30 to 82 (+173%)

- **Pattern-Based Naming Systems**: Implemented pattern-based name generation for Gnomes, Halflings, and Orcs
    - All pattern-based names clearly marked with "(pattern-based)" in meanings
    - Official sources properly attributed
    - Follows official D&D naming conventions

- **Drow Generation Improvements**: Major formula enhancements
    - Root repetition prevention (max 2 occurrences per name)
    - Adjusted component selection weighting for Drow-specific components
    - Neutral fallback for Drow selection
    - Adaptive minimum syllables (4-6 for Drow females)
    - Simple-mode guard (prevents prefix.root === suffix.root)
    - Famous component guard (prevents too many famous+famous combinations)
    - Lore accuracy: Prevented Drow from using Moon Elf components

### Changed

- **Component Quality**: All pattern-based names now clearly marked; official sources properly attributed
- **Source String Formatting**: Removed .md extensions, combined duplicate sources, improved readability
- **Display Improvements**: Fixed double parentheses in component breakdowns
- **Name Generation Logic**:
    - Gnome clan names now use single components (not combined) to prevent overly long names
    - Halfling/Gnome personal names prevent combining two complete names
    - Proper capitalization for clan/family names

### Fixed

- **Long Name Issue**: Prevented combining complete names (e.g., "Qualnusderukoskai" → "Qualnus" or "Derukoskai")
- **Double Parentheses**: Fixed breakdown display showing "(pattern-based)" instead of "((pattern-based))"
- **Source Deduplication**: Fixed duplicate source strings in generated name meanings
- **Clan Name Capitalization**: Fixed lowercase clan names (e.g., "crystalwhistle" → "Crystalwhistle")

### Updated

- Test suite for all generator improvements
- Documentation with comprehensive improvement metrics
- All JSON data files cleaned and structured appropriately

## [3.1.5] - 2025-12-07

### Patch

- Consolidated desktop tabs into a single stack, fixed their anchor to the container, and adjusted z-index to sit behind content; narrowed secondary tabs while keeping left alignment.
- Tweaked desktop tab offset for precise alignment and consistent small-tab borders (including Mail).
- Mobile “More” menu now overlays above the nav bar instead of pushing it upward.
- Prevented ALFA badge flicker by keeping it in-DOM with visibility toggling.

## [3.1.3] - 2025-12-07

### Patch

- Added contact “Mail” tab and modal with mailto and zero-backend note.
- Clarified ALFA/BETA tooltips, help cursors, and favorites icon/label alignment.
- Updated disclaimer and MIT license popover styling/copyright language.
- Fixed Gnomish component breakdown so personal/nickname/clan render separately.
- Softened popover backgrounds and refined small-tab styling.

## [3.1.0] - 2025-12-07

### Added

- **Gnomish (Gnim) Generator (ALFA)**: Personal + clan + optional nickname; rock/forest/deep subraces; copper/green theme and icons.
- **Halfling (Hin) Generator (ALFA)**: Personal + family + optional nickname; Lightfoot/Strongheart, Stout, Ghostwise; dagger theme.
- **Orc Generator (ALFA)**: Personal + epithet (no surname); Mountain/Gray/Half-Orc/Orog flavoring; vibrant orc-green theme.
- **Data & Loaders**: Gnomish, Halfling, Orc JSON pools and loaders (`loadGnomishGeneratorData`, `loadHalflingGeneratorData`, `loadOrcGeneratorData`).
- **Tests**: Unit coverage for all three new generators; integration updates to load and switch Gnomish/Halfling/Orc tabs.

### Changed

- **UI/UX**: Mobile bottom nav is full-width with “More” overflow; Orc controls simplified (shared pool); Orcish kindred lore refreshed with examples.
- **Favorites & Badges**: Filters/icons for Gnomish, Halfling, Orc; badges show ALFA for new species.
- **Metadata**: Descriptions now highlight Espruar depth and multi-species support.

### Fixed

- Mobile nav height/position regressions after adding new tabs.

## [3.0.2] - 2025-12-04

### Changed

- **Updated Dwarven Clan Name Algorithm** - Clan names can now mix English words and Dethek components (e.g., "Stonegrim", "Bronguard", "Hammerdel")
- **Added Potential Combination Numbers** - Updated dropdown labels to show combination counts:
    - Elven Complexity: Auto (Over 5M), Simple (Over 260K), Complex (Over 10B)
    - Dwarven Name Type: Full Name (Over 29M), First Name (Almost 3k), Clan Name (Almost 10k)

## [3.0.1] - 2025-12-04

### Fixed

- **Meta Tags for Social Sharing** - Updated Open Graph and Twitter Card meta tags to include Dwarven generator
- **SEO Metadata** - All meta descriptions now mention both Elven and Dwarven naming systems

### Added

- **Domain-Based Defaults** - dethek.com (or dethek subdomain) automatically defaults to Dwarven tab
- **URL Parameter Support** - `?generator=dwarven` or `?tab=dwarven` to force generator type

## [3.0.0] - 2025-12-04 - "Dwarf Update"

### Added

- **Dwarven Name Generator (Beta)** - Complete Dethek naming system implementation
    - Support for Gold Dwarves, Shield Dwarves, and Duergar subraces
    - First name, clan name, and full name generation
    - Gender-specific name generation (Male/Female/Neutral)
    - Dwarven phonetic rules with consonant cluster smoothing
- **Unified Generator Architecture** - Single codebase managing both Elven and Dwarven generators
- **Tab System** - Seamless switching between generators
    - Desktop: Vertical tabs on right side of container
    - Mobile: iOS-style floating bottom navigation bar
- **Enhanced Favorites System**
    - Generator type badges (⚔️ Elven / ⚒️ Dwarven) for visual identification
    - Filter buttons (All / Elven / Dwarven) for easy navigation
    - Unified storage supporting both generator types
    - Automatic migration from legacy separate storage
- **Dwarven Educational Content** - Complete lore section with 4 accordions:
    - Dwarven Races of Faerûn (including obscure subraces)
    - Understanding Dwarven Names
    - Dwarven Pronunciation Guide
    - A Brief History of the Khazad (with timeline)
- **External Link Indicators** - U+29C9 (⧉) icons on Ko-fi and GitHub tabs
- **Test Logging System** - Automatic tracking of test updates and runs
- **Remember Last Generator** - LocalStorage preference for default tab
- **Domain-Based Defaults** - dethek.com automatically defaults to Dwarven tab
- **URL Parameter Support** - `?generator=dwarven` or `?tab=dwarven` to force generator type

### Changed

- **Site Renamed** - "Elven Name Generator" → "Faerûn Name Generator"
- **Theme Simplification** - Removed Sun Elf, Wood Elf, and Drow themes
    - Single Moon Elf theme for Elven generator
    - Dedicated Dwarven theme (gold/steel palette)
- **Educational Content Reorganization**
    - "Elven Races of Faerûn" moved to first position
    - Elven history section restructured to match Dwarven format
    - Both histories now include detailed timelines
- **Mobile Responsive Design** - Complete overhaul
    - Fixed bottom navigation bar (iOS-style)
    - Proper tab spacing and alignment
    - Beta badge repositioned for mobile
    - Generate button margins adjusted
- **Accessibility Improvements**
    - Comprehensive ARIA attributes throughout
    - Filter buttons with `aria-pressed` states
    - Accordion `aria-controls` linking
    - Tab icons marked as decorative
    - External links indicate "Opens in new window"
- **Dwarven Phonetic Rules** - Prevents unpronounceable consonant clusters
    - Triple consonant reduction (e.g., "Auddd" → "Audd")
    - Harsh cluster smoothing (preserves valid "unn" patterns)
- **Footer Links** - Ko-fi and GitHub tabs added to navigation

### Fixed

- Tab positioning and z-index issues
- Active tab visual states on mobile
- Dwarven settings showing Elven controls
- Generate button icon updates for Dwarven subraces
- Favorites filter functionality
- Toast notification positioning (moved up after theme button removal)

### Updated

- Test suite for unified architecture
- FavoritesManager tests for generator type tagging
- Accessibility tests for new ARIA attributes
- Documentation and copy throughout site

## [2.7.3] - 2025-12-03

### Added

- Accessibility tests for ARIA attributes and screen reader support
- Hover effect on generator accordions (brightens/darkens background based on theme)

### Changed

- Improved TTS phonetic pronunciation for multiple names (Queesastra, Ah-rahn-ee-ehl, Ayl-ih-rah-dorr, Tanenfelle, Corastra, Zhaunanidorei, Valastra, Myreathala, Vaelellathir, Anariel, Alador, Menalathar, Quessamith, Liatana)
- Sun Elf theme accordion hover effect now darkens instead of brightens (better contrast on light background)

## [2.7.2] - 2025-12-03

### Changed

- Various minor updates and fixes

## [2.0.0] - 2025-01-XX

### Added

- Complete refactor with modular ES6 architecture
- Wood Elf support
- Drow support (Beta)
- Complex Mode implementation (3+ component names)
- Light/Dark theme system
- Phonetic pronunciation display
- Favorites system with localStorage
- Testing framework (Vitest)
- Automated versioning system

### Changed

- Migrated from single-file to modular architecture
- Improved code organization and maintainability
- Enhanced name generation algorithm

---

## Version Numbering Guide

- **Major (X.0.0)**: Complete refactors, major architectural changes
    - Example: v1 → v2 (complete refactor)
- **Minor (x.X.0)**: Major feature additions
    - Example: Adding phonetic voice reader, new subrace support
- **Patch (x.x.X)**: Bug fixes, minor enhancements, small updates
    - Example: UI tweaks, performance improvements, small fixes
