import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { DrowNameGenerator } from "../../js/core/DrowNameGenerator.js";
import { fixedRandom, seededRandom } from "../helpers/random.js";

// Design decisions (2026-10-20): Dragon #267 tables with their own meanings; about 15%
// apostrophes; males never take feminine components; FOR2 taboos; published matches labeled; locks keep components.
const data = JSON.parse(readFileSync(join(process.cwd(), "data/drowNames.json"), "utf-8"));
const sample = (gen, count, options) => {
    const random = seededRandom(20261020);
    return Array.from({ length: count }, () => gen.generate({ random, ...options }));
};
const personal = (result) => result.name.slice(0, result.name.lastIndexOf(" "));
const components = (result) => result.parts.filter((p) => p.role === "prefix" || p.role === "suffix");
const fixture = (overrides = {}) => ({
    prefixes: [{ female: "bri", male: "bri", meaning: "Graceful" }],
    suffixes: [{ female: "za", male: "za", meaning: "Lover" }],
    housePrefixes: [{ text: "baen", meaning: "Blessed by" }],
    houseSuffixes: [{ text: "rae", meaning: "Fell powers" }],
    publishedHouses: [],
    ...overrides
});

describe("DrowNameGenerator with the published tables", () => {
    it("puts an apostrophe in about 15% of personal names, never two in one word", () => {
        const names = sample(new DrowNameGenerator(data), 2000, { style: "feminine" }).map(personal);
        const share = names.filter((n) => n.includes("'")).length / names.length;
        expect(share).toBeGreaterThan(0.1);
        expect(share).toBeLessThan(0.2);
        names.forEach((n) => n.split(" ").forEach((w) => expect((w.match(/'/g) || []).length).toBeLessThanOrEqual(1)));
    });

    it("never gives a male a feminine-only component, and takes meanings from the component's own table entry", () => {
        const meaningsByMaleForm = (entries) =>
            entries.reduce((map, e) => map.set(e.male, [...(map.get(e.male) || []), e.meaning]), new Map());
        const tables = { prefix: meaningsByMaleForm(data.prefixes), suffix: meaningsByMaleForm(data.suffixes) };
        sample(new DrowNameGenerator(data), 500, { style: "masculine" }).forEach((r) =>
            components(r).forEach((f) => expect(tables[f.role].get(f.text)).toContain(f.meaning))
        );
    });

    it("gives neutral names only components whose female and male forms are the same", () => {
        const shared = new Set(
            [...data.prefixes, ...data.suffixes].filter((e) => e.female === e.male).map((e) => e.male)
        );
        sample(new DrowNameGenerator(data), 300, { style: "neutral" }).forEach((r) =>
            components(r).forEach((f) => expect(shared.has(f.text)).toBe(true))
        );
    });

    it("never builds a house name starting with the L of Lolth", () => {
        sample(new DrowNameGenerator(data), 500).forEach((r) => {
            const prefix = r.parts.find((p) => p.key === "n0");
            if (prefix) expect(prefix.text).not.toMatch(/^l/i);
        });
    });

    it("lets a built house keep a locked component while the other is re-rolled", () => {
        const gen = new DrowNameGenerator(data);
        const first = sample(gen, 50).find((r) => r.parts.some((p) => p.key === "n0"));
        const kept = first.parts.find((p) => p.key === "n0");
        const next = sample(gen, 20, { locks: { n0: kept } });
        next.forEach((r) => expect(r.parts.find((p) => p.key === "n0").text).toBe(kept.text));
        expect(new Set(next.map((r) => r.parts.find((p) => p.key === "n1").text)).size).toBeGreaterThan(1);
    });

    it("keeps locked components in their places", () => {
        const gen = new DrowNameGenerator(data);
        const first = gen.generate({ style: "feminine", random: seededRandom(3) });
        const kept = components(first)[0];
        sample(gen, 20, { style: "feminine", locks: { shape: first.shape, [kept.key]: kept } }).forEach((r) =>
            expect(r.parts.find((p) => p.key === kept.key).text).toBe(kept.text)
        );
    });
});

describe("DrowNameGenerator rules", () => {
    it("refuses names containing a drow deity's name, wherever it falls", () => {
        const gen = new DrowNameGenerator(
            fixture({
                prefixes: [{ female: "lol", male: "lol", meaning: "" }],
                suffixes: [{ female: "th", male: "th", meaning: "" }],
                forbiddenNames: ["lolth"]
            })
        );
        expect(() => gen.generate({ style: "feminine" })).toThrow(/unlocking/);
    });

    it("labels a generated name that matches a published one", () => {
        const gen = new DrowNameGenerator(
            fixture({ publishedNames: [{ text: "Briza", source: { title: "Menzoberranzan (2e)" } }] })
        );
        const result = gen.generate({ style: "feminine", random: fixedRandom(0.1) });
        expect(result.name).toBe("Briza Baenrae");
        expect(result.published.source.title).toBe("Menzoberranzan (2e)");
    });

    it("composes a house meaning from its two table entries", () => {
        const house = new DrowNameGenerator(fixture())
            .generate({ style: "feminine", random: fixedRandom(0.1, 0.9) })
            .parts.find((p) => p.key === "n1");
        expect(house.wordMeaning).toBe("Blessed by fell powers");
    });

    it("does not double 'the' when a house prefix ends with it", () => {
        const gen = new DrowNameGenerator(
            fixture({
                housePrefixes: [{ text: "auvry", meaning: "Blood of the" }],
                houseSuffixes: [{ text: "ghym", meaning: "The forgotten ways" }]
            })
        );
        const house = gen
            .generate({ style: "feminine", random: fixedRandom(0.1, 0.9) })
            .parts.find((p) => p.key === "n1");
        expect(house.wordMeaning).toBe("Blood of the forgotten ways");
    });
});
