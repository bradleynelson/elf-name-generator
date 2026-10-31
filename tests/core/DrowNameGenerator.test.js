import { beforeEach, describe, expect, it } from "vitest";
import { DrowNameGenerator } from "../../js/core/DrowNameGenerator.js";
import { expectGivesUpAfter300Attempts, fixedRandom, seededRandom, sample } from "../helpers/random.js";
import { readJson } from "../helpers/files.js";

// Design decisions (2026-10-20): Dragon #267 tables with their own meanings; about 15%
// apostrophes; males never take feminine components; FOR2 taboos; published matches labeled; locks keep components.
const data = readJson("data/drowNames.json");
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
                // the name holds only the second of two: one match is enough to refuse it
                forbiddenNames: ["vhaeraun", "lolth"]
            })
        );
        expect(() => gen.generate({ style: "feminine", random: seededRandom(1) })).toThrow(/unlocking/);
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

    it("shows a control as on when the name has that structure, so its button removes it", () => {
        const on = (r) =>
            Object.fromEntries(
                gen.getStructureControls(r, new Set(), { random: random() }).map((c) => [c.control, c.on])
            );
        expect(on(pick(shaped(SHORT)))).toEqual({ given: false, compound: false });
        expect(on(pick(shaped(LONG)))).toEqual({ given: true, compound: false });
        expect(on(pick(shaped(COMPOUND))).compound).toBe(true);
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

describe("DrowNameGenerator long names", () => {
    // Sampling: 6,000 unlocked feminine rolls (seed 1), keeping those in the three-component shape, against 30 rolls
    // (seeds 100+) for each of 60 different locked first components in that same shape. Comparing within one shape
    // keeps shape weights out of it; the locked components are drawn uniformly, as an unlocked roll draws them.
    const SHAPE = "prefix,suffix,suffix";
    const gen = new DrowNameGenerator(data);
    const roll = (count, seed, locks = {}) => {
        const random = seededRandom(seed);
        return Array.from({ length: count }, () => gen.generate({ style: "feminine", locks, random }));
    };
    const longShare = (results) =>
        results.filter((r) => (r.name.split(" ")[0].match(/[aeiouy]+/gi) || []).length >= 4).length / results.length;

    it("keeps four-syllable names as uncommon with a locked component as without", () => {
        const unlocked = roll(6000, 1).filter((r) => r.shape.join() === SHAPE);
        const kept = new Map(unlocked.map((r) => [r.parts.find((p) => p.key === "f0").text, r]));
        const locked = [...kept.values()].slice(0, 60).flatMap((r, i) => {
            const f0 = r.parts.find((p) => p.key === "f0");
            return roll(30, 100 + i, { shape: r.shape, sex: r.sex, f0 });
        });
        expect(locked.length).toBe(1800);
        expect(longShare(unlocked)).toBeGreaterThan(0.05);
        expect(longShare(locked) / longShare(unlocked)).toBeGreaterThan(0.7);
        expect(longShare(locked) / longShare(unlocked)).toBeLessThan(1.3);
    });
});

// BMN-81: rules that earlier tests left unguarded, found by mutation testing (Stryker).
describe("DrowNameGenerator rule guards", () => {
    // The draws of one attempt, in the order the generator takes them: the shape, each table slot (the form for a
    // female, then the entry), the published-house share, and a built house's prefix and suffix. Expanded Variety adds
    // a split-or-table draw before each slot.
    const attempt = ({ shape = 0.1, prefix = [0.9, 0], suffix = [0.9, 0], house = [0.9, 0, 0] } = {}) => [
        shape,
        ...prefix,
        ...suffix,
        ...house
    ];
    const APOSTROPHE_SHAPE = 0.8;
    const roll = (data, options = {}, ...draws) =>
        new DrowNameGenerator(data).generate({ style: "feminine", random: fixedRandom(...draws), ...options });
    const part = (result, key) => result.parts.find((p) => p.key === key);
    const texts = (options) => options.map((o) => o.text);
    const published = { text: "Baenre", source: { title: "Menzoberranzan (2e)" } };
    const splitData = {
        openings: [
            { text: "vel", from: ["Velkyn"] },
            { text: "sor", from: ["Sorkyn"] }
        ],
        // "bri" is also a table entry, so it must not be offered a second time as a published component
        endings: [{ text: "nith", sex: "female", from: ["Velnith"] }]
    };
    splitData.openings.push({ text: "bri", from: ["Brizyn"] });

    it("makes a neutral name when no style is given", () => {
        const result = new DrowNameGenerator(fixture()).generate({ random: fixedRandom(...attempt()) });
        expect(result.sex).toBe("neutral");
    });

    it("lets a female take the masculine form of a component rarely, not usually", () => {
        // Sourced: "Rarely, a female drow might take part of a purely masculine name" (Dragon #267); the draws are the
        // two ends of the roll, not the rate
        const forms = fixture({
            prefixes: [{ female: "bri", male: "bro", meaning: "Graceful" }],
            suffixes: [{ female: "za", male: "zo", meaning: "Lover" }]
        });
        const rare = roll(forms, {}, ...attempt({ prefix: [0.01, 0] }));
        const usual = roll(forms, {}, ...attempt({ prefix: [0.5, 0] }));
        expect(texts([part(rare, "f0"), part(rare, "f1")])).toEqual(["bro", "za"]);
        expect(texts([part(usual, "f0"), part(usual, "f1")])).toEqual(["bri", "za"]);
    });

    it("avoids repeating a recent name when another is possible, and repeats it when not", () => {
        const gen = new DrowNameGenerator(
            fixture({
                prefixes: [
                    { female: "bri", male: "bri", meaning: "Graceful" },
                    { female: "kel", male: "kel", meaning: "Dark" }
                ]
            })
        );
        const first = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
        const second = gen.generate({
            style: "feminine",
            random: fixedRandom(...attempt(), ...attempt({ prefix: [0.9, 0.99] }))
        });
        expect(second.name).not.toBe(first.name);
        const only = new DrowNameGenerator(fixture());
        const again = Array.from({ length: 3 }, () =>
            only.generate({ style: "feminine", random: fixedRandom(...attempt()) })
        );
        expect(new Set(again.map((r) => r.name)).size).toBe(1);
    });

    describe("two-word names", () => {
        const COMPOUND_SHAPE = 0.9;
        const twoWords = (extra, ...draws) =>
            roll(
                fixture({
                    prefixes: [
                        { female: "balata", male: "balata", meaning: "Graceful" },
                        { female: "bi", male: "bi", meaning: "Dark" }
                    ],
                    suffixes: [
                        { female: "kemi", male: "kemi", meaning: "Lover" },
                        { female: "ke", male: "ke", meaning: "Mother" }
                    ],
                    ...extra
                }),
                {},
                ...draws
            );
        // first word: prefix, suffix; second word: prefix, suffix; each as a form draw, then an entry draw
        const words = (first, second) => [COMPOUND_SHAPE, 0.9, first[0], 0.9, first[1], 0.9, second[0], 0.9, second[1]];

        it("refuses the name when either word breaks a rule", () => {
            // first attempt: "bikemi" is fine and too short for the length preference, "bike" is a common word; the
            // second attempt, after the first one's house draws, repeats the fine word
            const result = twoWords(
                { commonWords: ["bike"] },
                ...words([0.99, 0], [0.99, 0.99]),
                ...[0.9, 0, 0],
                ...words([0.99, 0], [0.99, 0])
            );
            expect(result.name.split(" ").slice(0, 2)).toEqual(["Bikemi", "Bikemi"]);
        });

        it("judges the length of a two-word name by its longest word", () => {
            // the long first word is dropped on a high draw even though the second word is short
            const result = twoWords({}, ...words([0, 0], [0.99, 0.99]), 0.9);
            expect(result.name.toLowerCase()).not.toContain("balata");
        });
    });

    describe("long names", () => {
        // Inferred: published male names are shorter; a name of four or more syllables is kept only with some
        // probability. The draws are the two ends of the roll, so each side of the preference is shown to happen.
        const long = fixture({
            prefixes: [{ female: "balata", male: "balata", meaning: "Graceful" }],
            suffixes: [{ female: "kemi", male: "kemi", meaning: "Lover" }]
        });
        const short = fixture({
            prefixes: [{ female: "bala", male: "bala", meaning: "Graceful" }],
            suffixes: [{ female: "ke", male: "ke", meaning: "Lover" }]
        });

        it.each(["feminine", "masculine", "neutral"])(
            "keeps a four-syllable %s name on a low draw, drops it on a high one",
            (style) => {
                const gen = new DrowNameGenerator(long);
                expect(gen.generate({ style, random: () => 0.1 }).name).toContain("Balatakemi");
                expect(() => gen.generate({ style, random: () => 0.9 })).toThrow(/unlocking/);
            }
        );

        it("counts a name of exactly four syllables as long", () => {
            const four = fixture({
                prefixes: [{ female: "bala", male: "bala", meaning: "Graceful" }],
                suffixes: [{ female: "kemi", male: "kemi", meaning: "Lover" }]
            });
            expect(() => new DrowNameGenerator(four).generate({ style: "feminine", random: () => 0.9 })).toThrow(
                /unlocking/
            );
        });

        it("never drops a name of three syllables or fewer", () => {
            expect(new DrowNameGenerator(short).generate({ style: "feminine", random: () => 0.9 }).name).toContain(
                "Balake"
            );
        });

        it("counts a run of vowels as one syllable, and consonants not at all", () => {
            // "baelikest": three vowel groups, but four vowels and four consonant groups
            const paired = fixture({
                prefixes: [{ female: "baeli", male: "baeli", meaning: "Graceful" }],
                suffixes: [{ female: "kest", male: "kest", meaning: "Lover" }]
            });
            expect(new DrowNameGenerator(paired).generate({ style: "feminine", random: () => 0.9 }).name).toContain(
                "Baelikest"
            );
        });

        it("counts an accented vowel as a syllable (BMN-97)", () => {
            // "balarené" has four syllables, the last of them accented (as in -rené, from Chilrené)
            const accented = fixture({
                prefixes: [{ female: "bala", male: "bala", meaning: "Graceful" }],
                suffixes: [{ female: "rené", male: "rené", meaning: "Lover" }]
            });
            expect(() => new DrowNameGenerator(accented).generate({ style: "feminine", random: () => 0.9 })).toThrow(
                /unlocking/
            );
        });

        it("counts no syllables in a word without a vowel", () => {
            const vowelless = fixture({
                prefixes: [{ female: "st", male: "st", meaning: "Graceful" }],
                suffixes: [{ female: "rk", male: "rk", meaning: "Lover" }]
            });
            expect(new DrowNameGenerator(vowelless).generate({ style: "feminine", random: () => 0.9 }).name).toContain(
                "Strk"
            );
        });
    });

    describe("Expanded Variety", () => {
        const expandedFixture = fixture({ ...splitData });
        const expandedRoll = (...draws) => roll(expandedFixture, { expanded: true }, ...draws);

        it("fills a slot with a component of a published name on a low draw, from the table on a high one", () => {
            const split = expandedRoll(...attempt({ prefix: [0.4, 0], suffix: [0.9, 0.9, 0] }));
            expect(part(split, "f0")).toMatchObject({ text: "vel", method: "split" });
            expect(part(split, "f1")).toMatchObject({ text: "za" });
            expect(part(split, "f1").method).toBeUndefined();
            const table = expandedRoll(...attempt({ prefix: [0.6, 0.9, 0], suffix: [0.6, 0.9, 0] }));
            expect(part(table, "f0").method).toBeUndefined();
            expect(part(table, "f1").method).toBeUndefined();
        });

        it("cites the tables if any part has a meaning, and not if none does", () => {
            const onePublished = { publishedHouses: [published] };
            const house = [0.1, 0];
            const mixed = roll(
                fixture({ ...splitData, ...onePublished }),
                { expanded: true },
                ...attempt({ prefix: [0.4, 0], suffix: [0.9, 0.9, 0], house })
            );
            expect(mixed.tables).toMatch(/Dragon #267/);
            const unknown = roll(
                fixture({ ...splitData, ...onePublished }),
                { expanded: true },
                ...attempt({ prefix: [0.4, 0], suffix: [0.4, 0], house })
            );
            expect(unknown.tables).toBeUndefined();
        });

        it("offers the other published components for a published-name slot only, besides the table entries", () => {
            const result = expandedRoll(...attempt({ prefix: [0.4, 0], suffix: [0.9, 0.9, 0] }));
            const prefixes = gen_options(result, "f0");
            expect(texts(prefixes)).toEqual(["bri", "vel", "sor"]);
            expect(prefixes.filter((o) => o.method === "split").map((o) => o.role)).toEqual(["prefix", "prefix"]);
            // a table slot offers table entries only, though published endings exist
            expect(texts(gen_options(result, "f1"))).toEqual(["za"]);
        });

        function gen_options(result, key) {
            return new DrowNameGenerator(expandedFixture).optionsFor(result, key);
        }

        it("takes table entries only when a structure change does not ask for Expanded Variety", () => {
            const gen = new DrowNameGenerator(expandedFixture);
            const before = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            const longer = gen.generateStructureChange(before, "given", { random: () => 0.1 });
            expect(part(longer, "f2").text).toBe("za");
            expect(part(longer, "f2").method).toBeUndefined();
        });
    });

    describe("structure changes", () => {
        it("does not apply the long-name preference to a change the visitor asked for", () => {
            const gen = new DrowNameGenerator(
                fixture({
                    prefixes: [{ female: "balata", male: "balata", meaning: "Graceful" }],
                    suffixes: [{ female: "kemi", male: "kemi", meaning: "Lover" }]
                })
            );
            const before = gen.generate({ style: "feminine", random: () => 0.1 });
            const longer = gen.generateStructureChange(before, "given", { random: () => 0.9 });
            expect(longer.shape.join()).toBe("prefix,suffix,suffix");
        });

        it("gives up with no name when every attempt breaks a rule", () => {
            const gen = new DrowNameGenerator(fixture({ commonWords: ["brizaza"] }));
            const before = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            expect(before.name).toMatch(/^Briza /);
            expect(gen.generateStructureChange(before, "given", { random: () => 0.9 })).toBeNull();
        });

        it("keeps a published house exactly as it was, whatever its capitals", () => {
            const gen = new DrowNameGenerator(fixture({ publishedHouses: [{ ...published, text: "de'Lorn" }] }));
            const before = gen.generate({ style: "feminine", random: fixedRandom(...attempt({ house: [0.1, 0] })) });
            expect(before.name).toBe("Briza de'Lorn");
            expect(gen.generateStructureChange(before, "given", { random: () => 0.1 }).name).toBe("Brizaza de'Lorn");
        });
    });

    describe("part picker", () => {
        const tables = fixture({
            prefixes: [
                { female: "bri", male: "bro", meaning: "Graceful" },
                { female: "kel", male: "kal", meaning: "Dark" }
            ],
            housePrefixes: [
                { text: "lorn", meaning: "Of the" },
                { text: "vael", meaning: "Blood of the" },
                { text: "baen", meaning: "Blessed by" }
            ],
            publishedHouses: [published]
        });
        let gen;
        // a fresh generator per test: it remembers recent names, and a repeat would use the draws that follow
        beforeEach(() => {
            gen = new DrowNameGenerator(tables);
        });
        it("offers the other entries of a table in the form the name uses", () => {
            const female = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            const male = gen.generate({ style: "masculine", random: fixedRandom(...attempt()) });
            expect(gen.optionsFor(female, "f0")).toEqual([
                { key: "f0", role: "prefix", text: "bri", meaning: "Graceful" },
                { key: "f0", role: "prefix", text: "kel", meaning: "Dark" }
            ]);
            expect(texts(gen.optionsFor(male, "f0"))).toEqual(["bro", "kal"]);
            expect(texts(gen.optionsFor(female, "f1"))).toEqual(["za"]);
        });

        it("offers nothing for a part that is not a table entry, or that the name does not have", () => {
            const result = gen.generate({
                style: "feminine",
                random: fixedRandom(...attempt({ shape: APOSTROPHE_SHAPE }))
            });
            expect(part(result, "s2").role).toBe("apostrophe");
            expect(gen.optionsFor(result, "s2")).toEqual([]);
            expect(gen.optionsFor(result, "f9")).toEqual([]);
        });

        it("offers only those entries that keep the name within the rules, with the rest kept as it is", () => {
            const narrow = new DrowNameGenerator(
                fixture({
                    prefixes: [
                        { female: "ka", male: "ka", meaning: "Dark" },
                        { female: "ki", male: "ki", meaning: "Graceful" }
                    ],
                    suffixes: [
                        { female: "za", male: "za", meaning: "Lover" },
                        { female: "aa", male: "aa", meaning: "Mother" }
                    ]
                })
            );
            const result = narrow.generate({
                style: "feminine",
                random: fixedRandom(...attempt({ prefix: [0.9, 0.9], suffix: [0.9, 0.9] }))
            });
            expect(result.name).toMatch(/^Kiaa /);
            // "ka" before the kept "aa" would make three a's in a row
            expect(texts(narrow.optionsFor(result, "f0"))).toEqual(["ki"]);
        });

        it("offers the published houses, none when the data has none", () => {
            const result = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            expect(gen.optionsFor(result, "house")).toEqual([
                { key: "house", role: "house", text: "Baenre", method: "published", source: published.source }
            ]);
            const bare = new DrowNameGenerator(fixture({ publishedHouses: undefined }));
            expect(bare.optionsFor(result, "house")).toEqual([]);
            expect(bare.getSurnameSwitchOptions(result).options).toEqual([]);
        });

        it("offers house prefixes except those beginning with the L of Lolth", () => {
            const result = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            expect(gen.optionsFor(result, "n0")).toEqual([
                { key: "n0", role: "house prefix", text: "vael", meaning: "Blood of the" },
                { key: "n0", role: "house prefix", text: "baen", meaning: "Blessed by" }
            ]);
            const switched = gen.getSurnameSwitchOptions(
                gen.generate({ style: "feminine", random: fixedRandom(...attempt({ house: [0.1, 0] })) })
            );
            expect(switched.kind).toBe("constructed");
            expect(switched.options.map((o) => [o.role, o.text])).toEqual([
                ["house prefix", "vael"],
                ["house prefix", "baen"]
            ]);
        });

        it("keeps only the first name's parts when the house is switched", () => {
            const keys = (result) => result.parts.map((p) => p.key);
            const before = gen.generate({ style: "feminine", random: fixedRandom(...attempt({ house: [0.1, 0] })) });
            expect(keys(before)).toEqual(["f0", "f1", "house"]);
            const rebuilt = gen.generateSurnameChange(before, gen.getSurnameSwitchOptions(before).options[0]);
            expect(keys(rebuilt)).toEqual(["f0", "f1", "n0", "n1"]);
            expect(keys(gen.generateSurnameChange(rebuilt, gen.getSurnameSwitchOptions(rebuilt).options[0]))).toEqual([
                "f0",
                "f1",
                "house"
            ]);
        });

        it("offers no house switch when either component of a built house is locked", () => {
            const built = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            expect(gen.getSurnameSwitchOptions(built, new Set(["n0"])).options).toEqual([]);
            expect(gen.getSurnameSwitchOptions(built, new Set(["n1"])).options).toEqual([]);
            expect(gen.getSurnameSwitchOptions(built).options).toHaveLength(1);
        });
    });

    describe("houses", () => {
        const withHouses = fixture({ publishedHouses: [published] });

        it("takes a published house on a draw under the share and builds one from the share up", () => {
            // Chosen: half the houses are published ones; the draws sit either side of the boundary
            const under = roll(withHouses, {}, ...attempt({ house: [0.49, 0] }));
            const at = roll(withHouses, {}, ...attempt({ house: [0.5, 0, 0] }));
            expect(under.name).toBe("Briza Baenre");
            expect(part(under, "house").method).toBe("published");
            expect(at.name).toBe("Briza Baenrae");
        });

        it("builds a house when the data has no published ones, even on a low draw", () => {
            const result = roll(fixture({ publishedHouses: undefined }), {}, ...attempt({ house: [0.1, 0, 0] }));
            expect(result.name).toBe("Briza Baenrae");
        });

        it("joins the meaning of a house without repeating 'the', and keeps a later 'the'", () => {
            const meaning = (prefix, suffix) =>
                part(
                    roll(
                        fixture({
                            housePrefixes: [{ text: "auvry", meaning: prefix }],
                            houseSuffixes: [{ text: "ghym", meaning: suffix }]
                        }),
                        {},
                        ...attempt()
                    ),
                    "n1"
                ).wordMeaning;
            expect(meaning("Blood of the", "Servant of the pit")).toBe("Blood of the servant of the pit");
            expect(meaning("Blood of the", "The  forgotten ways")).toBe("Blood of the forgotten ways");
            // only a prefix that ends with "the" gives its "the" to the suffix
            expect(meaning("Theft of", "The pit")).toBe("Theft of the pit");
        });
    });

    describe("taboos", () => {
        it("reads a name without its apostrophes when checking it against a drow deity", () => {
            const gen = new DrowNameGenerator(
                fixture({
                    prefixes: [{ female: "lo", male: "lo", meaning: "Graceful" }],
                    suffixes: [
                        { female: "l", male: "l", meaning: "Lover" },
                        { female: "th", male: "th", meaning: "Dark" }
                    ],
                    forbiddenNames: ["lolth"]
                })
            );
            // Sampling: 300 feminine rolls (seed 7); about 1 in 40 would be "Lol'th" without the rule
            const random = seededRandom(7);
            const names = Array.from(
                { length: 300 },
                () => gen.generate({ style: "feminine", random }).name.split(" ")[0]
            );
            expect(names.some((name) => name.includes("'"))).toBe(true);
            names.forEach((name) => expect(name.replace(/'/g, "").toLowerCase()).not.toContain("lolth"));
        });
    });
});

describe("DrowNameGenerator input guards", () => {
    it.each([
        ["prefixes", { prefixes: [] }],
        ["suffixes", { suffixes: [] }],
        ["prefixes (missing)", { prefixes: undefined }],
        ["suffixes (missing)", { suffixes: undefined }]
    ])("refuses data with no %s", (_, overrides) => {
        expect(() => new DrowNameGenerator(fixture(overrides))).toThrow(
            "Drow name data is missing prefixes or suffixes"
        );
    });

    it("refuses missing data", () => {
        expect(() => new DrowNameGenerator()).toThrow(/missing prefixes or suffixes/);
    });

    // A style outside the picker's three values (a direct caller) leaves the sex to the locks, then to a coin toss.
    it("takes the sex from the locks when the style names none and a first-name component is kept", () => {
        const gen = new DrowNameGenerator(data);
        const before = gen.generate({ style: "feminine", random: seededRandom(5) });
        const locks = { f0: before.parts.find((p) => p.key === "f0"), shape: before.shape, sex: "male" };
        // a draw below 0.5 would make the coin toss say female, so only the lock can give male
        expect(gen.generate({ style: "unlisted", locks, random: fixedRandom(0.1) }).sex).toBe("male");
    });

    it("tosses a coin for the sex when the style names none and nothing is locked", () => {
        const gen = new DrowNameGenerator(fixture());
        expect(gen.generate({ style: "unlisted", random: fixedRandom(0.49, 0.1) }).sex).toBe("female");
        expect(gen.generate({ style: "unlisted", random: fixedRandom(0.5, 0.1) }).sex).toBe("male");
    });
});

describe("DrowNameGenerator gives up after exactly 300 attempts", () => {
    // tables whose every component repeats a letter three times, so no name built from them is allowed
    const never = new DrowNameGenerator(
        fixture({
            prefixes: [{ female: "aaa", male: "aaa", meaning: "Never" }],
            suffixes: [{ female: "aaa", male: "aaa", meaning: "Never" }]
        })
    );

    it("when no name can be built", () => {
        expectGivesUpAfter300Attempts((random) => expect(() => never.generate({ random })).toThrow(/unlocking/));
    });

    it("when a structure change cannot be built", () => {
        const real = new DrowNameGenerator(data);
        const changeable = sample(real, 300).find((r) =>
            real.getStructureControls(r).some((c) => c.control === "given")
        );
        expectGivesUpAfter300Attempts((random) =>
            expect(never.generateStructureChange(changeable, "given", { random })).toBeNull()
        );
    });
});
