// The cut items hold every lineage's names, so each generator passes the names of its own pool.

export const VOWELS = "aeiouyàáâäèéêëìíîïòóôöùúûü";
const TRAILING_CONSONANTS = new RegExp(`[^${VOWELS}]*$`);
const LEADING_CONSONANTS = new RegExp(`^[^${VOWELS}]*`);
const CONSONANT_RUNS = new RegExp(`[^${VOWELS}]+`, "g");

// Chosen: a cluster is cut before its last consonant, or its last two letters when they make one sound, so each ending
// starts with a consonant sound ("qu" needs no entry: "u" is a vowel).
const DIGRAPHS = new Set(["th", "sh", "ph", "ch", "kh", "gh", "rh", "lh", "wh", "zh"]);
// Chosen: an opening keeps at least two letters; an ending always has its consonant and the vowel run after it.
const SHORTEST_OPENING = 2;
// Chosen: names with an apostrophe are not cut (the tables supply apostrophe forms), nor Common-form names
// (Moonwhisper), whose parts would be English, not Elvish.
const isCut = (name) => !name.text.includes("'") && name.form === "elvish";

function letterRuns(name) {
    const runs = [];
    for (const letter of name) {
        const isVowel = VOWELS.includes(letter);
        if (runs.at(-1)?.isVowel === isVowel) runs.at(-1).text += letter;
        else runs.push({ text: letter, isVowel });
    }
    return runs;
}

/** The [opening, ending] pairs of a lower-case name, one at each consonant run between two vowel runs. */
function cutPoints(name) {
    const runs = letterRuns(name);
    const pairs = [];
    let position = 0;
    runs.forEach(({ text, isVowel }, index) => {
        if (!isVowel && index > 0 && index < runs.length - 1) {
            const at = position + text.length - (DIGRAPHS.has(text.slice(-2)) ? 2 : 1);
            if (at >= SHORTEST_OPENING) pairs.push([name.slice(0, at), name.slice(at)]);
        }
        position += text.length;
    });
    return pairs;
}

/** {text: Set of names} -> [{ text, from }], both in order. */
const itemsOf = (cuts) => [...cuts.keys()].sort().map((text) => ({ text, from: [...cuts.get(text)].sort() }));

function cutSection(names) {
    const openings = new Map();
    const endings = new Map();
    const joins = new Map();
    const add = (cuts, text, name) => cuts.set(text, (cuts.get(text) || new Set()).add(name));
    for (const name of names.filter(isCut)) {
        const lower = name.text.toLowerCase();
        for (const run of lower.slice(1, -1).match(CONSONANT_RUNS) || []) add(joins, run, name.text);
        for (const [opening, ending] of cutPoints(lower)) {
            add(openings, opening, name.text);
            add(endings, ending, name.text);
        }
    }
    return { openings: itemsOf(openings), endings: itemsOf(endings), joins: itemsOf(joins) };
}

/**
 * The split components of a species' published names (Expanded Variety): for Elvish-form given and family names (a
 * drow house is not cut), the openings and endings each name is cut into and the consonant runs inside it (joins),
 * each with every name it came from.
 * @param {Object[]} names - the data's names ({ text, type, form })
 * @returns {{ given: Object, family: Object }} each { openings, endings, joins } of items { text, from }
 */
export function cutPublishedNames(names) {
    const ofType = (type) => names.filter((name) => name.type === type);
    return {
        given: cutSection(ofType("given")),
        family: cutSection(ofType("family"))
    };
}

export const sourcesInOrder = (names, sourceOrder) =>
    [...new Set(names.flatMap((name) => name.sources))].sort((a, b) => sourceOrder.get(a) - sourceOrder.get(b));

/** Whether two components meet cleanly: the consonants at the join occur inside a published name (or are a single one). */
export function joinsCleanly(left, right, clusters) {
    const run = left.match(TRAILING_CONSONANTS)[0] + right.match(LEADING_CONSONANTS)[0];
    return run.length <= 1 || clusters.has(run);
}

// Chosen: a split component cites at most this many of the names it was cut from (the first, alphabetically), and the
// books of those names, so its source line stays readable; the cut items keep every name.
const CITED_NAMES = 5;

/** The sexes a published name gives its components: a unisex name both, a name with no stated sex none. */
const sexesOf = (name) => (name.sex === "unisex" ? ["female", "male"] : [name.sex]);

export class SplitComponents {
    /**
     * @param {{ openings?: Object[], endings?: Object[], joins?: Object[] }} cut - a section of cutPublishedNames'
     *   result: items `{ text, from }` cut from published names
     * @param {Object} options
     * @param {Object[]} options.names - the published names of the pool ({ text, sex?, sources }); only items cut from
     *   one of them are used, and the components' sex and sources are worked out from them
     * @param {{ prefix?: Set<string>, suffix?: Set<string> }} [options.tableTexts] - texts the name tables already
     *   offer, in lower case; a component with the same text is left out, because the table's entry has the same letters
     *   and a meaning
     * @param {Object[]} options.sources - every source, in the order sources are shown (speciesData.js)
     */
    constructor({ openings = [], endings = [], joins = [] } = {}, { names, tableTexts = {}, sources }) {
        this.names = new Map(names.map((name) => [name.text, name]));
        const inPool = (items) =>
            items
                .map((item) => ({ text: item.text, from: item.from.filter((name) => this.names.has(name)) }))
                .filter((item) => item.from.length);
        this.openings = inPool(openings);
        this.endings = inPool(endings);
        this.clusters = new Set(inPool(joins).map((join) => join.text));
        this.tableTexts = tableTexts;
        this.sourceOrder = new Map(sources.map((source, index) => [source, index]));
        this.cache = new Map();
    }

    get isAvailable() {
        return this.openings.length > 0 && this.endings.length > 0;
    }

    /**
     * Components for a slot, each a part with the published names it was cut from (`from`) and the books those names
     * appear in (`sources`): openings for a prefix slot, endings for a suffix slot. Endings follow gender (those of
     * names published with it); Chosen: a neutral name uses only endings found on both female and male names, so it
     * reads as neither; without a gender, every ending.
     */
    componentsFor(slot, sex) {
        const cacheKey = `${slot}|${sex}`;
        if (!this.cache.has(cacheKey)) {
            const inTable = this.tableTexts[slot];
            const items = (slot === "prefix" ? this.openings : this._endingsFor(sex)).filter(
                (item) => !inTable?.has(item.text.toLowerCase())
            );
            if (!items.length) throw new Error(`No published name components for a ${slot}${sex ? ` (${sex})` : ""}`);
            this.cache.set(
                cacheKey,
                items.map((item) => {
                    const from = item.from.slice(0, CITED_NAMES);
                    const sources = sourcesInOrder(
                        from.map((name) => this.names.get(name)),
                        this.sourceOrder
                    );
                    return { text: item.text, from, sources, method: "split" };
                })
            );
        }
        return this.cache.get(cacheKey);
    }

    _endingsFor(sex) {
        if (!sex) return this.endings;
        const sexes = (names) => new Set(names.flatMap((name) => sexesOf(this.names.get(name))));
        if (sex === "neutral") {
            return this.endings.filter((item) => {
                const given = sexes(item.from);
                return given.has("female") && given.has("male");
            });
        }
        return this.endings
            .map((item) => ({ text: item.text, from: item.from.filter((name) => sexes([name]).has(sex)) }))
            .filter((item) => item.from.length);
    }
}
