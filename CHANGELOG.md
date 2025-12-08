# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
