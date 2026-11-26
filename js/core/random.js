// `random` is any function like Math.random; tests pass a seeded one.

// Chosen: how many times a generator rebuilds a name that broke a rule before it gives up.
const MAX_ATTEMPTS = 300;

export function selectRandom(items, random = Math.random) {
    return items.length ? items[Math.floor(random() * items.length)] : null;
}

export function selectWeighted(items, weightOf, random = Math.random) {
    const total = items.reduce((sum, item) => sum + weightOf(item), 0);
    let roll = random() * total;
    for (const item of items) {
        roll -= weightOf(item);
        if (roll < 0) return item;
    }
    return items.length ? items[items.length - 1] : null;
}

/** A copy of `items` in random order (Fisher-Yates). */
export function shuffle(items, random = Math.random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** Remembers the last few names so they are not repeated; a repeat is allowed when nothing else is possible. */
export class RecentNames {
    constructor(size = 5) {
        this.size = size;
        this.names = [];
    }

    has(name) {
        return this.names.includes(name);
    }

    add(name) {
        this.names.push(name);
        if (this.names.length > this.size) this.names.shift();
    }
}

/**
 * The first result `build` makes in up to MAX_ATTEMPTS calls, or null if every call returned null (a broken rule).
 * @param {function(): (Object|null)} build
 */
export function generateWithRetries(build) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const result = build();
        if (result) return result;
    }
    return null;
}

/**
 * Like generateWithRetries, but keeps trying past a name used recently: the first name not in `recent` wins, else the
 * first repeat (a repeat is allowed when nothing else is possible). Records the name it returns in `recent`.
 * @param {function(): ({ name: string }|null)} build
 * @param {RecentNames} recent - the generator's recent-use memory, updated here and nowhere else
 * @returns {Object|null} null if no attempt built a name
 */
export function generateUnrepeated(build, recent) {
    let repeat = null;
    const fresh = generateWithRetries(() => {
        const result = build();
        if (!result || !recent.has(result.name)) return result;
        repeat = repeat || result;
        return null;
    });
    const chosen = fresh || repeat;
    if (chosen) recent.add(chosen.name);
    return chosen;
}
