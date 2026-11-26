import { describe, expect, it } from "vitest";
import {
    filterEntriesFor,
    formsFor,
    hasSameForms,
    mainSpelling,
    readTable,
    tableTextsOf
} from "../../js/core/nameTables.js";

const SOURCES = [{ title: "Test book", authority: "official" }];
const table = (prefixes, suffixes) => ({ type: "given", prefixes, suffixes, sources: SOURCES });

describe("readTable", () => {
    it("gives an entry printed with one form that form for both sexes, with its meaning and the table's sources", () => {
        const { prefixes } = readTable(table([{ text: "ael", meaning: "Noble" }], []));
        expect(prefixes).toEqual([{ female: ["ael"], male: ["ael"], meaning: "Noble", sources: SOURCES }]);
    });

    it("keeps each sex's forms when they differ, and every alternate spelling in order", () => {
        const { suffixes } = readTable(table([], [{ female: "ra", male: ["ran", "rhan"], meaning: "Lord/Lady" }]));
        expect(suffixes).toEqual([{ female: ["ra"], male: ["ran", "rhan"], meaning: "Lord/Lady", sources: SOURCES }]);
    });

    it("gives no forms to the sex an entry is not printed for", () => {
        const { suffixes } = readTable(table([], [{ male: "ak" }, { female: ["ia", "ya"] }]));
        expect(suffixes.map(({ female, male }) => ({ female, male }))).toEqual([
            { female: [], male: ["ak"] },
            { female: ["ia", "ya"], male: [] }
        ]);
    });
});

describe("tableTextsOf", () => {
    it("lists every spelling of either sex, in lower case, prefixes apart from suffixes", () => {
        const read = readTable(table([{ text: ["Ael", "ail"] }], [{ female: "ra", male: "RAN" }, { male: "ak" }]));
        expect(tableTextsOf(read)).toEqual({ prefix: new Set(["ael", "ail"]), suffix: new Set(["ra", "ran", "ak"]) });
    });
});

describe("the entries a sex may use", () => {
    const shared = { female: ["el"], male: ["el"] };
    const paired = { female: ["ra"], male: ["ran"] };
    const maleOnly = { female: [], male: ["ak"] };
    const femaleOnly = { female: ["ia"], male: [] };
    const entries = [shared, paired, maleOnly, femaleOnly];

    it("gives a unisex name only the entries whose two forms are the same", () => {
        expect(filterEntriesFor(entries, "neutral")).toEqual([shared]);
    });

    it("gives a female or male name every entry with a form for that sex", () => {
        expect(filterEntriesFor(entries, "female")).toEqual([shared, paired, femaleOnly]);
        expect(filterEntriesFor(entries, "male")).toEqual([shared, paired, maleOnly]);
    });

    it("compares every spelling when it asks whether the forms are the same", () => {
        expect(hasSameForms({ female: ["el", "ell"], male: ["el", "ell"] })).toBe(true);
        expect(hasSameForms({ female: ["el"], male: ["el", "ell"] })).toBe(false);
    });

    it("reads a female name's forms from the female side and any other name's from the male side", () => {
        expect(formsFor(paired, "female")).toEqual(["ra"]);
        expect(formsFor(paired, "male")).toEqual(["ran"]);
        expect(formsFor(shared, "neutral")).toEqual(["el"]);
    });

    it("takes the first spelling as the main one", () => {
        expect(mainSpelling({ female: ["el", "ell"], male: ["el", "ell"] })).toBe("el");
    });
});
