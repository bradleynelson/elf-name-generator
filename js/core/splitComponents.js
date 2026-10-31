// Components of published names for Expanded Variety (design decisions, 2026-10-21): the openings and endings cut from
// published names, which can fill a prefix or suffix slot of a table name. Their meanings are unknown. Also holds the
// consonant clusters found inside published names, used to judge whether two parts join cleanly. Shared by the elf
// and drow generators.

export const VOWELS = "aeiouyàáâäèéêëìíîïòóôöùúûü";
const TRAILING_CONSONANTS = new RegExp(`[^${VOWELS}]*$`);
const LEADING_CONSONANTS = new RegExp(`^[^${VOWELS}]*`);

/** Whether two components meet cleanly: the consonants at the join occur inside a published name (or are a single one). */
export function joinsCleanly(left, right, clusters) {
    const run = left.match(TRAILING_CONSONANTS)[0] + right.match(LEADING_CONSONANTS)[0];
    return run.length <= 1 || clusters.has(run);
}

export class SplitComponents {
    /**
     * @param {{ openings?: Object[], endings?: Object[], joinClusters?: string[] }} data - cut from published names
     * @param {{ prefix?: Set<string>, suffix?: Set<string> }} [tableTexts] - texts the name tables already offer, in
     *   lower case; a component with the same text is left out, because the table's entry has the same letters and a
     *   meaning
     * @param {{ source: { title: string }, text: string }[]} [publishedNames] - the published names the components are
     *   cut from, so each component can name the books they appear in
     */
    constructor({ openings = [], endings = [], joinClusters = [] } = {}, tableTexts = {}, publishedNames) {
        this.openings = openings;
        this.endings = endings;
        this.clusters = new Set(joinClusters);
        this.tableTexts = tableTexts;
        this.bookOf = new Map(publishedNames?.map((p) => [p.text, p.source?.title]));
        this.cache = new Map();
    }

    get isAvailable() {
        return this.openings.length > 0 && this.endings.length > 0;
    }

    /**
     * Components for a slot, each a part with the published names it was cut from (`from`) and the books those names
     * appear in (`books`): openings for a prefix slot, endings for a suffix slot. Endings follow gender (those published with it); Chosen: a neutral name uses only endings found on
     * both female and male names, so it reads as neither; without a gender, every ending.
     */
    componentsFor(slot, sex) {
        const cacheKey = `${slot}|${sex}`;
        if (!this.cache.has(cacheKey)) {
            const inTable = this.tableTexts[slot];
            const source = (slot === "prefix" ? this.openings : this._endingsFor(sex)).filter(
                (p) => !inTable?.has(p.text.toLowerCase())
            );
            if (!source.length) throw new Error(`No published name components for a ${slot}${sex ? ` (${sex})` : ""}`);
            const booksOf = (names) => [...new Set(names.map((name) => this.bookOf.get(name)).filter(Boolean))];
            this.cache.set(
                cacheKey,
                source.map((p) => ({ text: p.text, from: p.from, books: booksOf(p.from), method: "split" }))
            );
        }
        return this.cache.get(cacheKey);
    }

    _endingsFor(sex) {
        if (sex === "neutral") return findSharedEndings(this.endings);
        return sex ? this.endings.filter((e) => e.sex === sex) : this.endings;
    }
}

function findSharedEndings(endings) {
    const byText = new Map();
    for (const ending of endings) {
        const entry = byText.get(ending.text) || { text: ending.text, from: [], sexes: new Set() };
        entry.from.push(...ending.from);
        entry.sexes.add(ending.sex);
        byText.set(ending.text, entry);
    }
    return [...byText.values()]
        .filter((e) => e.sexes.has("female") && e.sexes.has("male"))
        .map((e) => ({ text: e.text, from: [...new Set(e.from)] }));
}
