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
