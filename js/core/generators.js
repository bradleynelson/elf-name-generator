// The one place that knows which generator serves which lineage; generators never import each other.
import { DrowNameGenerator } from "./DrowNameGenerator.js?v=4.2.0";
import { ElfNameGenerator } from "./ElfNameGenerator.js?v=4.2.0";
import { DROW, ELF_SUBRACES } from "./species.js?v=4.2.0";

/**
 * What every lineage's generator offers the app. A structure or surname change keeps every current part in its slot, so
 * locks stay valid; it returns null when unavailable and does not count as a roll.
 * @typedef {Object} NameGenerator
 * @property {function(Object): NameResult} generate - options: `subrace`, `style`, `expanded`, `random`, `locks` (parts
 *   to keep by key, with the result's `shape`, `familyShape` and `sex`) and `reshape` (a roll: locked slots keep their
 *   place but the shape may change to any that keeps them; otherwise `locks.shape` is kept)
 * @property {function(NameResult, string): Part[]} optionsFor - the picker's alternatives for one part: only those that
 *   make a valid name with the rest kept, so choosing one never fails
 * @property {function(NameResult, Set<string>, Object): { control: string, on: boolean }[]} getStructureControls -
 *   the controls whose change builds with every part kept
 * @property {function(NameResult, string, Object): (NameResult|null)} generateStructureChange
 * @property {function(NameResult, Set<string>, Object): { kind: string, options: Part[] }} getSurnameSwitchOptions -
 *   the other kind of surname ("published" or "constructed"); no options when the switch would drop a locked part
 * @property {function(NameResult, Part, Object): (NameResult|null)} generateSurnameChange - to a published surname, or
 *   one built from a chosen prefix; the first name is kept
 */

/**
 * The rule sets: the lineages each serves, `reads(entry)` choosing its share of the data, and its generator class.
 * Chosen: drow read what their sources tie to drow; the surface lineages read everything else (a name printed as both
 * drow and plain elf serves both).
 */
export const RULE_SETS = [
    {
        species: "elf",
        lineages: ELF_SUBRACES,
        reads: (entry) => entry.generic || entry.lineages.some((lineage) => lineage !== DROW),
        Generator: ElfNameGenerator
    },
    {
        species: "elf",
        lineages: [DROW],
        reads: (entry) => entry.lineages.includes(DROW),
        Generator: DrowNameGenerator
    }
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
    for (const { species, lineages, reads, Generator } of ruleSets) {
        const data = dataBySpecies[species];
        if (!data) throw new Error(`No name data for ${species}`);
        const generator = new Generator({
            ...data,
            names: data.names.filter(reads),
            tables: data.tables.filter(reads),
            words: data.words.filter(reads)
        });
        for (const lineage of lineages) generators.set(lineage, generator);
    }
    return (subrace) => {
        const generator = generators.get(subrace);
        if (!generator) throw new Error(`Unknown subrace: ${subrace}`);
        return generator;
    };
}
