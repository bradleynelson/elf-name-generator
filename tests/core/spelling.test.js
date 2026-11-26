import { describe, expect, it } from "vitest";
import {
    countSyllables,
    hasTripleLetter,
    keepsEveryLength,
    keepsLengthOnRoll,
    validateSpelling
} from "../../js/core/spelling.js";

const limits = { minLetters: 4, maxLetters: 8, minSyllables: 2, maxSyllables: 4 };
const always = (value) => () => value;

describe("countSyllables", () => {
    it("counts each run of vowels once, y and accented vowels included", () => {
        expect(countSyllables("dorn")).toBe(1);
        expect(countSyllables("aelar")).toBe(2);
        expect(countSyllables("lyra")).toBe(2);
        expect(countSyllables("fëlinor")).toBe(3);
    });

    it("counts none in a word with no vowel", () => {
        expect(countSyllables("grth")).toBe(0);
    });
});

describe("hasTripleLetter", () => {
    it("finds a letter three times in a row, and only then", () => {
        expect(hasTripleLetter("garddd")).toBe(true);
        expect(hasTripleLetter("barendd")).toBe(false);
        expect(hasTripleLetter("dada")).toBe(false);
    });
});

describe("validateSpelling", () => {
    it("accepts the shortest and longest words the limits allow, and refuses one letter past either", () => {
        expect(validateSpelling("dora", limits)).toBe(true);
        expect(validateSpelling("dor", limits)).toBe(false);
        expect(validateSpelling("doramira", limits)).toBe(true);
        expect(validateSpelling("doramiran", limits)).toBe(false);
    });

    it("accepts two to four syllables and refuses one, five or none", () => {
        expect(validateSpelling("dorn", limits)).toBe(false);
        expect(validateSpelling("dora", limits)).toBe(true);
        expect(validateSpelling("aeaeaeae", limits)).toBe(false);
        expect(validateSpelling("iaiaia", limits)).toBe(false);
        expect(validateSpelling("araraa", limits)).toBe(true);
        expect(validateSpelling("ararara", limits)).toBe(true);
        expect(validateSpelling("arararar", limits)).toBe(true);
        expect(validateSpelling("ararararar", { ...limits, maxLetters: 11 })).toBe(false);
        expect(validateSpelling("grthk", limits)).toBe(false);
    });

    it("holds a word to no limit the rules leave out", () => {
        expect(validateSpelling("a", {})).toBe(true);
        expect(validateSpelling("arararararararar", {})).toBe(true);
    });
});

describe("keepsLengthOnRoll: long words stay uncommon", () => {
    const rules = { longSyllables: 4, longKeep: 0.3 };

    it("keeps a word shorter than long without drawing", () => {
        const draws = [];
        const random = () => draws.push(1) && 0.99;
        expect(keepsLengthOnRoll(rules, random)("ararar")).toBe(true);
        expect(draws).toEqual([]);
    });

    it("keeps a long word only on a draw below the keep chance", () => {
        expect(keepsLengthOnRoll(rules, always(0.29))("arararar")).toBe(true);
        expect(keepsLengthOnRoll(rules, always(0.3))("arararar")).toBe(false);
        expect(keepsLengthOnRoll(rules, always(0.29))("ararararar")).toBe(true);
    });

    it("draws once for each long word it judges", () => {
        let draws = 0;
        const keeps = keepsLengthOnRoll(rules, () => draws++ && 0);
        keeps("arararar");
        keeps("arararar");
        expect(draws).toBe(2);
    });
});

describe("keepsEveryLength: edits and structure changes", () => {
    it("keeps a long word", () => {
        expect(keepsEveryLength("ararararar")).toBe(true);
    });
});
