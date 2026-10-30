import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { ElfNameGenerator } from "../../js/core/ElfNameGenerator.js";
import { seededRandom } from "../helpers/random.js";

// Design decisions (2026-10-21): personal names come from the Races of the Wild / Dragon #251
// tables (Table 1-1 shapes, apostrophe shape lowered to 5%); suffix forms follow the requested gender, neutral uses
// suffixes shared by both; awkward joins take one of Dragon #251's letters; Expanded Variety mixes split components
// (cut from published names, endings following gender) into table names; published translations are carried, never invented; generated names
// matching a published one are labeled; locked components are kept and everything else is re-rolled.
const data = JSON.parse(readFileSync(join(process.cwd(), "data/elfNames.json"), "utf-8"));
const sample = (gen, count, options) => {
    const random = seededRandom(20261020);
    return Array.from({ length: count }, () => gen.generate({ random, ...options }));
};
const part = (result, key) => result.parts.find((p) => p.key === key);
const tableParts = (result, role) => result.parts.filter((p) => p.role === role && /^t\d/.test(p.key));
// a one-row table: "al" (Sea) + "ra" (Woman), joined directly only when "lr" occurs inside a published name
const fixture = ({ prefixes: rows = [{ text: "al", meaning: "Sea" }], joinClusters = ["lr"] } = {}) => ({
    tables: {
        title: "Test tables",
        origin: "Test",
        prefixes: rows,
        suffixes: [{ male: ["ra"], female: ["ra"], meaning: "Woman" }]
    },
    joinClusters,
    familyNames: [{ text: "Starym", form: "elvish", subraces: ["sun-elf"], source: { title: "Cormanthyr" } }]
});
const firstWord = (r) => r.name.split(" ")[0];
const twoPart = (results) => results.filter((r) => r.shape.join() === "prefix,suffix");
const { prefixes, suffixes } = data.tables;
const isShared = (s) => s.male.join() === s.female.join();

describe("ElfNameGenerator with the published tables", () => {
    it.each([
        ["feminine", "female"],
        ["masculine", "male"]
    ])("gives %s names the %s suffix forms", (style, sex) => {
        const forms = new Set(suffixes.flatMap((s) => s[sex]));
        const used = sample(new ElfNameGenerator(data), 300, { style }).flatMap((r) => tableParts(r, "suffix"));
        used.forEach((p) => expect(forms.has(p.text)).toBe(true));
        expect(used.length).toBeGreaterThan(300);
    });

    it("gives neutral names only suffixes the tables give both genders, with each part's own meaning", () => {
        // a spelling can appear in two rows (-ro is an alternate of -aro "Summer" and its own row "Walker")
        const shared = new Set(suffixes.filter(isShared).flatMap((s) => s.male.map((form) => `${form}=${s.meaning}`)));
        const meaningOf = new Map(prefixes.map((p) => [p.text, p.meaning]));
        sample(new ElfNameGenerator(data), 300, { style: "neutral" }).forEach((r) => {
            tableParts(r, "suffix").forEach((p) => expect(shared.has(`${p.text}=${p.meaning}`)).toBe(true));
            tableParts(r, "prefix").forEach((p) => expect(meaningOf.get(p.text)).toBe(p.meaning));
        });
    });

    it("keeps the published shapes, with the apostrophe shape rare", () => {
        const shapes = sample(new ElfNameGenerator(data), 3000).map((r) => r.shape.join(""));
        const share = (shape) => shapes.filter((s) => s === shape).length / shapes.length;
        expect(share("prefixsuffix")).toBeGreaterThan(share("prefixsuffixsuffix"));
        expect(share("suffix'prefixsuffixsuffix")).toBeGreaterThan(0.02);
        expect(share("suffix'prefixsuffixsuffix")).toBeLessThan(0.08);
    });

    it("never makes a doubled y, which no published elf name has", () => {
        expect(data.publishedNames.some((p) => /yy/i.test(p.text))).toBe(false);
        const names = sample(new ElfNameGenerator(data), 3000, { expanded: true }).map((r) => r.name);
        names.forEach((name) => expect(name).not.toMatch(/yy/i));
    });

    it("joins awkward parts only with the letters Dragon #251 gives", () => {
        const letters = sample(new ElfNameGenerator(data), 2000)
            .flatMap((r) => r.parts)
            .filter((p) => p.role === "joining letter")
            .map((p) => p.text);
        expect(letters.length).toBeGreaterThan(0);
        letters.forEach((l) => expect(["a", "e", "i", "l", "r", "s", "sh"]).toContain(l));
    });

    it("mixes split components into table names only with Expanded Variety, endings following gender", () => {
        const isSplit = (p) => p.method === "split";
        const firstName = (r) => r.parts.filter((p) => /^t\d/.test(p.key));
        expect(sample(new ElfNameGenerator(data), 300).some((r) => r.parts.some(isSplit))).toBe(false);
        const results = sample(new ElfNameGenerator(data), 300, { style: "feminine", expanded: true });
        // some first names mix both kinds in one word; split components carry no meaning but name their sources
        expect(results.some((r) => firstName(r).some(isSplit) && firstName(r).some((p) => !isSplit(p)))).toBe(true);
        const femaleEndings = new Set(data.endings.filter((e) => e.sex === "female").map((e) => e.text));
        const openings = new Set(data.openings.map((o) => o.text));
        results
            .flatMap(firstName)
            .filter(isSplit)
            .forEach((p) => {
                expect(p.meaning).toBeUndefined();
                expect(p.from.length).toBeGreaterThan(0);
                expect((p.role === "suffix" ? femaleEndings : openings).has(p.text)).toBe(true);
            });
    });

    it("never offers a split component that has the same letters as a table entry, which already has a meaning", () => {
        const tablePrefixes = new Set(prefixes.map((p) => p.text.toLowerCase()));
        const tableSuffixes = new Set(suffixes.flatMap((s) => [...s.male, ...s.female]).map((t) => t.toLowerCase()));
        const gen = new ElfNameGenerator(data);
        const results = sample(gen, 1500, { expanded: true });
        const splits = results.flatMap((r) => r.parts.filter((p) => p.method === "split" && /^t\d/.test(p.key)));
        expect(splits.length).toBeGreaterThan(0);
        splits.forEach((p) => expect((p.role === "prefix" ? tablePrefixes : tableSuffixes).has(p.text)).toBe(false));
        // the part picker lists each spelling of a table entry once, so "nis" is not offered both as Dawn and unknown
        const withSplit = results.find((r) => r.parts.some((p) => p.method === "split" && p.key === "t0"));
        const options = gen.optionsFor(withSplit, "t0");
        const asPrefix = (o) => o.role === "prefix";
        options
            .filter(asPrefix)
            .filter((o) => o.method === "split")
            .forEach((o) => expect(tablePrefixes.has(o.text.toLowerCase())).toBe(false));
    });

    it("names the books a split component's source names come from (Expanded Variety)", () => {
        const bookOf = new Map([...data.publishedNames, ...data.familyNames].map((p) => [p.text, p.source.title]));
        const splits = sample(new ElfNameGenerator(data), 300, { expanded: true }).flatMap((r) =>
            r.parts.filter((p) => p.method === "split")
        );
        expect(splits.length).toBeGreaterThan(0);
        splits.forEach((p) =>
            expect(p.books).toEqual([...new Set(p.from.map((name) => bookOf.get(name)).filter(Boolean))])
        );
        expect(splits.some((p) => p.books.length > 0)).toBe(true);
    });

    it("carries a family name's published translation, and invents none", () => {
        const translated = new Map(data.familyNames.filter((f) => f.translation).map((f) => [f.text, f.translation]));
        const families = sample(new ElfNameGenerator(data), 2000)
            .map((r) => part(r, "family"))
            .filter(Boolean);
        families
            .filter((f) => f.method === "published")
            .forEach((f) => expect(f.meaning).toBe(translated.get(f.text)?.text));
        expect(families.some((f) => f.meaningSource)).toBe(true);
        families.filter((f) => f.words).forEach((f) => expect(f.meaning).toBeUndefined());
    });

    it("labels every personal name that matches a published one, and only those", () => {
        const published = new Set(data.publishedNames.map((p) => p.text.toLowerCase()));
        const results = sample(new ElfNameGenerator(data), 3000, { expanded: true });
        results.forEach((r) => {
            const personal = r.name.slice(0, r.name.lastIndexOf(" ")).toLowerCase();
            expect(Boolean(r.published)).toBe(published.has(personal));
        });
        expect(results.some((r) => r.published)).toBe(true);
    });

    it("prefers words tied to the subrace for Common-form family names without excluding the others", () => {
        const tied = new Set(
            data.approvedWords.first.filter((w) => w.subraces.includes("wood-elf")).map((w) => w.text)
        );
        const firstWords = sample(new ElfNameGenerator(data), 2000, { subrace: "wood-elf" })
            .map((r) => part(r, "family"))
            .filter((f) => f?.words)
            .map((f) => f.words[0]);
        const tiedShare = firstWords.filter((w) => tied.has(w)).length / firstWords.length;
        expect(tiedShare).toBeGreaterThan(tied.size / data.approvedWords.first.length);
        expect(firstWords.some((w) => !tied.has(w))).toBe(true);
    });

    it("keeps locked table parts in their places and re-rolls the rest", () => {
        const gen = new ElfNameGenerator(data);
        const first = sample(gen, 50).find((r) => part(r, "family"));
        const locks = { shape: first.shape, t0: part(first, "t0"), family: part(first, "family") };
        const next = sample(gen, 20, { locks });
        next.forEach((r) => {
            expect(part(r, "t0").text).toBe(locks.t0.text);
            expect(part(r, "family").text).toBe(locks.family.text);
        });
        expect(new Set(next.map((r) => part(r, "t1").text)).size).toBeGreaterThan(1);
    });

    it("builds table surnames from components that can be locked one at a time", () => {
        const gen = new ElfNameGenerator(data);
        const first = sample(gen, 50).find((r) => part(r, "n0"));
        expect(part(first, "n0").role).toBe("family prefix");
        const locks = { familyShape: first.familyShape, n0: part(first, "n0") };
        const next = sample(gen, 20, { locks });
        next.forEach((r) => expect(part(r, "n0").text).toBe(locks.n0.text));
        expect(new Set(next.map((r) => part(r, "n1").text)).size).toBeGreaterThan(1);
    });

    it("offers in the picker only options that fit the rest of the name, and every one can be chosen", () => {
        const gen = new ElfNameGenerator(data);
        sample(gen, 30, { style: "neutral" }).forEach((result) => {
            const key = result.parts.find((p) => p.role === "suffix").key;
            const options = gen.optionsFor(result, key);
            const shared = new Set(suffixes.filter(isShared).flatMap((s) => s.male));
            expect(options.map((o) => o.text)).toContain(part(result, key).text);
            const locks = { ...Object.fromEntries(result.parts.map((p) => [p.key, p])), shape: result.shape };
            options.forEach((option) => {
                expect(shared.has(option.text)).toBe(true);
                const chosen = gen.generate({
                    style: "neutral",
                    locks: { ...locks, [key]: option },
                    random: seededRandom(1)
                });
                expect(part(chosen, key).text).toBe(option.text);
            });
        });
    });
});

describe("ElfNameGenerator rules", () => {
    it("joins components directly when their consonants meet in a published name", () => {
        const names = twoPart(sample(new ElfNameGenerator(fixture()), 60));
        expect(names.length).toBeGreaterThan(0);
        names.forEach((r) => {
            expect(firstWord(r)).toBe("Alra");
            expect(r.parts.some((p) => p.role === "joining letter" && p.key.startsWith("t"))).toBe(false);
        });
    });

    it("adds one of Dragon #251's letters where the consonants would not meet cleanly", () => {
        const names = twoPart(sample(new ElfNameGenerator(fixture({ joinClusters: [] })), 60));
        expect(names.length).toBeGreaterThan(0);
        names.forEach((r) => expect(firstWord(r)).toMatch(/^Al[aei]ra$/));
    });

    it("keeps its joining letters when every component is locked (as when one is chosen in the picker)", () => {
        const gen = new ElfNameGenerator(fixture({ joinClusters: [] }));
        const first = gen.generate({ random: seededRandom(5) });
        const locks = {
            ...Object.fromEntries(first.parts.map((p) => [p.key, p])),
            shape: first.shape,
            ...(first.familyShape ? { familyShape: first.familyShape } : {})
        };
        sample(gen, 20, { locks }).forEach((r) => expect(r.name).toBe(first.name));
    });

    it("explains when components cannot be joined at all, or the tables are missing", () => {
        const unjoinable = new ElfNameGenerator(
            fixture({ prefixes: [{ text: "alt", meaning: "" }], joinClusters: [] })
        );
        expect(() => unjoinable.generate({ random: seededRandom(1) })).toThrow(/unlocking/);
        expect(() => new ElfNameGenerator({ familyNames: [] })).toThrow(/tables/);
    });

    it("avoids repeating a name within five generations when alternatives exist", () => {
        const rows = ["al", "el", "il", "ol", "ul", "ael", "eil"].map((text) => ({ text, meaning: "" }));
        const names = sample(new ElfNameGenerator(fixture({ prefixes: rows })), 100).map((r) => r.name);
        names.forEach((name, i) => expect(names.slice(Math.max(0, i - 5), i)).not.toContain(name));
    });

    it("hands drow requests to the drow generator and rejects unknown subraces", () => {
        const drow = { generate: () => ({ name: "Viconia DeVir" }), getStructureControls: () => ["drow controls"] };
        const gen = new ElfNameGenerator(fixture(), drow);
        expect(gen.generate({ subrace: "drow" }).name).toBe("Viconia DeVir");
        expect(gen.getStructureControls({ subrace: "drow" })).toEqual(["drow controls"]);
        expect(() => gen.generate({ subrace: "half-elf" })).toThrow(/Unknown elf subrace/);
    });
});

describe("ElfNameGenerator structure controls", () => {
    const gen = new ElfNameGenerator(data);
    const SHORT = "prefix,suffix";
    const LONG = "prefix,suffix,suffix";
    const shaped = (first, family) => (r) =>
        r.shape?.join() === first && (family === undefined || r.familyShape?.join() === family);
    const pick = (test) => sample(gen, 600).find(test);
    const random = () => seededRandom(7);
    const textsOf = (r, prefix) => r.parts.filter((p) => new RegExp(`^${prefix}\\d`).test(p.key)).map((p) => p.text);
    const controls = (r, locked = new Set()) => gen.getStructureControls(r, locked, { random: random() });

    it("makes a short first name long by adding a suffix and keeping the rest", () => {
        const before = pick(shaped(SHORT));
        const result = gen.generateStructureChange(before, "given", { random: random() });
        expect(result.shape.join()).toBe(LONG);
        expect(textsOf(result, "t").slice(0, 2)).toEqual(textsOf(before, "t"));
        expect(result.name.endsWith(before.name.split(" ").at(-1))).toBe(true);
    });

    it("keeps a locked last suffix in its slot and adds the new suffix after it", () => {
        const before = pick(shaped(SHORT));
        const result = gen.generateStructureChange(before, "given", { locked: new Set(["t1"]), random: random() });
        expect(part(result, "t0").text).toBe(part(before, "t0").text);
        expect(part(result, "t1").text).toBe(part(before, "t1").text);
        expect(part(result, "t2")).toBeDefined();
    });

    it("shortens a long first name from the end unless that last suffix is locked", () => {
        const before = pick(shaped(LONG));
        const shorter = gen.generateStructureChange(before, "given", { locked: new Set(["t1"]), random: random() });
        expect(shorter.shape.join()).toBe(SHORT);
        expect(textsOf(shorter, "t")).toEqual(textsOf(before, "t").slice(0, 2));
        expect(gen.generateStructureChange(before, "given", { locked: new Set(["t2"]) })).toBeNull();
    });

    it("adds and removes a compound name, keeping the first name and surname", () => {
        const before = pick(shaped(SHORT));
        const added = gen.generateStructureChange(before, "compound", { random: random() });
        expect(added.shape.join()).toBe("prefix,suffix, ,prefix,suffix,suffix");
        expect(added.name.split(" ")).toHaveLength(3);
        expect(added.name.startsWith(before.name.split(" ")[0])).toBe(true);
        expect(added.name.endsWith(before.name.split(" ").at(-1))).toBe(true);
        const removed = gen.generateStructureChange(added, "compound", { random: random() });
        expect(removed.name).toBe(before.name);
    });

    it("offers the compound name on a long first name only when its extra suffix is not locked", () => {
        const long = pick(shaped(LONG));
        const compound = gen.generateStructureChange(long, "compound", { random: random() });
        expect(textsOf(compound, "t").slice(0, 2)).toEqual(textsOf(long, "t").slice(0, 2));
        expect(gen.generateStructureChange(long, "compound", { locked: new Set(["t2"]) })).toBeNull();
        // a locked slot of the compound name keeps it from being removed
        expect(gen.generateStructureChange(compound, "compound", { locked: new Set(["t4"]) })).toBeNull();
    });

    it("lengthens and shortens a table-built surname without touching the first name", () => {
        const before = pick(shaped(SHORT, SHORT));
        const longer = gen.generateStructureChange(before, "surname", { random: random() });
        expect(longer.familyShape.join()).toBe(LONG);
        expect(longer.name.split(" ")[0]).toBe(before.name.split(" ")[0]);
        expect(textsOf(longer, "n").slice(0, 2)).toEqual(textsOf(before, "n"));
        const shorter = gen.generateStructureChange(longer, "surname", { random: random() });
        expect(shorter.name).toBe(before.name);
    });

    it("lists only the controls that apply: no surname for a published one, none for apostrophe names", () => {
        const published = pick((r) => r.shape.join() === SHORT && !r.familyShape);
        expect(controls(published).map((c) => c.control)).not.toContain("surname");
        const apostrophe = pick((r) => r.shape.includes("'"));
        expect(controls(apostrophe)).toEqual([]);
    });

    it("lists the controls in the order they read: first name, compound name, surname", () => {
        const all = pick((r) => r.shape.join() === SHORT && r.familyShape?.join() === SHORT);
        expect(controls(all).map((c) => c.control)).toEqual(["given", "compound", "surname"]);
    });

    it("ignores a structure control it does not have", () => {
        expect(gen.generateStructureChange(pick(shaped(SHORT)), "height", { random: random() })).toBeNull();
    });

    it("keeps every change it offers within the length rules (11 letters a word, apart from published surnames)", () => {
        sample(gen, 150).forEach((r) => {
            controls(r).forEach(({ control }) => {
                const changed = gen.generateStructureChange(r, control, { random: random() });
                changed.name
                    .split(" ")
                    .slice(0, changed.familyShape ? undefined : -1) // a published surname has no length rule
                    .forEach((name) => {
                        const word = name.split("'").at(-1); // the length rules apply after an apostrophe
                        expect(word.length).toBeGreaterThanOrEqual(4);
                        expect(word.length).toBeLessThanOrEqual(11);
                    });
                const letters = (text) => text.replace(/[ ']/g, "").toLowerCase();
                expect(letters(changed.name)).toBe(letters(changed.parts.map((p) => p.text).join("")));
            });
        });
    });
});

describe("ElfNameGenerator rolls under locks", () => {
    const gen = new ElfNameGenerator(data);
    const lockOf = (result, ...keys) => ({
        ...Object.fromEntries(keys.map((key) => [key, result.parts.find((p) => p.key === key)])),
        shape: result.shape,
        familyShape: result.familyShape
    });
    const rolls = (locks, count = 300) => {
        const random = seededRandom(11);
        return Array.from({ length: count }, () => gen.generate({ locks, reshape: true, random }));
    };
    const start = () => sample(gen, 100).find((r) => r.shape.join() === "prefix,suffix,suffix");

    it("keeps a locked prefix and still changes the shape, but never to the apostrophe shape", () => {
        const before = start();
        const results = rolls(lockOf(before, "t0"));
        results.forEach((r) => expect(part(r, "t0").text).toBe(part(before, "t0").text));
        const shapes = new Set(results.map((r) => r.shape.join()));
        expect(shapes).toEqual(
            new Set(["prefix,suffix", "prefix,suffix,suffix", "prefix,suffix, ,prefix,suffix,suffix"])
        );
    });

    it("keeps a locked third slot only in shapes that have a suffix there", () => {
        const before = start();
        rolls(lockOf(before, "t2")).forEach((r) => {
            expect(r.shape.join()).toBe("prefix,suffix,suffix");
            expect(part(r, "t2").text).toBe(part(before, "t2").text);
        });
    });

    it("still favours the commoner shapes among those that remain", () => {
        // not exactly 40/30/20: the length rules reject some shapes more often than others
        const results = rolls(lockOf(start(), "t0"), 3000);
        const share = (shape) => results.filter((r) => r.shape.join() === shape).length / results.length;
        const [short, long, compound] = [
            "prefix,suffix",
            "prefix,suffix,suffix",
            "prefix,suffix, ,prefix,suffix,suffix"
        ].map(share);
        expect(short).toBeGreaterThan(long);
        expect(long).toBeGreaterThan(compound);
        expect(compound).toBeGreaterThan(0.1);
    });

    it("keeps the shape for choices that do not ask for a roll", () => {
        const before = start();
        const random = seededRandom(5);
        for (let i = 0; i < 50; i++) {
            expect(gen.generate({ locks: lockOf(before, "t0"), random }).shape.join()).toBe("prefix,suffix,suffix");
        }
    });
});

describe("ElfNameGenerator surname switch", () => {
    const gen = new ElfNameGenerator(data);
    const constructed = () => sample(gen, 300).find((r) => r.familyShape);
    const published = () => sample(gen, 300).find((r) => !r.familyShape && r.parts.at(-1).key === "family");
    const firstName = (r) => r.name.slice(0, r.name.lastIndexOf(" "));

    it("switches a constructed surname to a chosen published one, keeping the first name", () => {
        const before = constructed();
        const { kind, options } = gen.getSurnameSwitchOptions(before);
        expect(kind).toBe("published");
        expect(options.length).toBeGreaterThan(20);
        const choice = options[3];
        const after = gen.generateSurnameChange(before, choice);
        expect(firstName(after)).toBe(firstName(before));
        expect(after.name.endsWith(choice.text.charAt(0).toUpperCase() + choice.text.slice(1))).toBe(true);
        expect(after.familyShape).toBeUndefined();
        expect(part(after, "family").text).toBe(choice.text);
    });

    it("builds a constructed surname from a chosen prefix, keeping the first name, so its parts can be picked and locked", () => {
        const before = published();
        const { kind, options } = gen.getSurnameSwitchOptions(before);
        expect(kind).toBe("constructed");
        expect(options.length).toBeGreaterThan(20);
        const choice = options[5];
        const after = gen.generateSurnameChange(before, choice);
        expect(firstName(after)).toBe(firstName(before));
        expect(part(after, "n0").text).toBe(choice.text);
        expect(after.familyShape).toBeDefined();
        expect(after.parts.some((p) => p.key === "family")).toBe(false);
    });

    it("offers no switch when it would drop a locked part", () => {
        expect(gen.getSurnameSwitchOptions(constructed(), new Set(["n1"])).options).toEqual([]);
        expect(gen.getSurnameSwitchOptions(published(), new Set(["family"])).options).toEqual([]);
    });

    it("lists only prefixes that can build a surname", () => {
        const before = published();
        gen.getSurnameSwitchOptions(before).options.forEach((o) =>
            expect(gen.generateSurnameChange(before, o)).not.toBeNull()
        );
    });
});

describe("ElfNameGenerator long names", () => {
    // Sampling: 4,000 unlocked rolls (seed 1), keeping those that came out in the three-component shape, against 30
    // rolls (seeds 100+) for each of 60 different locked first components in that same shape. Comparing within one
    // shape keeps shape weights out of it; the locked components are drawn uniformly, as an unlocked roll draws them.
    const SHAPE = "prefix,suffix,suffix";
    const gen = new ElfNameGenerator(data);
    const roll = (count, seed, locks = {}) => {
        const random = seededRandom(seed);
        return Array.from({ length: count }, () => gen.generate({ style: "neutral", locks, random }));
    };
    const longShare = (results) =>
        results.filter((r) => (firstWord(r).match(/[aeiouy]+/gi) || []).length >= 4).length / results.length;

    it("keeps four-syllable names as uncommon with a locked component as without", () => {
        const unlocked = roll(4000, 1).filter((r) => r.shape.join() === SHAPE);
        const kept = new Map(unlocked.map((r) => [part(r, "t0").text, part(r, "t0")]));
        const locked = [...kept.values()]
            .slice(0, 60)
            .flatMap((t0, i) => roll(30, 100 + i, { shape: unlocked[0].shape, t0 }));
        expect(locked.length).toBe(1800);
        // about 10% of published names have four syllables (Inferred); without the keep-30% preference the three-component
        // shape would give roughly 40% (measured on this sample), so the upper bound shows the preference is applied
        expect(longShare(unlocked)).toBeGreaterThan(0.05);
        expect(longShare(unlocked)).toBeLessThan(0.3);
        expect(longShare(locked) / longShare(unlocked)).toBeGreaterThan(0.7);
        expect(longShare(locked) / longShare(unlocked)).toBeLessThan(1.3);
    });
});

// BMN-80: rules that earlier tests left unguarded, found by mutation testing (Stryker).
describe("ElfNameGenerator rule guards", () => {
    const gen = new ElfNameGenerator(data);
    const SHORT = "prefix,suffix";
    const LONG = "prefix,suffix,suffix";
    // a one-entry table with the given suffix rows, for rules that need every possible name known
    const tiny = ({ suffixes: rows, prefixes: prefixRows, joinClusters = ["lr"], ...extra } = {}) => {
        const base = fixture({ prefixes: prefixRows, joinClusters });
        return { ...base, tables: { ...base.tables, ...(rows && { suffixes: rows }) }, ...extra };
    };
    const syllables = (text) => (text.match(/[aeiouy]+/gi) || []).length;
    const tableSurnamed = (results) => results.filter((r) => r.familyShape?.join() === SHORT);

    describe("part picker", () => {
        it("offers every published family name for the surname, and none when the data has none", () => {
            const options = gen.optionsFor(sample(gen, 1)[0], "family");
            expect(options.map((o) => o.text)).toEqual(data.familyNames.map((f) => f.text));
            options.forEach((o) => expect([o.key, o.role]).toEqual(["family", "family name"]));
            const bare = new ElfNameGenerator({ tables: fixture().tables });
            expect(bare.optionsFor({ subrace: "high-elf", parts: [] }, "family")).toEqual([]);
        });

        it("offers nothing for a part that is not a name component or is not in the name", () => {
            const small = new ElfNameGenerator(fixture());
            const result = twoPart(sample(small, 30))[0];
            const odd = { ...result, parts: [...result.parts, { key: "at1", role: "suffix", text: "ra" }] };
            expect(small.optionsFor(odd, "at1")).toEqual([]);
            expect(small.optionsFor(result, "t9")).toEqual([]);
        });

        it("offers prefixes for a prefix slot and the gender's suffix forms for a suffix slot, surnames included", () => {
            const prefixTexts = new Set(prefixes.map((p) => p.text));
            const femaleForms = new Set(suffixes.flatMap((s) => s.female));
            const sharedForms = new Set(suffixes.filter(isShared).flatMap((s) => s.male));
            const female = tableSurnamed(sample(gen, 200, { style: "feminine" })).slice(0, 25);
            expect(female.length).toBeGreaterThan(5);
            const textsFor = (r, key) => gen.optionsFor(r, key).map((o) => o.text);
            female.forEach((r) => {
                const [prefix, suffix] = ["prefix", "suffix"].map((role) => tableParts(r, role)[0]);
                expect(textsFor(r, prefix.key).every((t) => prefixTexts.has(t))).toBe(true);
                expect(textsFor(r, suffix.key).every((t) => femaleForms.has(t))).toBe(true);
                expect(textsFor(r, "n0").every((t) => prefixTexts.has(t))).toBe(true);
                // the whole family bears the surname, so it takes only the forms both genders share
                expect(textsFor(r, "n1").every((t) => sharedForms.has(t))).toBe(true);
                expect(textsFor(r, "n1").length).toBeGreaterThan(0);
            });
        });

        it("lists each published spelling of a suffix in the gender's own forms, with that gender's meaning", () => {
            const spelled = new ElfNameGenerator(
                // three male spellings against two female ones, so listing the wrong gender's forms shows
                tiny({
                    suffixes: [{ male: ["ran", "rin", "ron"], female: ["ria", "rya"], meaning: "Lord/Lady, Helper" }]
                })
            );
            const textsFor = (style) => {
                // the surname is locked: a table surname would need a suffix both genders share
                const locks = { family: { key: "family", role: "family name", text: "Starym" } };
                const result = twoPart(sample(spelled, 40, { style, locks }))[0];
                const options = spelled.optionsFor(result, "t1");
                return { meaning: part(result, "t1").meaning, texts: options.map((o) => o.text).sort(), options };
            };
            const female = textsFor("feminine");
            expect(female.texts).toEqual(["ria", "rya"]);
            expect(female.meaning).toBe("Lady, Helper");
            female.options.forEach((o) => expect(o.meaning).toBe("Lady, Helper"));
            const male = textsFor("masculine");
            expect(male.texts).toEqual(["ran", "rin", "ron"]);
            expect(male.meaning).toBe("Lord, Helper");
        });

        it("also offers the other split components of a split component's kind (Expanded Variety)", () => {
            const results = sample(gen, 300, { expanded: true });
            const inTable = {
                prefix: new Set(prefixes.map((p) => p.text.toLowerCase())),
                suffix: new Set(suffixes.flatMap((s) => [...s.male, ...s.female]).map((t) => t.toLowerCase()))
            };
            ["prefix", "suffix"].forEach((role) => {
                const found = results.find((r) => tableParts(r, role).some((p) => p.method === "split"));
                const own = tableParts(found, role).find((p) => p.method === "split");
                const others = gen
                    .optionsFor(found, own.key)
                    .filter((o) => o.method === "split" && o.text !== own.text);
                expect(others.length).toBeGreaterThan(0);
                // as when generating, a split component with a table entry's letters is left out
                others.forEach((o) => expect(inTable[role].has(o.text.toLowerCase())).toBe(false));
            });
        });
    });

    describe("changes that keep the rest of the name", () => {
        it("add only table components unless Expanded Variety is on", () => {
            sample(gen, 40).forEach((r, i) => {
                gen.getStructureControls(r, new Set(), { random: seededRandom(i) }).forEach(({ control }) => {
                    const changed = gen.generateStructureChange(r, control, { random: seededRandom(i + 100) });
                    changed.parts.forEach((p) => expect(p.method).not.toBe("split"));
                });
            });
            const published = sample(gen, 300).filter((r) => !r.familyShape && r.parts.at(-1).key === "family");
            published.slice(0, 20).forEach((r, i) => {
                const { options } = gen.getSurnameSwitchOptions(r);
                const changed = gen.generateSurnameChange(r, options[i], { random: seededRandom(i) });
                changed.parts.forEach((p) => expect(p.method).not.toBe("split"));
            });
        });

        it("lengthen a table surname to exactly the long shape, whatever the draws", () => {
            const shorts = tableSurnamed(sample(gen, 400)).slice(0, 30);
            expect(shorts.length).toBe(30);
            shorts.forEach((r, i) => {
                const longer = gen.generateStructureChange(r, "surname", { random: seededRandom(i + 1) });
                expect(longer.familyShape.join()).toBe(LONG);
                expect(longer.parts.filter((p) => /^n\d/.test(p.key))).toHaveLength(3);
            });
        });

        it("do not thin out four-syllable surnames: the preference is for rolls, not for a change the visitor asked for", () => {
            const changed = tableSurnamed(sample(gen, 400))
                .map((r) => gen.generateStructureChange(r, "surname", { random: () => 0.99 }))
                .filter(Boolean);
            expect(changed.some((c) => syllables(c.name.split(" ").at(-1)) === 4)).toBe(true);
        });

        it("do not thin out four-syllable first names either", () => {
            const changed = sample(gen, 400)
                .filter((r) => r.shape.join() === SHORT)
                .map((r) => gen.generateStructureChange(r, "given", { random: () => 0.99 }))
                .filter(Boolean);
            expect(changed.some((c) => syllables(firstWord(c)) === 4)).toBe(true);
        });

        it("show the surname control on for a long table surname and off for a short one", () => {
            const state = (r) =>
                gen
                    .getStructureControls(r, new Set(), { random: seededRandom(3) })
                    .find((c) => c.control === "surname");
            const results = sample(gen, 400);
            const long = results.find((r) => r.familyShape?.join() === LONG);
            expect(state(long).on).toBe(true);
            expect(state(tableSurnamed(results)[0]).on).toBe(false);
        });

        it("offer the published surnames unless a surname component is locked", () => {
            const before = tableSurnamed(sample(gen, 300))[0];
            const open = gen.getSurnameSwitchOptions(before, new Set(["t0", "t1"]));
            expect(open.options.length).toBe(data.familyNames.length);
            expect(gen.getSurnameSwitchOptions(before, new Set(["n0"])).options).toEqual([]);
        });

        it("mix a split component into a slot when the draw falls well under the share, and not when well above it", () => {
            // a constant draw makes only some values build a name at all; 0.3 and 0.9 do, either side of the 50% share
            const split = (draw) =>
                gen.generate({ expanded: true, random: () => draw }).parts.filter((p) => p.method === "split").length;
            expect(split(0.3)).toBeGreaterThan(0);
            expect(split(0.9)).toBe(0);
        });

        it("cite the tables only when a slot was filled from them", () => {
            // at 0.3 every slot takes a split component and the family name is not table-built; at 0.9 none does
            const allSplit = gen.generate({ expanded: true, random: () => 0.3 });
            expect(allSplit.parts.filter((p) => /^[tn]\d/.test(p.key)).every((p) => p.method === "split")).toBe(true);
            expect(allSplit).not.toHaveProperty("tables");
            expect(gen.generate({ expanded: true, random: () => 0.9 }).tables).toMatch(/Dragon #251/);
        });
    });

    describe("names", () => {
        it("carry the source of a published personal name they match, and no label otherwise", () => {
            const book = { title: "Test book" };
            const known = new ElfNameGenerator(tiny({ publishedNames: [{ text: "Alra", source: book }] }));
            twoPart(sample(known, 20)).forEach((r) => expect(r.published).toEqual({ source: book }));
            twoPart(sample(new ElfNameGenerator(tiny()), 20)).forEach((r) => expect(r).not.toHaveProperty("published"));
        });

        it("need a configured drow generator for drow requests", () => {
            expect(() => new ElfNameGenerator(fixture()).generate({ subrace: "drow" })).toThrow(
                "No drow generator configured"
            );
        });

        // Inferred (see _acceptable): published names have 2-4 syllables (vowel groups).
        it.each([
            ["no vowel", "bld", "nr", "bldnr"],
            ["one vowel group", "bal", "dn", "ldn"],
            ["five vowel groups", "ilanu", "rimo", "ur"]
        ])("are refused when a word has %s", (_, prefix, suffix, cluster) => {
            const refused = new ElfNameGenerator(
                tiny({
                    prefixes: [{ text: prefix, meaning: "" }],
                    suffixes: [{ male: [suffix], female: [suffix], meaning: "" }],
                    joinClusters: [cluster]
                })
            );
            expect(() => refused.generate({ random: seededRandom(1) })).toThrow(/unlocking/);
        });
    });

    // BMN-85: the preference was hidden behind Stryker comments that excused more than their reasons covered.
    describe("four-syllable preference", () => {
        const suffix = (text) => ({ male: [text], female: [text], meaning: "" });
        // "balora" has three syllables, "alinora" four; a constant draw below 0.4 picks the two-part shape, and a
        // published family name (draw below 0.5) leaves the first name as the only word the preference can refuse
        const threeSyllables = new ElfNameGenerator(
            tiny({ prefixes: [{ text: "bal", meaning: "" }], suffixes: [suffix("ora")] })
        );
        const fourSyllables = new ElfNameGenerator(
            tiny({ prefixes: [{ text: "alin", meaning: "" }], suffixes: [suffix("ora")] })
        );

        it("refuses a four-syllable word when the draw is at or above the keep share, and keeps it below", () => {
            // the keep share is 0.3 (Chosen): a draw of exactly 0.3 is not "under" it
            expect(syllables(firstWord(fourSyllables.generate({ random: () => 0.29 })))).toBe(4);
            expect(() => fourSyllables.generate({ random: () => 0.3 })).toThrow(/unlocking/);
        });

        it("applies only to four syllables: shorter words are kept whatever the draw", () => {
            expect(syllables(firstWord(threeSyllables.generate({ random: () => 0.35 })))).toBe(3);
        });

        it("thins out four-syllable first names and table surnames on every roll", () => {
            // half the endings make a three-syllable word and half a four-syllable one; the shapes with more parts are
            // too long, so every word is one of the two. Kept at 0.3, four syllables are about 23% of the words, and
            // 0.5 without the preference. Many entries keep the generator's five-name memory from evening out the odds.
            const gen = new ElfNameGenerator(
                tiny({
                    prefixes: ["bal", "dor", "fen", "gal", "hin", "mar"].map((text) => ({ text, meaning: "" })),
                    suffixes: ["ora", "ura", "ela", "orina", "urina", "elina"].map(suffix),
                    familyNames: undefined
                })
            );
            const results = sample(gen, 800);
            const fourShare = (words) => words.filter((w) => syllables(w) === 4).length / words.length;
            expect(fourShare(results.map(firstWord))).toBeGreaterThan(0.1);
            expect(fourShare(results.map(firstWord))).toBeLessThan(0.35);
            expect(fourShare(results.map((r) => r.name.split(" ").at(-1)))).toBeGreaterThan(0.1);
            expect(fourShare(results.map((r) => r.name.split(" ").at(-1)))).toBeLessThan(0.35);
        });
    });
});

describe("ElfNameGenerator with no published family names or approved words", () => {
    const bare = { ...fixture(), familyNames: undefined };
    const approvedWords = {
        first: [{ text: "Star", subraces: ["sun-elf"] }],
        second: [{ text: "gaze", subraces: ["sun-elf"] }]
    };
    const sunElf = (gen, count, options = {}) => sample(gen, count, { subrace: "sun-elf", ...options });

    it("builds every family name from the tables, and offers no published surname to switch to", () => {
        const gen = new ElfNameGenerator(bare);
        const results = sunElf(gen, 100);
        results.forEach((r) => expect(r.familyShape).toBeDefined());
        expect(gen.getSurnameSwitchOptions(results[0])).toEqual({ kind: "published", options: [] });
        expect(gen.optionsFor(results[0], "family")).toEqual([]);
    });

    it("falls back to the tables when the Common form has no approved words to compose from", () => {
        // a share of 1 would make every attempt fail, so use one a retry can get past
        const gen = new ElfNameGenerator({ ...bare, commonFormShare: { "sun-elf": 0.5 } });
        sunElf(gen, 100).forEach((r) => expect(r.familyShape).toBeDefined());
    });

    it("falls back to the tables when the approved words have only first or only second words", () => {
        [{ first: approvedWords.first }, { second: approvedWords.second }].forEach((oneList) => {
            const gen = new ElfNameGenerator({ ...bare, approvedWords: oneList, commonFormShare: { "sun-elf": 0.5 } });
            sunElf(gen, 100).forEach((r) => expect(r.familyShape).toBeDefined());
        });
    });

    it("composes a Common-form family name from approved words alone", () => {
        const gen = new ElfNameGenerator({ ...bare, approvedWords, commonFormShare: { "sun-elf": 1 } });
        sunElf(gen, 20).forEach((r) => {
            expect(r.name.endsWith(" Stargaze")).toBe(true);
            expect(part(r, "family").method).toBe("composed");
        });
    });

    it("never composes a Common-form family name from the same word twice, whatever the capitals", () => {
        const words = (...texts) => texts.map((text) => ({ text, subraces: ["sun-elf"] }));
        const compose = (first, second) =>
            new ElfNameGenerator({ ...bare, approvedWords: { first, second }, commonFormShare: { "sun-elf": 1 } });
        const families = sunElf(compose(words("Star", "Moon"), words("star", "moon")), 60).map(
            (r) => part(r, "family").text
        );
        expect([...new Set(families)].sort()).toEqual(["Moonstar", "Starmoon"]);
        // with nothing else to pair, no family name can be composed
        expect(() => sunElf(compose(words("Star"), words("STAR")), 1)).toThrow(/unlocking/);
    });
});

// BMN-84: rules that earlier mutation runs counted as caught only because their slow tests ran out of time.
describe("ElfNameGenerator rules checked with fixed draws", () => {
    // With the one-row fixture and a constant draw: under 0.4 the first name is "Alra" (two-part shape, weights 40 of
    // 95), from 0.43 to 0.73 "Alrara"; the family-name draws follow, and a table surname is "Alra" up to 0.57.
    const book = { title: "Cormanthyr" };
    const elvish = (text, extra = {}) => ({ text, form: "elvish", source: book, ...extra });
    const approvedWords = { first: [{ text: "Star" }], second: [{ text: "gaze" }] };
    const make = (extra = {}) => new ElfNameGenerator({ ...fixture(), ...extra });
    const familyOf = (r) => r.name.split(" ").at(-1);

    describe("family names", () => {
        it("takes the Common form on a draw under its share, and not at it", () => {
            const common = { approvedWords, commonFormShare: { "high-elf": 0.5 } };
            expect(familyOf(make(common).generate({ random: () => 0.49 }))).toBe("Stargaze");
            expect(make(common).generate({ random: () => 0.5 }).familyShape).toBeDefined();
        });

        it("takes a published house on a draw under its share, and builds one at it", () => {
            expect(familyOf(make().generate({ random: () => 0.49 }))).toBe("Starym");
            expect(make().generate({ random: () => 0.5 }).familyShape).toBeDefined();
        });

        it("draws published houses only from the Elvish-form family names", () => {
            // unfiltered, the draw would land on the Common-form name listed first
            const gen = make({ familyNames: [{ ...elvish("Morninglight"), form: "common" }, elvish("Starym")] });
            expect(familyOf(gen.generate({ random: () => 0.4 }))).toBe("Starym");
        });

        it("accepts published family names and approved words with no subraces listed", () => {
            expect(familyOf(make({ familyNames: [elvish("Starym")] }).generate({ random: () => 0.4 }))).toBe("Starym");
            const common = make({ approvedWords, commonFormShare: { "high-elf": 0.5 } });
            expect(familyOf(common.generate({ random: () => 0.4 }))).toBe("Stargaze");
        });

        it("labels a composed family name that matches a published one as that published name", () => {
            const gen = make({
                approvedWords,
                commonFormShare: { "high-elf": 1 },
                familyNames: [{ ...elvish("Stargaze"), form: "common" }]
            });
            const family = part(gen.generate({ random: () => 0.4 }), "family");
            expect([family.text, family.method, family.source]).toEqual(["Stargaze", "published", book]);
        });

        it("never builds a table surname that is a published family name", () => {
            // the fixture has no family clusters, so a table surname joins "al" and "ra" with a, e or i
            const results = sample(make({ familyNames: [elvish("Alara")] }), 100);
            const built = results.filter((r) => r.familyShape).map(familyOf);
            expect(built).toContain("Alera");
            expect(built).not.toContain("Alara");
        });

        it("carries a published family name's note", () => {
            const gen = make({ familyNames: [elvish("Starym", { note: "Test note" })] });
            expect(gen.optionsFor({ subrace: "high-elf", parts: [] }, "family")[0].note).toBe("Test note");
        });
    });

    describe("first names", () => {
        const rows = (prefix, suffix) => ({
            prefixes: [{ text: prefix, meaning: "" }],
            suffixes: [{ male: [suffix], female: [suffix], meaning: "" }]
        });
        const withRows = (prefix, suffix, extra = {}) => {
            const { prefixes: p, suffixes: s } = rows(prefix, suffix);
            const base = fixture({ prefixes: p, ...extra });
            return new ElfNameGenerator({ ...base, tables: { ...base.tables, suffixes: s } });
        };

        it("refuses a word under four letters and keeps one of exactly eleven", () => {
            expect(() => withRows("a", "ra").generate({ random: () => 0.1 })).toThrow(/unlocking/);
            expect(firstWord(withRows("bel", "ranthiel").generate({ random: () => 0.1 }))).toBe("Belranthiel");
        });

        it("uses each of Dragon #251's joining letters where it is one that joins cleanly", () => {
            const lettersOf = (gen) =>
                new Set(
                    sample(gen, 300)
                        .flatMap((r) => r.parts)
                        .filter((p) => p.role === "joining letter")
                        .map((p) => p.text)
                );
            // "al" + "ra" with no clusters: only a vowel avoids a consonant pair; "na" + "thel": only a consonant
            // that the clusters allow before "th"
            expect(lettersOf(new ElfNameGenerator(fixture({ joinClusters: [] })))).toEqual(new Set(["a", "e", "i"]));
            const consonants = withRows("na", "thel", { joinClusters: ["lth", "rth", "sth", "sh", "shth"] });
            expect(lettersOf(consonants)).toEqual(new Set(["l", "r", "s", "sh"]));
        });

        it("keeps a shared suffix's meaning whole; only paired suffixes split Lord/Lady", () => {
            const base = fixture();
            const shared = { male: ["ra"], female: ["ra"], meaning: "Star/Moon" };
            const gen = new ElfNameGenerator({ ...base, tables: { ...base.tables, suffixes: [shared] } });
            expect(part(gen.generate({ style: "feminine", random: () => 0.4 }), "t1").meaning).toBe("Star/Moon");
        });

        it("accepts 'female' and 'male' as styles", () => {
            expect(make().generate({ style: "female", random: () => 0.4 }).sex).toBe("female");
            expect(make().generate({ style: "male", random: () => 0.4 }).sex).toBe("male");
        });
    });

    it("cites the tables, also when the surname is a published one", () => {
        const result = make().generate({ random: () => 0.4 });
        expect(familyOf(result)).toBe("Starym");
        expect(result.tables).toBe("Test tables, first published in Test");
    });

    it("explains missing tables in its own words, whatever is missing", () => {
        const message = "Elf name data is missing the name tables";
        const { prefixes: rowsOfPrefixes } = fixture().tables;
        expect(() => new ElfNameGenerator()).toThrow(message);
        expect(() => new ElfNameGenerator({ tables: {} })).toThrow(message);
        expect(() => new ElfNameGenerator({ tables: { prefixes: rowsOfPrefixes } })).toThrow(message);
    });
});
