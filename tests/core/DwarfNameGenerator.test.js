import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DwarfNameGenerator } from "../../js/core/DwarfNameGenerator.js";
import { DWARF_LINEAGE_RULES } from "../../js/core/dwarfLineages.js";
import { createGeneratorFor } from "../../js/core/generators.js";
import { getLocks, KIND, SECTION } from "../../js/core/nameStructure.js";
import { DWARF_LINEAGES, SPECIES } from "../../js/core/species.js";
import {
    cutFrom,
    nameTable,
    publishedName,
    readLineageData,
    readSpeciesData,
    source,
    word
} from "../helpers/nameData.js";
import { fixedRandom, seededRandom } from "../helpers/random.js";

const { SHIELD, GOLD, WILD, DUERGAR } = DWARF_LINEAGES;
const generatorFor = createGeneratorFor(readSpeciesData());
const SAMPLE = 400;
// a small fixture names only the data its test needs; the rest is empty
const dwarfGenerator = (data, rules) =>
    new DwarfNameGenerator({ names: [], tables: [], words: [], split: {}, sources: [], ...data }, rules);
const sampleOf = (lineage, options = {}) => {
    const gen = createGeneratorFor(readSpeciesData())(lineage);
    const random = seededRandom(7);
    return Array.from({ length: SAMPLE }, (_, i) =>
        gen.generate({ style: i % 2 ? "feminine" : "masculine", random, ...options })
    );
};
const partOf = (result, key) => result.parts.find((p) => p.key === key);
const phraseForms = (result) => result.parts.filter((p) => p.phrase).map((p) => p.phrase);
const textsOf = (lineage, type) =>
    new Set(
        readLineageData(lineage)
            .names.filter((n) => n.type === type)
            .map((n) => n.text)
    );
// names every source ties to this lineage (a name some source prints untagged is "any dwarf" too)
const tiedTo = (lineage, type) =>
    new Set(
        readLineageData(lineage)
            .names.filter((n) => n.type === type && !n.generic && n.lineages.includes(lineage))
            .map((n) => n.text)
    );

// The brief's lineage table (DWARF-NAMING-BRIEF.md section 6), lineage by lineage: flattening a real difference and
// inventing one are both failures.
describe("each lineage against the brief's lineage table", () => {
    it.each([SHIELD, GOLD, DUERGAR])(
        "%s: first names and clans only from its own and its readable records",
        (lineage) => {
            const given = textsOf(lineage, "given");
            const clans = textsOf(lineage, "family");
            for (const result of sampleOf(lineage)) {
                const first = partOf(result, "given");
                if (first) expect(given.has(first.text), result.name).toBe(true);
                expect(clans.has(partOf(result, "clan").text), result.name).toBe(true);
            }
        }
    );

    // A leak drawn evenly would be 10 of 804 shield clans (37 of 804 gold): 400 rolls miss it under 1% of the time.
    it("never gives gold dwarves a clan tied only to shield dwarves, nor shield dwarves one tied only to gold", () => {
        const shield = tiedTo(SHIELD, "family");
        const gold = tiedTo(GOLD, "family");
        const shieldOnly = new Set([...shield].filter((c) => !gold.has(c)));
        const goldOnly = new Set([...gold].filter((c) => !shield.has(c)));
        expect(shieldOnly.size && goldOnly.size).toBeTruthy();
        expect(sampleOf(GOLD).filter((r) => shieldOnly.has(partOf(r, "clan").text))).toEqual([]);
        expect(sampleOf(SHIELD).filter((r) => goldOnly.has(partOf(r, "clan").text))).toEqual([]);
    });

    it("never gives a wild dwarf a clan, and takes only its own published names", () => {
        const own = textsOf(WILD, "given");
        expect(own.size).toBeGreaterThan(40);
        for (const result of sampleOf(WILD)) {
            expect(
                result.parts.some((p) => p.section === SECTION.FAMILY),
                result.name
            ).toBe(false);
            const first = partOf(result, "given");
            expect(own.has(first.text), result.name).toBe(true);
        }
    });

    it("builds new wild names only from pieces of wild names, never from a table", () => {
        const own = textsOf(WILD, "given");
        const built = sampleOf(WILD, { expanded: true }).filter((r) => r.shape);
        expect(built.length).toBeGreaterThan(50);
        for (const result of built) {
            for (const part of result.parts.filter((p) => p.kind === KIND.PREFIX || p.kind === KIND.SUFFIX)) {
                expect(part.method, result.name).toBe("split");
                expect(
                    part.from.every((name) => own.has(name)),
                    result.name
                ).toBe(true);
            }
        }
    });

    it("gives duergar only the Than phrase, and the others never Than", () => {
        const duergar = sampleOf(DUERGAR).flatMap(phraseForms);
        expect(duergar.length).toBeGreaterThan(10);
        expect(new Set(duergar)).toEqual(new Set(["than"]));
        for (const lineage of [SHIELD, GOLD, WILD])
            expect(sampleOf(lineage).flatMap(phraseForms)).not.toContain("than");
    });

    it("gives wild dwarves no name phrase, and no phrase control", () => {
        expect(sampleOf(WILD).flatMap(phraseForms)).toEqual([]);
        const wild = generatorFor(WILD).generate({ style: "feminine", random: seededRandom(1) });
        expect(generatorFor(WILD).getStructureControls(wild)).toEqual([]);
    });

    it("lets only gold dwarves carry two phrases", () => {
        const most = (lineage) =>
            Math.max(...sampleOf(lineage, { random: seededRandom(3) }).map((r) => phraseForms(r).length));
        expect(most(GOLD)).toBe(2);
        for (const lineage of [SHIELD, WILD, DUERGAR]) expect(most(lineage)).toBeLessThanOrEqual(1);
    });

    it("builds duergar names from Dragon #281's table and the others from Races of Stone", () => {
        const tableOf = (lineage) =>
            sampleOf(lineage, { expanded: true })
                .flatMap((r) => r.parts)
                .filter((p) => (p.kind === KIND.PREFIX || p.kind === KIND.SUFFIX) && !p.method)
                .map((p) => p.sources[0].title);
        expect(new Set(tableOf(DUERGAR))).toEqual(new Set(["Dragon #281"]));
        expect(new Set(tableOf(SHIELD))).toEqual(new Set(["Races of Stone (3.5e)"]));
    });
});

describe("sex", () => {
    it("draws published names recorded with the sex asked for", () => {
        const byText = new Map(readLineageData(SHIELD).names.map((n) => [n.text, n]));
        const gen = generatorFor(SHIELD);
        for (const [style, sex] of [
            ["feminine", "female"],
            ["masculine", "male"]
        ]) {
            for (let i = 0; i < 100; i++) {
                const first = partOf(gen.generate({ style, random: seededRandom(i) }), "given");
                expect([sex, "unisex"]).toContain(byText.get(first.text).sex);
            }
        }
    });

    it("ends built names with a suffix of the sex asked for (Races of Stone Tables 1-2, 1-3)", () => {
        const table = readLineageData(SHIELD).tables[0];
        const forms = (sex) => new Set(table.suffixes.filter((s) => s[sex]).flatMap((s) => [s[sex]].flat()));
        for (const result of sampleOf(SHIELD, { expanded: true }).filter((r) => r.shape)) {
            const suffix = partOf(result, "g1");
            if (suffix.method !== "split") expect(forms(result.sex).has(suffix.text), result.name).toBe(true);
        }
    });

    it("keeps built names to 4-8 letters with no apostrophe", () => {
        for (const lineage of [SHIELD, GOLD, WILD, DUERGAR]) {
            for (const result of sampleOf(lineage, { expanded: true }).filter((r) => r.shape)) {
                const first = result.name.split(/[ ,]/)[0];
                expect(first.length, result.name).toBeGreaterThanOrEqual(4);
                expect(first.length, result.name).toBeLessThanOrEqual(8);
                expect(first, result.name).not.toContain("'");
            }
        }
    });

    it.each([SHIELD, GOLD, WILD, DUERGAR])(
        "refuses a unisex name for %s: every dwarf name is female or male",
        (lineage) => {
            expect(() => generatorFor(lineage).generate({ style: "neutral" })).toThrow(/Choose female or male/);
        }
    );

    it("says daul of for a female and son of for a male", () => {
        const gen = generatorFor(SHIELD);
        for (const [style, wording] of [
            ["feminine", ", daul of "],
            ["masculine", ", son of "]
        ]) {
            let plain = gen.generate({ style, random: seededRandom(1) });
            // a roll may already carry a phrase; take it away first
            if (phraseForms(plain).length) plain = gen.generateStructureChange(plain, "phrase", {});
            const added = Array.from({ length: 40 }, (_, i) =>
                gen.generateStructureChange(plain, "phrase", { random: seededRandom(i) })
            );
            const parentage = added.filter((r) => phraseForms(r).includes("parentage"));
            expect(parentage.length).toBeGreaterThan(0);
            for (const result of parentage) expect(result.name).toContain(wording);
        }
    });
});

describe('"of" a place', () => {
    const placeRules = (phrases, phraseCount = 1) => ({ ...DWARF_LINEAGE_RULES[SHIELD], phrases, phraseCount });
    const withPlace = (rules) =>
        dwarfGenerator(
            {
                names: [
                    publishedName("Dorn", "given", { sex: "male", form: "dwarvish" }),
                    publishedName("Ahrdagh", "given", { sex: "male", form: "dwarvish" }),
                    publishedName("Bladebite", "family", { form: "common" })
                ],
                words: [word("the Deep Realm", "place")],
                sources: []
            },
            rules
        );
    const withPhrase = (gen, random) =>
        gen.generateStructureChange(gen.generate({ style: "masculine", random }), "phrase", { random });

    it('names a reviewed place after the clan, in the sourced wording ", of"', () => {
        const result = withPhrase(withPlace(placeRules([{ form: "place", weight: 1 }])), seededRandom(1));
        expect(result.name).toMatch(/^(Dorn|Ahrdagh) Bladebite, of the Deep Realm$/);
        expect(partOf(result, "place")).toMatchObject({ text: "the Deep Realm", phrase: "place", form: "common" });
    });

    it("puts the place last, after a parent's name (FR11 p2's order)", () => {
        const gen = withPlace(
            placeRules(
                [
                    { form: "place", weight: 1 },
                    { form: "parentage", weight: 1 }
                ],
                2
            )
        );
        const both = Array.from({ length: 40 }, (_, i) => withPhrase(gen, seededRandom(i))).filter(
            (r) => phraseForms(r).length === 2
        );
        expect(both.length).toBeGreaterThan(0);
        for (const result of both) {
            expect(result.name).toMatch(/^(Dorn|Ahrdagh) Bladebite, son of (Dorn|Ahrdagh), of the Deep Realm$/);
        }
    });

    it("offers no place phrase when the data has no places", () => {
        const gen = dwarfGenerator(
            { names: [publishedName("Dorn", "given", { sex: "male", form: "dwarvish" })], words: [], sources: [] },
            placeRules([{ form: "place", weight: 1 }])
        );
        expect(gen.generateStructureChange(gen.generate({ style: "masculine" }), "phrase", {})).toBeNull();
    });

    it("gives shield and gold dwarves places only from the reviewed list, and duergar and wild dwarves none", () => {
        const places = new Set(
            readLineageData(SHIELD)
                .words.filter((w) => w.use === "place")
                .map((w) => w.text)
        );
        expect(places.size).toBeGreaterThan(0);
        for (const lineage of [SHIELD, GOLD]) {
            const named = sampleOf(lineage, { random: seededRandom(11) })
                .map((r) => partOf(r, "place"))
                .filter(Boolean);
            expect(named.length, lineage).toBeGreaterThan(0);
            for (const part of named) expect(places.has(part.text), part.text).toBe(true);
        }
        for (const lineage of [DUERGAR, WILD]) expect(sampleOf(lineage).flatMap(phraseForms)).not.toContain("place");
    });
});

describe("the built-name share (Expanded Variety)", () => {
    // a male published name "Testa", and a table that builds only "Dorak"
    const generatorWith = (otherTables = []) =>
        dwarfGenerator(
            {
                names: [publishedName("Testa", "given", { sex: "male", form: "dwarvish" })],
                tables: [
                    ...otherTables,
                    nameTable("given", { prefixes: [{ text: "dor" }], suffixes: [{ male: "ak" }] })
                ],
                sources: []
            },
            { ...DWARF_LINEAGE_RULES[SHIELD], lineage: "test", hasFamily: false, phrases: [], phraseCount: 0 }
        );
    const gen = generatorWith();

    it("builds a first name on a draw under one half, and keeps a published one at one half", () => {
        expect(gen.generate({ style: "masculine", expanded: true, random: () => 0.4999 }).name).toBe("Dorak");
        expect(gen.generate({ style: "masculine", expanded: true, random: () => 0.5 }).name).toBe("Testa");
    });

    it("never builds one without Expanded Variety", () => {
        expect(gen.generate({ style: "masculine", random: () => 0.4999 }).name).toBe("Testa");
    });

    it("builds from the given-name table even when another table is listed first", () => {
        const house = nameTable("house", { prefixes: [{ text: "zor" }], suffixes: [{ male: "ith" }] });
        const random = () => 0.4999;
        expect(generatorWith([house]).generate({ style: "masculine", expanded: true, random }).name).toBe("Dorak");
    });
});

describe("names recorded as both sexes", () => {
    it("serves a name published as unisex to female and male names alike", () => {
        const gen = dwarfGenerator(
            { names: [publishedName("Kai", "given", { sex: "unisex", form: "dwarvish" })], sources: [] },
            { ...DWARF_LINEAGE_RULES[WILD], lineage: "test" }
        );
        expect(gen.generate({ style: "feminine", random: seededRandom(1) }).name).toBe("Kai");
        expect(gen.generate({ style: "masculine", random: seededRandom(2) }).name).toBe("Kai");
    });
});

describe("the phrase share and control", () => {
    it("puts a phrase on about one roll in ten", () => {
        const share = sampleOf(SHIELD).filter((r) => phraseForms(r).length).length / SAMPLE;
        expect(share).toBeGreaterThan(0.05);
        expect(share).toBeLessThan(0.16);
    });

    it("adds a phrase on request and takes it away again", () => {
        const gen = generatorFor(SHIELD);
        const plain = gen.generate({ style: "masculine", random: seededRandom(2) });
        const added = gen.generateStructureChange(plain, "phrase", { random: seededRandom(5) });
        expect(phraseForms(added)).toHaveLength(1);
        expect(gen.getStructureControls(added)).toEqual([{ control: "phrase", on: true }]);
        const removed = gen.generateStructureChange(added, "phrase", {});
        expect(phraseForms(removed)).toEqual([]);
        expect(removed.name).toBe(plain.name);
    });

    it("keeps a locked phrase: the control will not take it away", () => {
        const gen = generatorFor(DUERGAR);
        const plain = gen.generate({ style: "masculine", random: seededRandom(2) });
        const added = gen.generateStructureChange(plain, "phrase", { random: seededRandom(5) });
        expect(gen.generateStructureChange(added, "phrase", { locked: new Set(["parent"]) })).toBeNull();
    });
});

describe("locks and contradictory inputs", () => {
    it("keeps locked parts through a roll", () => {
        const gen = generatorFor(GOLD);
        const start = gen.generateStructureChange(
            gen.generate({ style: "feminine", random: seededRandom(4) }),
            "phrase",
            {
                random: seededRandom(4)
            }
        );
        const keys = new Set(start.parts.filter((p) => p.kind !== KIND.JOINT).map((p) => p.key));
        const again = gen.generate({ style: "feminine", locks: getLocks(start, keys), random: seededRandom(9) });
        expect(again.name).toBe(start.name);
    });

    it("refuses a locked clan for a lineage with no clans", () => {
        const shield = generatorFor(SHIELD).generate({ style: "masculine", random: seededRandom(1) });
        const locks = { clan: partOf(shield, "clan") };
        expect(() => generatorFor(WILD).generate({ style: "masculine", locks })).toThrow(/no clan/);
    });

    it("refuses a locked phrase the lineage does not use", () => {
        const than = {
            key: "parent",
            role: "parent's name",
            text: "Udubyr",
            section: "phrase",
            kind: "whole",
            phrase: "than"
        };
        expect(() => generatorFor(SHIELD).generate({ style: "masculine", locks: { parent: than } })).toThrow(
            /name phrase/
        );
    });

    it("refuses a locked table part for a lineage with no table", () => {
        const prefix = { key: "g0", role: "prefix", text: "ar", meaning: "Blood", section: "given", kind: "prefix" };
        expect(() => generatorFor(WILD).generate({ style: "masculine", locks: { g0: prefix } })).toThrow(
            /no name table/
        );
    });

    it("is built only from a lineage description", () => {
        expect(() => new DwarfNameGenerator({ names: [], tables: [], words: [], split: {}, sources: [] })).toThrow(
            "A dwarf generator needs its lineage description"
        );
    });

    it("offers no choices for a part it does not hold or one with no picker", () => {
        const gen = generatorFor(SHIELD);
        const result = gen.generate({ style: "masculine", expanded: true, random: seededRandom(3) });
        const joint = result.parts.find((p) => p.kind === KIND.JOINT);
        expect(gen.optionsFor(result, "nothing")).toEqual([]);
        expect(gen.optionsFor(result, joint.key)).toEqual([]);
    });

    it("says so instead of returning a name when its pools are empty", () => {
        const gen = dwarfGenerator({ names: [], tables: [], words: [], sources: [] }, DWARF_LINEAGE_RULES[SHIELD]);
        expect(() => gen.generate({ style: "masculine" })).toThrow(/Could not make a dwarf name/);
    });
});

describe("one generator for every lineage, steered only by its description", () => {
    it("names no lineage in its code", () => {
        const code = readFileSync("js/core/DwarfNameGenerator.js", "utf8").toLowerCase();
        const words = SPECIES.dwarf.lineages
            .flatMap((l) => [l.value, ...l.label.split(" ")])
            .filter((w) => w !== "dwarf");
        for (const word of new Set(words)) expect(code, word).not.toContain(word);
    });

    it("follows a made-up lineage's description: no clan, no phrase, female only", () => {
        const rules = {
            lineage: "test",
            ownWeight: 1,
            sexes: ["female"],
            hasFamily: false,
            phrases: [],
            phraseCount: 0
        };
        const gen = dwarfGenerator(
            {
                names: [
                    publishedName("Testa", "given", { sex: "female", form: "dwarvish" }),
                    publishedName("Clanly", "family", { form: "dwarvish" })
                ],
                tables: [
                    nameTable("given", {
                        prefixes: [{ text: "ar", meaning: "Blood" }],
                        suffixes: [{ male: "ak", meaning: "Axe" }]
                    })
                ],
                words: [word("the Grim", "qualifier")],
                sources: []
            },
            rules
        );
        const results = Array.from({ length: 50 }, (_, i) =>
            gen.generate({ style: "feminine", random: seededRandom(i) })
        );
        expect(new Set(results.map((r) => r.name))).toEqual(new Set(["Testa"]));
        expect(results.every((r) => r.subrace === "test")).toBe(true);
        expect(() => gen.generate({ style: "masculine" })).toThrow(/Choose female or male/);
    });

    it("rolls published names when the lineage's names give no split suffix of the sex asked for", () => {
        const cut = cutFrom({
            openings: [{ text: "Do", from: ["Dorak"] }],
            endings: [{ text: "rak", from: ["Dorak"], sex: "male" }]
        });
        const gen = dwarfGenerator(
            {
                names: [publishedName("Testa", "given", { sex: "female", form: "dwarvish" }), ...cut.names],
                split: { given: cut.split },
                sources: []
            },
            { ...DWARF_LINEAGE_RULES[WILD], lineage: "test" }
        );
        const results = Array.from({ length: 20 }, (_, i) =>
            gen.generate({ style: "feminine", expanded: true, random: seededRandom(i) })
        );
        expect(new Set(results.map((r) => r.name))).toEqual(new Set(["Testa"]));
    });
});

describe("hasSmallPool: whether the published names alone will repeat often", () => {
    it("is true for wild dwarves, whose published names are few, for either sex", () => {
        for (const style of ["feminine", "masculine"]) expect(generatorFor(WILD).hasSmallPool(style)).toBe(true);
    });

    it.each([SHIELD, GOLD])("is false for %s dwarves, whose published names are many", (lineage) => {
        for (const style of ["feminine", "masculine"]) expect(generatorFor(lineage).hasSmallPool(style)).toBe(false);
    });

    it("follows the pool of the sex asked for, not the whole lineage", () => {
        const names = (sex, count) =>
            Array.from({ length: count }, (_, i) =>
                publishedName(`Name${"x".repeat(i)}`, "given", { sex, form: "dwarvish" })
            );
        const gen = dwarfGenerator(
            { names: [...names("male", 150), ...names("female", 5)] },
            DWARF_LINEAGE_RULES[WILD]
        );
        expect(gen.hasSmallPool("masculine")).toBe(false);
        expect(gen.hasSmallPool("feminine")).toBe(true);
    });

    it("counts a pool as small under 100 published names", () => {
        const poolOf = (count) =>
            dwarfGenerator(
                {
                    names: Array.from({ length: count }, (_, i) =>
                        publishedName(`Name${"x".repeat(i)}`, "given", { sex: "female", form: "dwarvish" })
                    )
                },
                DWARF_LINEAGE_RULES[WILD]
            );
        expect(poolOf(99).hasSmallPool("feminine")).toBe(true);
        expect(poolOf(100).hasSmallPool("feminine")).toBe(false);
    });
});

describe("joining letters (Races of Stone p26)", () => {
    const RACES_OF_STONE = ["a", "b", "d", "f", "g", "i", "k", "m", "t", "v", "z"];
    const male = (text) => publishedName(text, "given", { sex: "male", form: "dwarvish" });
    const builder = ({ suffixes, clusters, names = [] }) => {
        const cut = cutFrom({ joins: clusters });
        return dwarfGenerator(
            {
                names: [male("Dorn"), ...names, ...cut.names],
                tables: [
                    nameTable("given", {
                        prefixes: [{ text: "dor", meaning: "Steel" }],
                        suffixes: suffixes.map((text) => ({ male: text, meaning: "Hammer" }))
                    })
                ],
                split: { given: cut.split },
                sources: []
            },
            DWARF_LINEAGE_RULES[SHIELD]
        );
    };
    const builtRolls = (gen, count = 200) =>
        Array.from({ length: count }, (_, i) =>
            gen.generate({ style: "masculine", expanded: true, random: seededRandom(i) })
        ).filter((r) => r.shape);
    const jointOf = (result) => result.parts.find((p) => p.kind === KIND.JOINT);

    it("draws every one of the book's letters where each fits, citing the book", () => {
        // every consonant letter meets "dor" and "nak" inside a published name; the vowels always fit
        const consonants = RACES_OF_STONE.filter((l) => !"ai".includes(l));
        const gen = builder({ suffixes: ["nak"], clusters: consonants.flatMap((l) => [`r${l}`, `r${l}n`]) });
        const joints = builtRolls(gen).map(jointOf);
        expect(new Set(joints.map((j) => j.text))).toEqual(new Set(RACES_OF_STONE));
        expect(new Set(joints.map((j) => j.basis))).toEqual(new Set(["Races of Stone"]));
    });

    describe("the picker", () => {
        // "dor" meets ral (rr) and tak (rt) only through a letter; d fits ral (rd, rdr) but not tak; ffa never fits
        const gen = builder({
            suffixes: ["ral", "tak", "rul", "ffa", "kral"],
            clusters: ["rd", "rdr", "rkr"],
            names: [publishedName("Dorkral", "given", { sex: "male", form: "dwarvish", sources: [source("Book")] })]
        });
        // rolled inside the tests, so a generator that fails fails a test and not the whole file's collection
        let rolled;
        const start = () =>
            (rolled ??= builtRolls(gen, 600).find((r) => partOf(r, "g1").text === "ral" && jointOf(r)?.text === "d"));
        const edit = (text) => {
            const choice = gen.optionsFor(start(), "g1").find((o) => o.text === text);
            return choice && gen.generatePartChange(start(), "g1", choice);
        };

        it("lists only suffixes that join with a letter a roll would use", () => {
            expect(start().name).toBe("Dordral");
            expect(gen.optionsFor(start(), "g1").map((o) => o.text)).toEqual(["ral", "tak", "rul", "kral"]);
        });

        it("keeps the joining letter while it fits, else takes the first that does, else none", () => {
            expect(edit("rul").name).toBe("Dordrul");
            expect(edit("tak").name).toBe("Doratak");
            expect(edit("kral").name).toBe("Dorkral");
        });

        it("adds split components to the table's choices only where the slot holds one", () => {
            const built = sampleOf(SHIELD, { expanded: true }).filter((r) => r.shape);
            const methodsFor = (method) => {
                const result = built.find((r) => partOf(r, "g1").method === method);
                return new Set(
                    generatorFor(SHIELD)
                        .optionsFor(result, "g1")
                        .map((o) => o.method)
                );
            };
            expect(methodsFor("split")).toEqual(new Set([undefined, "split"]));
            expect(methodsFor(undefined)).toEqual(new Set([undefined]));
        });

        it("gives the sources of a built name that is also published", () => {
            expect(edit("kral").published).toEqual({ sources: [source("Book")] });
            expect(edit("tak").published).toBeUndefined();
        });
    });
});

describe("name phrases (FR11 p2; Dragon #281 p46)", () => {
    const FORMS = ["than", "qualifier", "parentage", "blood", "place"];
    const names = [
        publishedName("Droon", "given", { sex: "male", form: "dwarvish" }),
        publishedName("Hilda", "given", { sex: "female", form: "dwarvish" }),
        publishedName("Grim", "given", { form: "dwarvish" }),
        publishedName("Kai", "given", { sex: "unisex", form: "dwarvish" }),
        publishedName("Anvilbreaker", "family", { form: "common" })
    ];
    const phraseRules = (forms, phraseCount = 1) => ({
        ...DWARF_LINEAGE_RULES[SHIELD],
        phrases: forms.map((form) => ({ form, weight: 1 })),
        phraseCount
    });
    const generator = (rules, given = names) =>
        dwarfGenerator(
            { names: given, words: [word("the Grim", "qualifier"), word("Gauntlgrym", "place")], sources: [] },
            rules
        );
    // a roll of 0.99 draws no phrase and the last name of the pool; rolled once, as the generator avoids repeats
    const plainRolls = new Map();
    const plain = (gen, style) => {
        const rolls = plainRolls.get(gen) ?? plainRolls.set(gen, {}).get(gen);
        return (rolls[style] ??= gen.generate({ style, random: () => 0.99 }));
    };
    const added = (gen, random, style = "masculine") =>
        gen.generateStructureChange(plain(gen, style), "phrase", { random });

    it.each([
        ["than", /^Kai Than (Droon|Grim|Kai) Anvilbreaker$/],
        ["qualifier", /^Kai the Grim Anvilbreaker$/],
        ["parentage", /^Kai Anvilbreaker, son of (Droon|Hilda|Grim|Kai)$/],
        ["blood", /^Kai Anvilbreaker, blood of (Droon|Hilda|Grim|Kai)$/],
        ["place", /^Kai Anvilbreaker, of Gauntlgrym$/]
    ])("words the %s phrase as the books do, before or after the clan", (form, pattern) => {
        const gen = generator(phraseRules([form]));
        for (let i = 0; i < 20; i++) expect(added(gen, seededRandom(i)).name).toMatch(pattern);
    });

    it("orders phrases Than, qualifier, clan, parentage, blood, place, at most one per form and per part", () => {
        const gen = generator(phraseRules(FORMS, FORMS.length));
        const order = ["than", "qualifier", "clan", "parentage", "blood", "place"];
        let several = 0;
        for (let i = 0; i < 200; i++) {
            const result = added(gen, seededRandom(i));
            const sequence = result.parts.filter((p) => p.phrase || p.key === "clan").map((p) => p.phrase || "clan");
            const sorted = [...sequence].sort((a, b) => order.indexOf(a) - order.indexOf(b));
            expect(sequence, result.name).toEqual(sorted);
            const keys = result.parts.filter((p) => p.phrase).map((p) => p.key);
            expect(new Set(keys).size, result.name).toBe(keys.length);
            if (keys.length > 2) several++;
        }
        expect(several).toBeGreaterThan(10);
    });

    it("adds a further phrase on a draw under one half, and stops at one half", () => {
        const gen = generator(phraseRules(["qualifier", "place"], 2));
        // the draws: which form, which word, then whether to add another
        expect(phraseForms(added(gen, fixedRandom(0, 0, 0.5)))).toHaveLength(1);
        expect(phraseForms(added(gen, fixedRandom(0, 0, 0.49)))).toHaveLength(2);
    });

    it("changes one phrase of a name and leaves its other phrase as it was", () => {
        const gen = dwarfGenerator(
            {
                names,
                words: [word("the Grim", "qualifier"), word("the Bold", "qualifier"), word("Gauntlgrym", "place")],
                sources: []
            },
            phraseRules(["qualifier", "place"], 2)
        );
        const both = added(gen, fixedRandom(0, 0, 0.49));
        expect(phraseForms(both)).toEqual(["qualifier", "place"]);
        const bold = gen.optionsFor(both, "qualifier").find((o) => o.text === "the Bold");
        expect(gen.generatePartChange(both, "qualifier", bold).name).toBe("Kai the Bold Anvilbreaker, of Gauntlgrym");
    });

    it("keeps a locked phrase as the only phrase", () => {
        const gen = generator(phraseRules(["qualifier", "place"], 2));
        const qualifier = partOf(added(generator(phraseRules(["qualifier"])), seededRandom(1)), "qualifier");
        for (let i = 0; i < 30; i++) {
            const result = gen.generate({ style: "masculine", locks: { qualifier }, random: seededRandom(i) });
            expect(result.parts.filter((p) => p.phrase)).toEqual([qualifier]);
        }
    });

    it("names a father in a Than phrase: a name recorded as male, unisex or with no sex", () => {
        const gen = generator(phraseRules(["than"]));
        const fathers = new Set(
            Array.from({ length: 60 }, (_, i) => partOf(added(gen, seededRandom(i), "feminine"), "parent").text)
        );
        expect(fathers).toEqual(new Set(["Droon", "Grim", "Kai"]));
        const withThan = added(gen, seededRandom(1));
        expect(gen.optionsFor(withThan, "parent").map((o) => o.text)).toEqual(["Droon", "Grim", "Kai"]);
    });

    it("never names a parent recorded as female in a duergar Than phrase", () => {
        const female = new Set(
            readLineageData(DUERGAR)
                .names.filter((n) => n.type === "given" && n.sex === "female")
                .map((n) => n.text)
        );
        const gen = generatorFor(DUERGAR);
        const parents = Array.from({ length: 200 }, (_, i) =>
            partOf(added(gen, seededRandom(i), i % 2 ? "feminine" : "masculine"), "parent")
        );
        expect(parents.filter((p) => female.has(p.text)).map((p) => p.text)).toEqual([]);
    });

    it("lets a parent share the bearer's name, on a roll, a lock and in the picker (chosen: dwarves reuse names)", () => {
        const gen = generator(phraseRules(["than"]), [names[0], names[4]]);
        const withThan = added(gen, seededRandom(1));
        expect(withThan.name).toBe("Droon Than Droon Anvilbreaker");
        expect(gen.optionsFor(withThan, "given").map((o) => o.text)).toEqual(["Droon"]);
        const parent = partOf(withThan, "parent");
        expect(gen.generate({ style: "masculine", locks: { parent } }).name).toBe(withThan.name);
    });
});

// A built first name is one table prefix plus one table suffix, with split components only as Expanded Variety allows.
describe("building a first name from the table", () => {
    const male = (text) => publishedName(text, "given", { sex: "male", form: "dwarvish" });
    const rules = { ...DWARF_LINEAGE_RULES[SHIELD], lineage: "test", hasFamily: false, phrases: [], phraseCount: 0 };
    const tableOf = (prefixes, suffixes) =>
        nameTable("given", {
            prefixes: prefixes.map((text) => ({ text })),
            suffixes: suffixes.map((male) => ({ male }))
        });
    const builder = ({ prefixes = ["dor"], suffixes = ["ak"], cut = cutFrom({}) } = {}) =>
        dwarfGenerator(
            {
                names: [male("Testa"), ...cut.names],
                tables: [tableOf(prefixes, suffixes)],
                split: { given: cut.split },
                sources: []
            },
            rules
        );
    const built = (gen, extra = {}) =>
        gen.generate({ style: "masculine", expanded: true, random: () => 0.4999, ...extra });
    const withSplits = cutFrom({
        openings: [{ text: "Mo", from: ["Morak"] }],
        endings: [{ text: "rak", from: ["Morak"], sex: "male" }]
    });

    describe("a locked prefix or suffix keeps the built name's slots, with or without Expanded Variety", () => {
        const gen = builder();
        const kept = (key) => {
            const start = built(gen);
            expect(start.name).toBe("Dorak");
            return gen.generate({ style: "masculine", locks: getLocks(start, new Set([key])), random: () => 0.99 });
        };

        it.each(["g0", "g1"])("builds around the locked %s even when the roll would take a published name", (key) => {
            const result = kept(key);
            expect(result.name).toBe("Dorak");
            expect(result.shape).toBeDefined();
        });
    });

    it("rolls a published name when the table builds nothing acceptable (too short)", () => {
        expect(built(builder({ prefixes: ["d"], suffixes: ["k"] })).name).toBe("Testa");
    });

    it("says so instead of rolling a published name when a locked part cannot be built around", () => {
        const start = built(builder());
        // the locked "dor" and the only suffix make a triple letter
        const gen = builder({ suffixes: ["rra"] });
        const locks = getLocks(start, new Set(["g0"]));
        expect(() => gen.generate({ style: "masculine", expanded: true, locks, random: () => 0.4999 })).toThrow(
            /Could not make a dwarf name/
        );
    });

    it("refuses a built name with a triple letter, and rolls a published one", () => {
        expect(built(builder({ prefixes: ["daa"], suffixes: ["aka"] })).name).toBe("Testa");
    });

    it("takes split components only with Expanded Variety", () => {
        const start = built(builder());
        const locks = getLocks(start, new Set(["g0"]));
        const gen = builder({ cut: withSplits });
        // a draw under one half would take a split component were they allowed
        const result = gen.generate({ style: "masculine", locks, random: () => 0.1 });
        expect(result.name).toBe("Dorak");
        expect(partOf(result, "g1").method).toBeUndefined();
    });

    it("takes split components only when the lineage's names give some", () => {
        const gen = builder();
        expect(gen.split.isAvailable).toBe(false);
        expect(built(gen).name).toBe("Dorak");
    });

    it("takes a split component on a draw under one half, with Expanded Variety and some to take", () => {
        const gen = builder({ cut: withSplits });
        const result = gen.generate({ style: "masculine", expanded: true, random: () => 0.1 });
        expect(result.parts.filter((p) => p.method === "split").length).toBeGreaterThan(0);
    });
});

describe("name phrases of one roll", () => {
    const rules = (forms, phraseCount) => ({
        ...DWARF_LINEAGE_RULES[SHIELD],
        phrases: forms.map((form) => ({ form, weight: 1 })),
        phraseCount
    });
    const names = [
        publishedName("Droon", "given", { sex: "male", form: "dwarvish" }),
        publishedName("Anvilbreaker", "family", { form: "common" })
    ];
    const gen = (forms, count) =>
        dwarfGenerator({ names, words: [word("the Grim", "qualifier")], sources: [] }, rules(forms, count));

    it("gives a roll that takes no phrase no phrase parts", () => {
        const result = gen(["qualifier", "parentage"], 2).generate({ style: "masculine", random: () => 0.99 });
        expect(result.parts.filter((p) => p.phrase)).toEqual([]);
        expect(result.name).toBe("Droon Anvilbreaker");
    });

    it("takes a phrase on a draw under one tenth, and none at one tenth", () => {
        const generator = gen(["qualifier"], 1);
        // the draws: the first name, the clan, then whether to take a phrase
        expect(phraseForms(generator.generate({ style: "masculine", random: fixedRandom(0, 0, 0.0999) }))).toEqual([
            "qualifier"
        ]);
        expect(phraseForms(generator.generate({ style: "masculine", random: fixedRandom(0, 0, 0.1) }))).toEqual([]);
    });

    it("never gives two phrases that share a part, even when the lineage allows two", () => {
        // Than and parentage both name a parent: one of them, never both
        const generator = gen(["than", "parentage"], 2);
        for (let i = 0; i < 60; i++) {
            const plain = generator.generate({ style: "masculine", random: () => 0.99 });
            const result = generator.generateStructureChange(plain, "phrase", { random: fixedRandom(0, 0, 0, 0) });
            expect(phraseForms(result)).toHaveLength(1);
        }
    });
});
