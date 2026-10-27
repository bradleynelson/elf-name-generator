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
                const chosen = gen.generate({ style: "neutral", locks: { ...locks, [key]: option } });
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
        expect(() => unjoinable.generate()).toThrow(/unlocking/);
        expect(() => new ElfNameGenerator({ familyNames: [] })).toThrow(/tables/);
    });

    it("avoids repeating a name within five generations when alternatives exist", () => {
        const rows = ["al", "el", "il", "ol", "ul", "ael", "eil"].map((text) => ({ text, meaning: "" }));
        const names = sample(new ElfNameGenerator(fixture({ prefixes: rows })), 100).map((r) => r.name);
        names.forEach((name, i) => expect(names.slice(Math.max(0, i - 5), i)).not.toContain(name));
    });

    it("hands drow requests to the drow generator and rejects unknown subraces", () => {
        const drow = { generate: () => ({ name: "Viconia DeVir" }) };
        const gen = new ElfNameGenerator(fixture(), drow);
        expect(gen.generate({ subrace: "drow" }).name).toBe("Viconia DeVir");
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
