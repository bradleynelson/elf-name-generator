// The data file holds only what the sources say; decisions such as source order and lineage mapping are made here.

import { cutPublishedNames } from "./splitComponents.js?v=4.3.0";

// The data shape this version reads. Another schema (usually a stale cached copy) is refused, so the page asks for a
// refresh.
export const SCHEMA = 6;

export const NAME_TYPE = Object.freeze({ GIVEN: "given", FAMILY: "family", HOUSE: "house" });

// Chosen: official sources first, then Ed Greenwood's own; within each, the source giving the most names first, then
// file order. One order for every list, so a book never moves between lists.
const AUTHORITY_ORDER = ["official", "creator"];

/**
 * @param {Object} raw - the parsed data file: { schema, sources, names, tables, words }
 * @param {Object} species - the species' description (species.js SPECIES)
 * @returns {{ sources: Object[], names: Object[], tables: Object[], words: Object[], split: Object }} sources in display
 *   order; names, tables and words with `lineages` and `generic` (tied to no particular lineage); `split`, the
 *   components cut from the names. Sources are { title, authority }; a `meaningSource` is a title.
 * @throws {Error} when the schema is not SCHEMA, or an id, authority or lineage word is unknown
 */
export function loadSpeciesData(raw, species) {
    if (raw?.schema !== SCHEMA) {
        throw new Error(`The name data has schema ${raw?.schema}; this version reads schema ${SCHEMA}`);
    }
    for (const [id, { authority }] of Object.entries(raw.sources)) {
        if (!AUTHORITY_ORDER.includes(authority))
            throw new Error(`The name data gives source ${id} an unknown authority`);
    }
    const sourceOf = (id) => {
        const source = raw.sources[id];
        if (!source) throw new Error(`The name data cites an unknown source: ${id}`);
        return source;
    };
    const namesPerSource = new Map();
    for (const name of raw.names) {
        for (const id of name.sources) namesPerSource.set(id, (namesPerSource.get(id) || 0) + 1);
    }
    const rank = (id) => AUTHORITY_ORDER.indexOf(raw.sources[id].authority);
    const count = (id) => namesPerSource.get(id) || 0;
    // sort is stable, so sources alike in both keep the order the file lists them
    const shown = Object.keys(raw.sources).sort((a, b) => rank(a) - rank(b) || count(b) - count(a));
    const position = new Map(shown.map((id, index) => [id, index]));
    const ordered = (cited) => [...cited].sort((a, b) => position.get(a) - position.get(b)).map(sourceOf);
    const tie = (entry) => {
        const words = entry.lineages || [];
        const lineages = words.map((word) => {
            const tied = species.lineageWords[word];
            if (!tied) throw new Error(`The name data uses a lineage word the species does not know: ${word}`);
            return tied;
        });
        return {
            lineages: [...new Set(lineages.flat())],
            // a file leaves `lineages` out when its sources say only the species' own word ("elf")
            generic: !words.length || lineages.some((tied) => !tied.length)
        };
    };
    return {
        sources: shown.map(sourceOf),
        names: raw.names.map((name) => ({
            ...name,
            ...tie(name),
            sources: ordered(name.sources),
            ...(name.meaningSource ? { meaningSource: sourceOf(name.meaningSource).title } : {})
        })),
        tables: raw.tables.map((table) => ({ ...table, ...tie(table), sources: ordered(table.sources) })),
        words: raw.words.map((word) => ({
            ...word,
            ...tie(word),
            ...(word.sources ? { sources: ordered(word.sources) } : {})
        })),
        split: cutPublishedNames(raw.names)
    };
}
