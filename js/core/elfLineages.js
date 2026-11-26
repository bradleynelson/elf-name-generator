// What makes each elf lineage's names differ, as data the elf generators read in place of knowing the lineage.
// Which records a lineage gets is its rule set's `reads` in generators.js, not repeated here.
import { OWN_LINEAGE_WEIGHT } from "./nameRolls.js?v=4.3.0";
import { DROW, SEX } from "./species.js?v=4.3.0";
import { NAME_TYPE } from "./speciesData.js?v=4.3.0";

/**
 * @typedef {Object} ElfLineageRules
 * @property {string} lineage - the stored lineage value, used only to tell records tied to it from the rest
 * @property {string} nameLabel - what its names are called when none can be made ("an elf name")
 * @property {number} [ownWeight] - how much likelier surnames and words tied to this lineage are than the rest
 * @property {boolean} [standsForAny] - true: it stands for any surface elf, so its share of Common-form surnames is
 *   measured over every published family name
 * @property {string} givenKeys - the key prefix of first-name slots (saved names keep these keys)
 * @property {{ shape: string[], weight: number }[]} shapes - first-name shapes; the first is the short name and the
 *   second the long one for the structure controls
 * @property {number} compoundShape - the index of the shape the compound-name control adds or removes
 * @property {Object<string, SlotRules>} slots - how a prefix and a suffix slot read the first-name table
 * @property {import("./spelling.js?v=4.3.0").SpellingRules} spelling - its limits; `longKeep` is the roll's keep
 *   chance by sex
 * @property {boolean} [judgesWholeName] - true: a name is long when any of its words is (one keep chance per name);
 *   left out, each word is judged by its part after an apostrophe
 * @property {{ letters: string[], basis: string }} [joins] - the letters an awkward join may take, and their source;
 *   left out, components are joined as they are
 * @property {number} [femaleUsesMaleForm] - the chance a female name's component takes the male spelling
 * @property {{ builtFrom: string, refusedPrefixStart?: RegExp }} surname - the table a built surname comes from: the
 *   first-name table (a family name, with published and Common-form names) or the house table (a house, its meaning
 *   read as one phrase), and for a house the start no prefix may have
 */

/**
 * @typedef {Object} SlotRules
 * @property {boolean} [sexed] - true: each sex takes its own entries and spellings; left out, every entry's main spelling
 * @property {boolean} [drawsSpelling] - true: one of an entry's alternate spellings at random; left out, the first
 * @property {boolean} [splitsPairedMeaning] - true: a "Lord/Lady" meaning reads "Lord" on a male name and "Lady" on a
 *   female one
 */

// Chosen: a roll keeps a four-syllable word with this chance so they stay uncommon (applied per word).
const SURFACE_LONG_KEEP = 0.3;
// Sourced: the elven name tables of Races of the Wild (3.5e, pp30-31), a reprint of "By Any Other Name" (Dragon #251)
/** @type {Omit<ElfLineageRules, "lineage">} */
const SURFACE = {
    nameLabel: "an elf name",
    ownWeight: OWN_LINEAGE_WEIGHT,
    givenKeys: "t",
    // Sourced: Races of the Wild Table 1-1 / Dragon #251 Table 1 (40/30/20/10). Chosen: the apostrophe shape
    // lowered to 5, since published Forgotten Realms elf names almost never have one (3 of about 1,050).
    shapes: [
        { shape: ["prefix", "suffix"], weight: 40 },
        { shape: ["prefix", "suffix", "suffix"], weight: 30 },
        { shape: ["prefix", "suffix", " ", "prefix", "suffix", "suffix"], weight: 20 },
        { shape: ["suffix", "'", "prefix", "suffix", "suffix"], weight: 5 }
    ],
    // Chosen: the compound name, the two-word shape's second word, is added or removed whole.
    compoundShape: 2,
    // Sourced: the tables give "alternate spellings" and print paired meanings male first ("Lord/Lady")
    slots: { prefix: {}, suffix: { sexed: true, drawsSpelling: true, splitsPairedMeaning: true } },
    // Inferred: published personal names have 4-11 letters and 2-4 syllables, about 10% with four.
    spelling: {
        minLetters: 4,
        maxLetters: 11,
        minSyllables: 2,
        maxSyllables: 4,
        longSyllables: 4,
        longKeep: { [SEX.FEMALE]: SURFACE_LONG_KEEP, [SEX.MALE]: SURFACE_LONG_KEEP, [SEX.NEUTRAL]: SURFACE_LONG_KEEP }
    },
    // Sourced (Dragon #251): a join that sounds wrong may "add an a, e, i, l, r, s, sh, or an apostrophe". Chosen: only
    // where the consonants never meet in a published elf name; apostrophes come only from the apostrophe shape.
    joins: { letters: ["a", "e", "i", "l", "r", "s", "sh"], basis: "Dragon #251" },
    surname: { builtFrom: NAME_TYPE.GIVEN }
};

/** @type {Object<string, ElfLineageRules>} */
export const ELF_LINEAGE_RULES = {
    "high-elf": { ...SURFACE, lineage: "high-elf", standsForAny: true },
    "sun-elf": { ...SURFACE, lineage: "sun-elf" },
    "moon-elf": { ...SURFACE, lineage: "moon-elf" },
    "wood-elf": { ...SURFACE, lineage: "wood-elf" },
    // Sourced: the tables of "By Any Other Name: The Drow" (Dragon #267), whose components rebuild about 55% of
    // published Forgotten Realms drow names
    [DROW]: {
        lineage: DROW,
        nameLabel: "a drow name",
        givenKeys: "f",
        // Sourced: Dragon #267 Table 1 name shapes (weights 30/20/20/20/10). Chosen: apostrophe shapes halved to
        // about 15% (published names: ~5%) and the long two-name shape halved, favouring short names.
        shapes: [
            { shape: ["prefix", "suffix"], weight: 50 },
            { shape: ["prefix", "suffix", "suffix"], weight: 25 },
            { shape: ["prefix", "suffix", "'", "suffix"], weight: 10 },
            { shape: ["prefix", "suffix", " ", "prefix", "suffix"], weight: 10 },
            { shape: ["suffix", "'", "prefix", "suffix"], weight: 5 }
        ],
        compoundShape: 3,
        // Sourced: Dragon #267 prints one spelling per sex for each entry, and paired meanings female first, kept whole
        slots: { prefix: { sexed: true }, suffix: { sexed: true } },
        // Inferred: published male names are shorter (4+ syllables: 4% male, 14% female). Chosen: keep long results
        // with these probabilities, a preference that applies to every roll, with or without locks.
        spelling: { longSyllables: 4, longKeep: { [SEX.MALE]: 0.15, [SEX.FEMALE]: 0.2, [SEX.NEUTRAL]: 0.2 } },
        judgesWholeName: true,
        // Sourced: "Rarely, a female drow might take part of a purely masculine name"; a male with a feminine
        // component would be a rogue (Dragon #267). Chosen: rate of the female exception.
        femaleUsesMaleForm: 0.05,
        // Sourced (FOR2 p98): by tradition no house name begins with the "L" sound of Lolth
        surname: { builtFrom: NAME_TYPE.HOUSE, refusedPrefixStart: /^l/i }
    }
};
