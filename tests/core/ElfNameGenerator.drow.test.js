import { beforeEach, describe, expect, it } from "vitest";
import { ElfNameGenerator } from "../../js/core/ElfNameGenerator.js";
import { ELF_LINEAGE_RULES } from "../../js/core/elfLineages.js";
import { isSamePart } from "../../js/core/nameStructure.js";
import { fixedRandom, seededRandom, sample } from "../helpers/random.js";
import {
    cutFrom,
    expectBooksOfItsNames,
    nameTable,
    publishedName,
    readLineageData,
    word
} from "../helpers/nameData.js";

const data = readLineageData("drow");
const drowGenerator = (lineageData) => new ElfNameGenerator(lineageData, ELF_LINEAGE_RULES.drow);
const tableOf = (type) => data.tables.find((t) => t.type === type);
const realPrefixes = tableOf("given").prefixes;
const realSuffixes = tableOf("given").suffixes;
// a table entry gives `text` when its female and male forms are the same
const formsOf = (e) => ({ female: e.female ?? e.text, male: e.male ?? e.text, meaning: e.meaning });
const personal = (result) => result.name.slice(0, result.name.lastIndexOf(" "));
const components = (result) => result.parts.filter((p) => p.role === "prefix" || p.role === "suffix");
const TABLES = "Dragon #267";
// what every table part carries besides its text and meaning: its table as its source, and its place in the name
const TABLE_PART = { sources: [{ title: TABLES, authority: "official" }], section: "given" };
const HOUSE_PART = { ...TABLE_PART, section: "family", kind: "prefix" };
// Drow data as generators.js gives it, from short lists; `commonWords` is the FOR2 glossary and `forbiddenNames` the
// deity names.
const fixture = ({
    prefixes = [{ female: "bri", male: "bri", meaning: "Graceful" }],
    suffixes = [{ female: "za", male: "za", meaning: "Lover" }],
    housePrefixes = [{ text: "baen", meaning: "Blessed by" }],
    houseSuffixes = [{ text: "rae", meaning: "Fell powers" }],
    publishedNames = [],
    publishedHouses = [],
    commonWords = [],
    forbiddenNames = [],
    openings,
    endings,
    joinClusters
} = {}) => {
    const given = publishedNames.map((p) => publishedName(p.text, "given", { sources: [p.source] }));
    const cut = cutFrom({ openings, endings, joins: joinClusters }, given);
    return {
        tables: [
            nameTable("given", { prefixes, suffixes, sources: TABLE_PART.sources }),
            nameTable("house", { prefixes: housePrefixes, suffixes: houseSuffixes, sources: TABLE_PART.sources })
        ],
        names: [
            ...given,
            ...cut.names,
            ...(publishedHouses || []).map((h) => publishedName(h.text, "house", { sources: [h.source] }))
        ],
        words: [...commonWords.map((w) => word(w, "glossary")), ...forbiddenNames.map((w) => word(w, "forbidden"))],
        split: { given: cut.split },
        sources: []
    };
};

describe("ElfNameGenerator for drow: with the published tables", () => {
    it("puts an apostrophe in about 15% of personal names, never two in one word", () => {
        const names = sample(drowGenerator(data), 2000, { style: "feminine" }).map(personal);
        const share = names.filter((n) => n.includes("'")).length / names.length;
        expect(share).toBeGreaterThan(0.1);
        expect(share).toBeLessThan(0.2);
        names.forEach((n) => n.split(" ").forEach((w) => expect((w.match(/'/g) || []).length).toBeLessThanOrEqual(1)));
    });

    it("never gives a male a feminine-only component, and takes meanings from the component's own table entry", () => {
        const meaningsByMaleForm = (entries) =>
            entries.reduce((map, e) => map.set(e.male, [...(map.get(e.male) || []), e.meaning]), new Map());
        const tables = {
            prefix: meaningsByMaleForm(realPrefixes.map(formsOf)),
            suffix: meaningsByMaleForm(realSuffixes.map(formsOf))
        };
        sample(drowGenerator(data), 500, { style: "masculine" }).forEach((r) =>
            components(r).forEach((f) => expect(tables[f.role].get(f.text)).toContain(f.meaning))
        );
    });

    it("gives neutral names only components whose female and male forms are the same", () => {
        const shared = new Set(
            [...realPrefixes, ...realSuffixes]
                .map(formsOf)
                .filter((e) => e.female === e.male)
                .map((e) => e.male)
        );
        sample(drowGenerator(data), 300, { style: "neutral" }).forEach((r) =>
            components(r).forEach((f) => expect(shared.has(f.text)).toBe(true))
        );
    });

    it("never builds a house name starting with the L of Lolth", () => {
        sample(drowGenerator(data), 500).forEach((r) => {
            const prefix = r.parts.find((p) => p.key === "n0");
            if (prefix) expect(prefix.text).not.toMatch(/^l/i);
        });
    });

    it("lets a built house keep a locked component while the other is re-rolled", () => {
        const gen = drowGenerator(data);
        const first = sample(gen, 50).find((r) => r.parts.some((p) => p.key === "n0"));
        const kept = first.parts.find((p) => p.key === "n0");
        const next = sample(gen, 20, { locks: { n0: kept } });
        next.forEach((r) => expect(r.parts.find((p) => p.key === "n0").text).toBe(kept.text));
        expect(new Set(next.map((r) => r.parts.find((p) => p.key === "n1").text)).size).toBeGreaterThan(1);
    });

    it("names every book a split component's source names come from, each once (Expanded Variety)", () => {
        const given = data.names.filter((n) => n.type === "given");
        const splits = sample(drowGenerator(data), 300, { expanded: true }).flatMap((r) =>
            r.parts.filter((p) => p.method === "split")
        );
        expectBooksOfItsNames(splits, () => given);
    });

    it("keeps locked components in their places", () => {
        const gen = drowGenerator(data);
        const first = gen.generate({ style: "feminine", random: seededRandom(3) });
        const kept = components(first)[0];
        sample(gen, 20, { style: "feminine", locks: { shape: first.shape, [kept.key]: kept } }).forEach((r) =>
            expect(r.parts.find((p) => p.key === kept.key).text).toBe(kept.text)
        );
    });
});

describe("ElfNameGenerator for drow: common-word rule with the published glossary", () => {
    const glossary = data.words.filter((w) => w.use === "glossary" && w.text.includes("'")).map((w) => w.text);

    it("refuses every glossary word that has an apostrophe, spelled with or without it", () => {
        const gen = drowGenerator(data);
        expect(glossary).toHaveLength(9);
        glossary.forEach((w) => {
            expect(gen._isAllowedWord(w)).toBe(false);
            expect(gen._isAllowedWord(w.replace("'", ""))).toBe(false);
        });
    });
});

describe("ElfNameGenerator for drow: rules", () => {
    it("refuses names containing a drow deity's name, wherever it falls", () => {
        const gen = drowGenerator(
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
        const gen = drowGenerator(
            fixture({ publishedNames: [{ text: "Briza", source: { title: "Menzoberranzan (2e)" } }] })
        );
        const result = gen.generate({ style: "feminine", random: fixedRandom(0.1) });
        expect(result.name).toBe("Briza Baenrae");
        expect(result.published.sources).toEqual([{ title: "Menzoberranzan (2e)" }]);
    });

    it("credits a published name only to the books that print that exact spelling, apostrophe and all", () => {
        const publishedNames = [
            { text: "Shi'nayne", source: { title: "Lair Assault: Spiderkiller (4e)" } },
            { text: "Shinayne", source: { title: "The Drow of the Underdark (2e)" } }
        ];
        const gen = drowGenerator(
            fixture({
                prefixes: [{ female: "s", male: "s", meaning: "One" }],
                suffixes: [
                    { female: "hi", male: "hi", meaning: "Two" },
                    { female: "nayne", male: "nayne", meaning: "Three" }
                ],
                publishedNames
            })
        );
        const booksOf = (spelling) =>
            sample(gen, 400, { style: "feminine" })
                .find((r) => personal(r) === spelling)
                .published.sources.map((s) => s.title);
        expect(booksOf("Shi'nayne")).toEqual(["Lair Assault: Spiderkiller (4e)"]);
        expect(booksOf("Shinayne")).toEqual(["The Drow of the Underdark (2e)"]);
    });

    it("composes a house meaning from its two table entries", () => {
        const house = drowGenerator(fixture())
            .generate({ style: "feminine", random: fixedRandom(0.1, 0.9) })
            .parts.find((p) => p.key === "n1");
        expect(house.wordMeaning).toBe("Blessed by fell powers");
    });

    it("does not double 'the' when a house prefix ends with it", () => {
        const gen = drowGenerator(
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

describe("ElfNameGenerator for drow: structure controls, switching and rolls under locks", () => {
    const gen = drowGenerator(data);
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

describe("ElfNameGenerator for drow: long names", () => {
    // Sampling: 6,000 unlocked feminine rolls (seed 1) in the three-component shape, against 30 rolls (seeds 100+) for
    // each of 60 locked first components in that shape, so shape weights stay out of it.
    const SHAPE = "prefix,suffix,suffix";
    const gen = drowGenerator(data);
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

// Rules that earlier tests left unguarded, found by mutation testing (Stryker).
describe("ElfNameGenerator for drow: rule guards", () => {
    // One attempt's draws, in order: shape, each slot (a female's form, then the entry), published-house share, house
    // prefix and suffix. Expanded Variety adds a split-or-table draw before each slot.
    const attempt = ({ shape = 0.1, prefix = [0.9, 0], suffix = [0.9, 0], house = [0.9, 0, 0] } = {}) => [
        shape,
        ...prefix,
        ...suffix,
        ...house
    ];
    const APOSTROPHE_SHAPE = 0.8;
    const roll = (data, options = {}, ...draws) =>
        drowGenerator(data).generate({ style: "feminine", random: fixedRandom(...draws), ...options });
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
        const result = drowGenerator(fixture()).generate({ random: fixedRandom(...attempt()) });
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
        const gen = drowGenerator(
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
        const only = drowGenerator(fixture());
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

        it("judges the long word of a two-word name when it is the second", () => {
            // a short first word does not stand for the whole name: the long second word is dropped on a high draw
            const result = twoWords({}, ...words([0.99, 0.99], [0, 0]), 0.9);
            expect(result.name.toLowerCase()).not.toContain("balata");
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
                const gen = drowGenerator(long);
                expect(gen.generate({ style, random: () => 0.1 }).name).toContain("Balatakemi");
                expect(() => gen.generate({ style, random: () => 0.9 })).toThrow(/unlocking/);
            }
        );

        it("counts a name of exactly four syllables as long", () => {
            const four = fixture({
                prefixes: [{ female: "bala", male: "bala", meaning: "Graceful" }],
                suffixes: [{ female: "kemi", male: "kemi", meaning: "Lover" }]
            });
            expect(() => drowGenerator(four).generate({ style: "feminine", random: () => 0.9 })).toThrow(/unlocking/);
        });

        it("never drops a name of three syllables or fewer", () => {
            expect(drowGenerator(short).generate({ style: "feminine", random: () => 0.9 }).name).toContain("Balake");
        });

        it("counts a run of vowels as one syllable, and consonants not at all", () => {
            // "baelikest": three vowel groups, but four vowels and four consonant groups
            const paired = fixture({
                prefixes: [{ female: "baeli", male: "baeli", meaning: "Graceful" }],
                suffixes: [{ female: "kest", male: "kest", meaning: "Lover" }]
            });
            expect(drowGenerator(paired).generate({ style: "feminine", random: () => 0.9 }).name).toContain(
                "Baelikest"
            );
        });

        it("counts an accented vowel as a syllable", () => {
            // "balarené" has four syllables, the last of them accented (as in -rené, from Chilrené)
            const accented = fixture({
                prefixes: [{ female: "bala", male: "bala", meaning: "Graceful" }],
                suffixes: [{ female: "rené", male: "rené", meaning: "Lover" }]
            });
            expect(() => drowGenerator(accented).generate({ style: "feminine", random: () => 0.9 })).toThrow(
                /unlocking/
            );
        });

        it("counts no syllables in a word without a vowel", () => {
            const vowelless = fixture({
                prefixes: [{ female: "st", male: "st", meaning: "Graceful" }],
                suffixes: [{ female: "rk", male: "rk", meaning: "Lover" }]
            });
            expect(drowGenerator(vowelless).generate({ style: "feminine", random: () => 0.9 }).name).toContain("Strk");
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

        it("credits table components to the tables' issue, and adds no separate tables credit", () => {
            const onePublished = { publishedHouses: [published] };
            const house = [0.1, 0];
            const mixed = roll(
                fixture({ ...splitData, ...onePublished }),
                { expanded: true },
                ...attempt({ prefix: [0.4, 0], suffix: [0.9, 0.9, 0], house })
            );
            mixed.parts.filter((p) => p.meaning).forEach((p) => expect(p.sources).toEqual(TABLE_PART.sources));
            expect(mixed).not.toHaveProperty("tables");
            const unknown = roll(
                fixture({ ...splitData, ...onePublished }),
                { expanded: true },
                ...attempt({ prefix: [0.4, 0], suffix: [0.4, 0], house })
            );
            expect(unknown).not.toHaveProperty("tables");
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
            return drowGenerator(expandedFixture).optionsFor(result, key);
        }

        it("takes table entries only when a structure change does not ask for Expanded Variety", () => {
            const gen = drowGenerator(expandedFixture);
            const before = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            const longer = gen.generateStructureChange(before, "given", { random: () => 0.1 });
            expect(part(longer, "f2").text).toBe("za");
            expect(part(longer, "f2").method).toBeUndefined();
        });
    });

    describe("structure changes", () => {
        it("does not apply the long-name preference to a change the visitor asked for", () => {
            const gen = drowGenerator(
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
            const gen = drowGenerator(fixture({ commonWords: ["brizaza"] }));
            const before = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            expect(before.name).toMatch(/^Briza /);
            expect(gen.generateStructureChange(before, "given", { random: () => 0.9 })).toBeNull();
        });

        it.each([
            ["a glossary word with an apostrophe against a plain name", "bri", "bri'zaza"],
            ["a plain glossary word against a name with an apostrophe", "br'i", "brizaza"],
            ["apostrophes in different places on the two sides", "br'i", "bri'zaza"]
        ])(
            "refuses a name that is a common word apart from apostrophes (Quellar, qu'ellar): %s",
            (_, prefix, glossary) => {
                const tables = { prefixes: [{ female: prefix, male: prefix, meaning: "Graceful" }] };
                const before = drowGenerator(fixture(tables)).generate({
                    style: "feminine",
                    random: fixedRandom(...attempt())
                });
                const gen = drowGenerator(fixture({ ...tables, commonWords: [glossary] }));
                expect(gen.generateStructureChange(before, "given", { random: () => 0.9 })).toBeNull();
            }
        );

        it("keeps a published house exactly as it was, whatever its capitals", () => {
            const gen = drowGenerator(fixture({ publishedHouses: [{ ...published, text: "de'Lorn" }] }));
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
            gen = drowGenerator(tables);
        });
        it("offers a feminine name both forms of each entry, as a roll may, and a masculine name its own", () => {
            const female = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            const male = gen.generate({ style: "masculine", random: fixedRandom(...attempt()) });
            const prefix = { ...TABLE_PART, key: "f0", role: "prefix", kind: "prefix" };
            expect(gen.optionsFor(female, "f0")).toEqual([
                { ...prefix, text: "bri", meaning: "Graceful" },
                { ...prefix, text: "bro", meaning: "Graceful" },
                { ...prefix, text: "kel", meaning: "Dark" },
                { ...prefix, text: "kal", meaning: "Dark" }
            ]);
            expect(texts(gen.optionsFor(male, "f0"))).toEqual(["bro", "kal"]);
            expect(texts(gen.optionsFor(female, "f1"))).toEqual(["za"]);
        });

        it("finds a part's table by its kind, not its role wording", () => {
            const female = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            const reworded = {
                ...female,
                parts: female.parts.map((p) => (p.key === "f0" ? { ...p, role: "opening" } : p))
            };
            expect(texts(gen.optionsFor(reworded, "f0"))).toEqual(texts(gen.optionsFor(female, "f0")));
            expect(gen.optionsFor(reworded, "f0")).not.toHaveLength(0);
        });

        it("lists the masculine form a feminine name was rolled with (Greynitra Nullnar)", () => {
            const female = gen.generate({ style: "feminine", random: fixedRandom(...attempt({ prefix: [0.01, 0] })) });
            expect(part(female, "f0").text).toBe("bro");
            expect(gen.optionsFor(female, "f0").filter((o) => isSamePart(o, part(female, "f0")))).toHaveLength(1);
        });

        it("keeps the feminine form on a draw equal to the 5% share of masculine forms", () => {
            const female = gen.generate({ style: "feminine", random: fixedRandom(...attempt({ prefix: [0.05, 0] })) });
            expect(part(female, "f0").text).toBe("bri");
        });

        it("lists and changes the first-name components of a name with no shape, as 4.1.5 saved them", () => {
            const { shape, ...saved } = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            expect(shape).toBeDefined();
            const other = gen.optionsFor(saved, "f0").find((o) => o.text === "kel");
            const changed = gen.generatePartChange(saved, "f0", other);
            expect(changed.name).toBe(`Kelza ${saved.name.split(" ")[1]}`);
            expect(changed.parts.slice(1)).toEqual(saved.parts.slice(1));
        });

        it("changes one part, keeping the rest, with no draws and no change to the recent names", () => {
            const before = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            const recent = [...gen.recent.names];
            const kel = gen.optionsFor(before, "f0").find((o) => o.text === "kel");
            const changed = gen.generatePartChange(before, "f0", kel);
            expect(changed.name).toBe(before.name.replace(/^Bri/, "Kel"));
            expect(changed.shape).toEqual(before.shape);
            expect(changed.parts.filter((p) => p.key !== "f0")).toEqual(before.parts.filter((p) => p.key !== "f0"));
            expect(gen.recent.names).toEqual(recent);
            expect(gen.generatePartChange(before, "f0", { ...part(before, "f0") })).toBe(before);
        });

        it("changes a built house's prefix with its meaning, or the whole house", () => {
            const built = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            expect(built.name).toMatch(/ Vaelrae$/);
            const baen = gen.optionsFor(built, "n0").find((o) => o.text === "baen");
            const rebuilt = gen.generatePartChange(built, "n0", baen);
            expect(rebuilt.name).toMatch(/ Baenrae$/);
            expect(part(rebuilt, "n1").wordMeaning).toBe("Blessed by fell powers");
            const published = gen.generate({ style: "feminine", random: fixedRandom(...attempt({ house: [0.1, 0] })) });
            const baenre = gen.optionsFor(published, "house")[0];
            expect(gen.generatePartChange(published, "house", baenre)).toBe(published);
            expect(gen.generatePartChange(built, "house", baenre)).toBeNull();
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
            const narrow = drowGenerator(
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
            expect(narrow.generatePartChange(result, "f0", { ...part(result, "f0"), text: "ka" })).toBeNull();
        });

        it("offers the published houses, none when the data has none", () => {
            const result = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            const withHouse = gen.generate({ style: "feminine", random: fixedRandom(...attempt({ house: [0.1, 0] })) });
            expect(gen.optionsFor(withHouse, "house")).toEqual([
                {
                    key: "house",
                    role: "house",
                    text: "Baenre",
                    method: "published",
                    sources: [published.source],
                    section: "family",
                    kind: "whole"
                }
            ]);
            const bare = drowGenerator(fixture({ publishedHouses: undefined }));
            expect(bare.optionsFor(result, "house")).toEqual([]);
            expect(bare.getSurnameSwitchOptions(result).options).toEqual([]);
        });

        it("offers house prefixes except those beginning with the L of Lolth", () => {
            const result = gen.generate({ style: "feminine", random: fixedRandom(...attempt()) });
            expect(gen.optionsFor(result, "n0")).toEqual([
                { ...HOUSE_PART, key: "n0", role: "house prefix", text: "vael", meaning: "Blood of the" },
                { ...HOUSE_PART, key: "n0", role: "house prefix", text: "baen", meaning: "Blessed by" }
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
            const gen = drowGenerator(
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

describe("ElfNameGenerator for drow: input guards", () => {
    // the personal-name table without one of its lists, or with none of them
    const without = (list) => {
        const data = fixture();
        const [given, ...rest] = data.tables;
        return { ...data, tables: [{ ...given, [list]: undefined }, ...rest] };
    };
    it.each([
        ["prefixes", fixture({ prefixes: [] })],
        ["suffixes", fixture({ suffixes: [] })],
        ["prefixes (missing)", without("prefixes")],
        ["suffixes (missing)", without("suffixes")],
        ["personal-name table", { ...fixture(), tables: fixture().tables.slice(1) }]
    ])("refuses data with no %s", (_, data) => {
        expect(() => drowGenerator(data)).toThrow("Elf name data is missing the name tables");
    });
});

describe("ElfNameGenerator for drow: gives up after exactly 300 attempts", () => {
    // tables whose every component repeats a letter three times, so no name built from them is allowed
    const never = drowGenerator(
        fixture({
            prefixes: [{ female: "aaa", male: "aaa", meaning: "Never" }],
            suffixes: [{ female: "aaa", male: "aaa", meaning: "Never" }]
        })
    );

    it("says a drow name could not be made, in the lineage's words", () => {
        expect(() => never.generate({ random: fixedRandom(0.5) })).toThrow(
            "Could not make a drow name with these choices. Try unlocking a part."
        );
    });

    it("when no name can be built", () => {
        expect(() => never.generate({ random: fixedRandom(0.5) })).toThrow(/unlocking/);
    });

    it("when a structure change cannot be built", () => {
        const real = drowGenerator(data);
        const changeable = sample(real, 300).find((r) =>
            real.getStructureControls(r).some((c) => c.control === "given")
        );
        expect(never.generateStructureChange(changeable, "given", { random: fixedRandom(0.5) })).toBeNull();
    });
});

describe("ElfNameGenerator for drow: one spelling per sex, and the whole name judged once", () => {
    it("takes only an entry's first spelling for each sex, in a roll and in the picker", () => {
        const gen = drowGenerator(
            fixture({ prefixes: [{ female: ["bri", "bry"], male: ["bro", "bru"], meaning: "Graceful" }] })
        );
        const result = gen.generate({ style: "feminine", random: fixedRandom(0.1, 0.9, 0) });
        expect(result.parts[0].text).toBe("bri");
        expect(gen.optionsFor(result, "f0").map((o) => o.text)).toEqual(["bri", "bro"]);
    });

    it("draws the keep chance once for a name whose two words are both long", () => {
        const long = fixture({
            prefixes: [{ female: "bala", male: "bala", meaning: "Graceful" }],
            suffixes: [{ female: "zala", male: "zala", meaning: "Lover" }]
        });
        // compound shape, four entries, then a keep draw under the 15% male chance; every later draw would refuse it
        const result = drowGenerator(long).generate({
            style: "masculine",
            random: fixedRandom(0.9, 0, 0, 0, 0, 0.1, 0.99)
        });
        expect(result.name.startsWith("Balazala Balazala ")).toBe(true);
    });
});
