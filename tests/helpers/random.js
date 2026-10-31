import { expect } from "vitest";

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

/** `count` names from a generator, rolled from one seed so the sample is the same on every run. */
export function sample(generator, count, options) {
    const random = seededRandom(20261020);
    return Array.from({ length: count }, () => generator.generate({ random, ...options }));
}

/**
 * Expects `giveUp`, given a random source, to run out of attempts: with a source that always answers 0.5 every attempt
 * draws the same number of times, so giving up after 300 attempts draws a multiple of 300, which 299 or 301 would not.
 */
export function expectGivesUpAfter300Attempts(giveUp) {
    let draws = 0;
    giveUp(() => {
        draws++;
        return 0.5;
    });
    expect(draws).toBeGreaterThan(0);
    expect(draws % 300).toBe(0);
}
