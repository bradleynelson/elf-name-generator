// The one place that knows which generator serves which lineage; generators never import each other.
import { DwarfNameGenerator } from "./DwarfNameGenerator.js?v=4.3.0";
import { DWARF_LINEAGE_RULES } from "./dwarfLineages.js?v=4.3.0";
import { ElfNameGenerator } from "./ElfNameGenerator.js?v=4.3.0";
import { ELF_LINEAGE_RULES } from "./elfLineages.js?v=4.3.0";
import { DROW, DWARF_LINEAGES, ELF_SUBRACES } from "./species.js?v=4.3.0";
import { NAME_TYPE } from "./speciesData.js?v=4.3.0";

/**
 * What every lineage's generator offers the app. A part, structure or surname change keeps every other part in its
 * slot, so locks stay valid; it returns null when unavailable and does not count as a roll.
 * @typedef {Object} NameGenerator
 * @property {function(string): boolean} [hasSmallPool] - whether the published names for a style are few enough to
 *   repeat often; only generators that draw published names by default have it
 * @property {function(Object): NameResult} generate - options: `style`, `expanded`, `random`, `locks` (parts
 *   to keep by key, with the result's `shape`, `familyShape` and `sex`) and `reshape` (a roll: locked slots keep their
 *   place but the shape may change to any that keeps them; otherwise `locks.shape` is kept)
 * @property {function(NameResult, string): Part[]} optionsFor - the parts generatePartChange accepts for that key
 * @property {function(NameResult, string, Part): (NameResult|null)} generatePartChange - same result for the same part
 * @property {function(NameResult, Set<string>, Object): { control: string, on: boolean }[]} getStructureControls -
 *   the controls whose change builds with every part kept
 * @property {function(NameResult, string, Object): (NameResult|null)} generateStructureChange
 * @property {function(NameResult, Set<string>, Object): { kind: string, options: Part[] }} [getSurnameSwitchOptions] -
 *   the other kind of surname ("published" or "constructed"); no options when the switch would drop a locked part.
 *   Only generators with a second kind of surname have it and `generateSurnameChange`
 * @property {function(NameResult, Part, Object): (NameResult|null)} [generateSurnameChange] - to a published surname,
 *   or one built from a chosen prefix; the first name is kept
 */

// Chosen: drow read what their sources tie to drow; the surface lineages read everything else (a name printed as both
// drow and plain elf serves both). One function, so the surface lineages share one filtered copy of the data.
const readsSurfaceElf = (entry) => entry.generic || entry.lineages.some((tied) => tied !== DROW);
const tiedTo = (lineage) => (entry) => entry.lineages.includes(lineage);
const ownOrAny = (lineage) => (entry) => entry.generic || entry.lineages.includes(lineage);
// One rule set per dwarf lineage, all one class, each handed its lineage's description (`rules`). Chosen: shield and gold dwarves also read the untagged "any dwarf" names; wild dwarves and duergar only their own.
const dwarf = (lineage, reads, tables) => ({
    species: "dwarf",
    lineages: [lineage],
    reads,
    tables,
    Generator: DwarfNameGenerator,
    rules: DWARF_LINEAGE_RULES[lineage]
});

/**
 * The rule sets: lineages served, `reads(entry)` (its share of the data), `tables` needed once each, generator class,
 * and `rules`, the lineage's description the generator is built with. Rule sets with the same `reads` share one filtered
 * copy of the data.
 */
export const RULE_SETS = [
    ...ELF_SUBRACES.map((lineage) => ({
        species: "elf",
        lineages: [lineage],
        reads: readsSurfaceElf,
        tables: [NAME_TYPE.GIVEN],
        Generator: ElfNameGenerator,
        rules: ELF_LINEAGE_RULES[lineage]
    })),
    {
        species: "elf",
        lineages: [DROW],
        reads: tiedTo(DROW),
        tables: [NAME_TYPE.GIVEN, NAME_TYPE.HOUSE],
        Generator: ElfNameGenerator,
        rules: ELF_LINEAGE_RULES[DROW]
    },
    dwarf(DWARF_LINEAGES.SHIELD, ownOrAny(DWARF_LINEAGES.SHIELD), [NAME_TYPE.GIVEN]),
    dwarf(DWARF_LINEAGES.GOLD, ownOrAny(DWARF_LINEAGES.GOLD), [NAME_TYPE.GIVEN]),
    // No table; new wild names come only from split components of their own names
    dwarf(DWARF_LINEAGES.WILD, tiedTo(DWARF_LINEAGES.WILD), []),
    dwarf(DWARF_LINEAGES.DUERGAR, tiedTo(DWARF_LINEAGES.DUERGAR), [NAME_TYPE.GIVEN])
];

/**
 * Builds each rule set's generator once from its species' data.
 * @param {Object<string, Object>} dataBySpecies - each species' data, as loadSpeciesData gives it, by species name
 * @param {Object[]} [ruleSets=RULE_SETS]
 * @returns {function(string): NameGenerator} generatorFor(subrace): the generator that serves the lineage; throws for a
 *   lineage no rule set serves
 */
export function createGeneratorFor(dataBySpecies, ruleSets = RULE_SETS) {
    const generators = new Map();
    const shares = new Map(); // by species, then by `reads`
    const shareOf = (species, reads) => {
        const data = dataBySpecies[species];
        if (!data) throw new Error(`No name data for ${species}`);
        if (!shares.has(species)) shares.set(species, new Map());
        const ofSpecies = shares.get(species);
        if (!ofSpecies.has(reads)) {
            const [names, tables, words] = [data.names, data.tables, data.words].map((list) => list.filter(reads));
            ofSpecies.set(reads, { ...data, names, tables, words });
        }
        return ofSpecies.get(reads);
    };
    for (const { species, lineages, reads, Generator, rules } of ruleSets) {
        const generator = new Generator(shareOf(species, reads), rules);
        for (const lineage of lineages) generators.set(lineage, generator);
    }
    return (subrace) => {
        const generator = generators.get(subrace);
        if (!generator) throw new Error(`Unknown subrace: ${subrace}`);
        return generator;
    };
}
