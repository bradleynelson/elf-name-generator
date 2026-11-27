// The values and steps every generator's roll shares, so a lineage differs only where its rules do.
import { generateUnrepeated } from "./random.js?v=4.3.1";

// Chosen: with Expanded Variety, the chance that a prefix or suffix slot takes a split component.
const SPLIT_COMPONENT_SHARE = 0.5;
// Chosen: the share of rolled surnames taken whole from published family names or houses; the rest are built.
const PUBLISHED_FAMILY_SHARE = 0.5;
// Chosen: names, words and surnames tied to a lineage (inferred from small samples) are this many times likelier than
// others, a preference. Reconsider if a lineage's results feel too narrow.
export const OWN_LINEAGE_WEIGHT = 3;

export const takesSplitComponent = (random) => random() < SPLIT_COMPONENT_SHARE;

export const takesPublishedFamily = (random) => random() < PUBLISHED_FAMILY_SHARE;

/** The weight of an entry for a lineage's roll: `ownWeight` when the entry is tied to the lineage, else 1. */
export const weightByLineage = (lineage, ownWeight) => (entry) => (entry.lineages.includes(lineage) ? ownWeight : 1);

/**
 * Looks a built first name up among the published ones.
 * @param {{ text: string, sources: Object[] }[]} names
 * @returns {function(string): ({ published: { sources: Object[] } } | {})} the result's `published` field when a
 *   published name matches the text in any case, else nothing to add
 */
export function createPublishedLookup(names) {
    const byName = new Map(names.map((name) => [name.text.toLowerCase(), name]));
    return (text) => {
        const found = byName.get(text.toLowerCase());
        return found ? { published: { sources: found.sources } } : {};
    };
}

/**
 * The first name `build` makes that was not used recently (generateUnrepeated).
 * @param {string} what - what was asked for, for the message ("an elf name")
 * @throws {Error} when every attempt broke a rule
 */
export function generateName(build, recent, what) {
    const result = generateUnrepeated(build, recent);
    if (!result) throw new Error(`Could not make ${what} with these choices. Try unlocking a part.`);
    return result;
}

/** The candidates for a part that the generator's part change accepts: a picker offers no choice it would refuse. */
export const filterPartOptions = (generator, result, key, candidates) =>
    candidates.filter((option) => generator.generatePartChange(result, key, option));
