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

    it("names the books a split component's source names come from (Expanded Variety)", () => {
        const bookOf = new Map(data.publishedNames.map((p) => [p.text, p.source.title]));
        const splits = sample(new DrowNameGenerator(data), 300, { expanded: true }).flatMap((r) =>
            r.parts.filter((p) => p.method === "split")
        );
        expect(splits.length).toBeGreaterThan(0);
        splits.forEach((p) => expect(p.books).toEqual([...new Set(p.from.map((name) => bookOf.get(name)))]));
        expect(splits.every((p) => p.books.length > 0)).toBe(true);
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

describe("DrowNameGenerator structure controls, switching and rolls under locks", () => {
    const gen = new DrowNameGenerator(data);
    const SHORT = "prefix,suffix";
    const LONG = "prefix,suffix,suffix";
    const COMPOUND = "prefix,suffix, ,prefix,suffix";
    const random = () => seededRandom(9);
    const pick = (test) => sample(gen, 800).find(test);
    const shaped = (shape) => (r) => r.shape.join() === shape;
    const part = (r, key) => r.parts.find((p) => p.key === key);
    const built = (r) => r.parts.some((p) => p.key === "n0");
    const houseOf = (r) => r.name.slice(r.name.lastIndexOf(" ") + 1);
    const controlNames = (r, locked) => gen.getStructureControls(r, locked, { random: random() }).map((c) => c.control);

    it("lengthens and shortens a first name, keeping the first two components and the house", () => {
        const before = pick(shaped(SHORT));
        const longer = gen.generateStructureChange(before, "given", { random: random() });
        expect(longer.shape.join()).toBe(LONG);
        expect(["f0", "f1"].map((k) => part(longer, k).text)).toEqual(["f0", "f1"].map((k) => part(before, k).text));
        expect(houseOf(longer)).toBe(houseOf(before));
        const shorter = gen.generateStructureChange(longer, "given", { random: random() });
        expect(shorter.name).toBe(before.name);
        // the last slot locked: it cannot be removed
        expect(gen.generateStructureChange(longer, "given", { locked: new Set(["f2"]) })).toBeNull();
    });

    it("adds a compound name (a prefix and suffix) and removes it again, unless one of its slots is locked", () => {
        const before = pick(shaped(SHORT));
        const added = gen.generateStructureChange(before, "compound", { random: random() });
        expect(added.shape.join()).toBe(COMPOUND);
        expect(added.name.split(" ")).toHaveLength(3);
        expect(houseOf(added)).toBe(houseOf(before));
        expect(gen.generateStructureChange(added, "compound", { random: random() }).name).toBe(before.name);
        expect(gen.generateStructureChange(added, "compound", { locked: new Set(["f4"]) })).toBeNull();
        const long = pick(shaped(LONG));
        expect(gen.generateStructureChange(long, "compound", { random: random() }).shape.join()).toBe(COMPOUND);
        expect(gen.generateStructureChange(long, "compound", { locked: new Set(["f2"]) })).toBeNull();
    });

    it("lists no controls for the apostrophe shapes, and builds every change it offers into a valid name", () => {
        expect(controlNames(pick((r) => r.shape.includes("'")))).toEqual([]);
        sample(gen, 150).forEach((r) =>
            gen.getStructureControls(r, new Set(), { random: random() }).forEach(({ control }) => {
                const changed = gen.generateStructureChange(r, control, { random: random() });
                expect(
                    changed.parts
                        .map((p) => p.text)
                        .join("")
                        .replace(/[ ']/g, "")
                        .toLowerCase()
                ).toBe(changed.name.replace(/[ ']/g, "").toLowerCase());
            })
        );
    });

    it("switches a built house to a published one and back to a built one from a chosen prefix", () => {
        const before = pick(built);
        const { kind, options } = gen.getSurnameSwitchOptions(before);
        expect(kind).toBe("published");
        const choice = options[2];
        const published = gen.generateSurnameChange(before, choice);
        expect(personal(published)).toBe(personal(before));
        expect(part(published, "house").text).toBe(choice.text);
        expect(published.parts.some((p) => p.key === "n0")).toBe(false);
        const other = gen.getSurnameSwitchOptions(published);
        expect(other.kind).toBe("constructed");
        const prefix = other.options[4];
        const rebuilt = gen.generateSurnameChange(published, prefix);
        expect(personal(rebuilt)).toBe(personal(before));
        expect(part(rebuilt, "n0").text).toBe(prefix.text);
        expect(part(rebuilt, "n1")).toBeDefined();
    });

    it("ignores a structure control it does not have (drow have no surname length)", () => {
        expect(gen.generateStructureChange(pick(shaped(SHORT)), "surname", { random: random() })).toBeNull();
    });

    it("offers no house switch when it would drop a locked part", () => {
        expect(gen.getSurnameSwitchOptions(pick(built), new Set(["n1"])).options).toEqual([]);
        expect(
            gen.getSurnameSwitchOptions(
                pick((r) => !built(r)),
                new Set(["house"])
            ).options
        ).toEqual([]);
    });

    it("keeps a locked prefix but lets a roll change the shape, never to one that starts with a suffix", () => {
        const before = pick(shaped(LONG));
        const locks = { f0: part(before, "f0"), shape: before.shape, sex: before.sex };
        const rolled = Array.from({ length: 300 }, (_, i) =>
            gen.generate({ locks, reshape: true, random: seededRandom(i) })
        );
        rolled.forEach((r) => expect(part(r, "f0").text).toBe(part(before, "f0").text));
        const shapes = new Set(rolled.map((r) => r.shape.join()));
        expect(shapes.size).toBeGreaterThan(2);
        rolled.forEach((r) => expect(r.shape[0]).toBe("prefix"));
        // without a roll request the shape stays as it was
        for (let i = 0; i < 30; i++) {
            expect(gen.generate({ locks, random: seededRandom(i) }).shape.join()).toBe(LONG);
        }
    });
});
