// Repeatable random numbers for tests (mulberry32).
export function seededRandom(seed) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A random source that returns the given values in turn, then repeats the last one. */
export function fixedRandom(...values) {
    let index = 0;
    return () => values[Math.min(index++, values.length - 1)];
}
