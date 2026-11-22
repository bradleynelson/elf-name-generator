# Faerûn Name Generator

Elf and drow names for Dungeons & Dragons, built from official and licensed Forgotten Realms material and the naming
systems published for them, with the meaning and sources of every component shown.

**Live site:** [espruar.com](https://espruar.com)

---

## Using the generator

Choose a gender (neutral, female or male) and a lineage (any, sun elf, moon elf, wood elf or drow), then press
**Roll Name** or the spacebar.

- **Meanings above the name:** each word shows what its components mean. A family name published with a translation
  (such as Galanodel, "Moonwhisper") shows that translation.
- **Choose a component:** tap any component of a name to see every option that fits, with its meaning or source.
- **Lock a component:** lock it to keep it while the rest of the name changes.
- **Expanded Variety:** the wand mixes in components taken from published Forgotten Realms names. Their meanings are
  unknown and marked as such.
- **Roll 10 More, History and Saved names:** history and saved names are kept only in your browser.
- **Name meanings and sources:** the breakdown under each name lists every component with its meaning or the
  published names it comes from, and every book it appears in.

Each name is also shown in Espruar, the elven alphabet (drow names in the High Drowic font).

## How names are built

**Surface elves.** First names come from the elven name tables in _Races of the Wild_ (3.5e), first published as
"By Any Other Name" in _Dragon_ #251: a prefix and one or more suffixes, each with its own meaning, in the shapes the
tables give. Suffixes take male or female forms where the tables list them; neutral names use the forms shared by
both. Family names are published Forgotten Realms family names (with their translation when a book gives one), new
ones built from the same tables, or English names made from two words found in published English family names.

**Drow.** Names come from the tables in "By Any Other Name: The Drow" (_Dragon_ #267), with their published meanings.
Houses are published Forgotten Realms houses or built from the same article's house tables. Drow naming taboos from
_The Drow of the Underdark_ (2e) are respected: no names resembling drow deities, and no house names beginning with the
"L" sound of Lolth.

**Sources.** About 3,500 published elf and drow names from about 600 books and magazines: official and licensed
Forgotten Realms material and setting-neutral core rulebooks. Fan products and community-written content (such as Dungeon Masters
Guild titles) are not used. A small number of names come from Ed Greenwood, who created the Forgotten Realms: his
answers to fans and his own book _The Border Kingdoms_. They are not official publications, so they are labelled on
the page.

**How many names.** Counting every name shape, every component that fits each slot and every family name, the name
tables alone allow over a quadrillion theoretically possible combinations (about 1.8 quadrillion for neutral names).
With Expanded Variety on, that rises past 300 quintillion for neutral names and past 15 sextillion for female or male
names. The count multiplies slot choices, so a few spellings repeat.

## Species

Version 4 is a ground-up rebuild focused on elves and drow. Other species (dwarves, gnomes, halflings and orcs) are not
available while each is reviewed against published sources; they will return as they meet the same standard.

---

## Development

A static site: HTML, one stylesheet and vanilla JavaScript modules, with no framework or build step for the page.

```
index.html               page structure, lore and footer
style.css                theme tokens, page basics, components
js/app.js                page state and controls
js/ui.js                 rendering
js/favorites.js          saved names, history and remembered settings (browser storage)
js/analytics.js          consent and Google Analytics events (see ANALYTICS.md)
js/core/                 name generators (elf, drow) and shared helpers
data/                    name tables and published names (JSON)
fonts/                   Dalelands Uncial, Espruar, High Drowic, Lato (SIL Open Font License)
tests/                   Vitest tests (generators, storage, rendering, page flows)
scripts/release-site.js  builds dist/ from the approved file list in release-files.json
scripts/version.js       bumps the version, cache stamps and changelog
```

Needs Node.js 24 and npm. The page loads ES modules and JSON, so preview it over HTTP (for example
`python -m http.server 8000`), not by opening the file.

```bash
npm ci
npm run check
```

`npm run check` is the same local quality gate CI uses: lint and formatting, duplication and unused-code checks,
coverage-gated tests, release safeguards, and a verified release build.

Releases publish only the files listed in `release-files.json` (built into `dist/` and checked by
`npm run check:release`). Merging a release into `main` publishes it once the tests pass; see
[.github/RELEASING.md](.github/RELEASING.md).

## License and credits

Code: MIT License, copyright (c) 2025 Brad Nelson. Names and naming data are drawn from Wizards of the Coast
publications and remain their property.

Fonts: Dalelands Uncial, Espruar and High Drowic by Neale Davidson, [Pixel Sagas](https://www.pixelsagas.com) (SIL
Open Font License); the site icon is from his dPoly Gamedings font. Icons from [Lucide](https://lucide.dev) (ISC).

Faerûn Name Generator is unofficial Fan Content permitted under the
[Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved/endorsed by Wizards.
Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
