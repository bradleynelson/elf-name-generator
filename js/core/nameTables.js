// Reading a species' name tables, and the rule that gives each sex the entries it may use.
import { SEX } from "./species.js?v=4.3.0";

/**
 * A table entry as every generator reads it.
 * @typedef {Object} TableEntry
 * @property {string[]} female - its spellings for a female name, the main one first; empty when it is only for males
 * @property {string[]} male - likewise for a male name; an entry printed with one form has the same list in both
 * @property {string} [meaning]
 * @property {Object[]} sources - the table's
 */

// A table prints an entry's `female` and `male` forms when the sexes differ, otherwise its `text`; any of them may be a
// list of alternate spellings.
const spellingsFor = (entry, sex) => [entry[sex] ?? entry.text ?? []].flat();

/** A name table's prefixes and suffixes as TableEntry lists, in table order. */
export function readTable(table) {
    const read = (entry) => ({
        female: spellingsFor(entry, SEX.FEMALE),
        male: spellingsFor(entry, SEX.MALE),
        meaning: entry.meaning,
        sources: table.sources
    });
    return { prefixes: table.prefixes.map(read), suffixes: table.suffixes.map(read) };
}

/** Every spelling of a table's prefixes and of its suffixes, in lower case: what split components leave out. */
export function tableTextsOf({ prefixes, suffixes }) {
    const spellings = (entries) =>
        new Set(entries.flatMap((e) => [...e.female, ...e.male]).map((t) => t.toLowerCase()));
    return { prefix: spellings(prefixes), suffix: spellings(suffixes) };
}

export const hasSameForms = (entry) => entry.female.join() === entry.male.join();

/** An entry's spellings for a sex; a unisex name takes the male side, the same as the female for every entry it uses. */
export const formsFor = (entry, sex) => (sex === SEX.FEMALE ? entry.female : entry.male);

/** The first spelling of an entry printed with one form for both sexes, such as a prefix. */
export const mainSpelling = (entry) => entry.male[0];

// Chosen: a unisex name uses only entries whose female and male forms are the same; a female or male name, every entry
// with a form for that sex (a sexed table's suffix gives the sex).
export const filterEntriesFor = (entries, sex) =>
    sex === SEX.NEUTRAL ? entries.filter(hasSameForms) : entries.filter((entry) => formsFor(entry, sex).length);
