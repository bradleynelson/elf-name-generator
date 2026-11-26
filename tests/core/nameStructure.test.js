import { describe, expect, it } from "vitest";
import {
    capitalize,
    formatPartLabel,
    formatSectionText,
    GIVEN_SLOT,
    KIND,
    METHOD,
    NAME_STRUCTURE_CONTROL,
    SECTION,
    SECTION_ANALYTICS,
    STRUCTURE_CONTROLS,
    publishedPart,
    sectionsOf,
    slotPart,
    tablePart,
    getAvailableControls,
    getChangedShape,
    getKeptParts,
    getLocks,
    getSlotNumber,
    getStoredPlace,
    hasKnownMeaning,
    isSlotComponent,
    includesSlotKey,
    isEveryPartLocked,
    isSamePart,
    isStructurePart,
    joiningLetter,
    jointKey,
    sameShape,
    selectRollShape,
    slotKey,
    structurePart,
    groupWords,
    surnameStart,
    wholeSection,
    wordsOf
} from "../../js/core/nameStructure.js";
import { fixedRandom } from "../helpers/random.js";

// The species-neutral rules for changing a name's structure, with small made-up shapes (not the real name tables).
const SHORT = ["prefix", "suffix"];
const LONG = ["prefix", "suffix", "suffix"];
const COMPOUND = ["prefix", "suffix", " ", "prefix", "suffix"];
const APOSTROPHE = ["suffix", "'", "prefix", "suffix"];
const NAMES = { short: SHORT, long: LONG, compound: COMPOUND };
const shapes = [SHORT, LONG, COMPOUND, APOSTROPHE].map((shape, i) => ({ shape, weight: [4, 3, 2, 1][i] }));
const locked = (...keys) => new Set(keys);
const change = (control, shape, ...lockedKeys) => getChangedShape(control, shape, locked(...lockedKeys), "t", NAMES);

describe("sameShape and getSlotNumber", () => {
    it("compares shapes by their contents, and treats a missing shape as different", () => {
        expect(sameShape(["prefix", "suffix"], SHORT)).toBe(true);
        expect(sameShape(LONG, SHORT)).toBe(false);
        expect(sameShape(undefined, SHORT)).toBe(false);
    });

    it("reads the position of a slot's key as a number, and only for that key prefix", () => {
        expect(getSlotNumber("t2", "t")).toBe(2);
        expect(getSlotNumber("n10", "n")).toBe(10);
        expect(getSlotNumber("tj1", "t")).toBeUndefined(); // a joining letter is not a slot
        expect(getSlotNumber("n0", "t")).toBeUndefined();
        expect(getSlotNumber("family", "n")).toBeUndefined();
    });
});

describe("part keys", () => {
    it("names a slot by its section's key prefix and position, and a joining letter by its place among the parts", () => {
        expect(slotKey("t", 2)).toBe("t2");
        expect(getSlotNumber(slotKey("n", 10), "n")).toBe(10);
        expect(jointKey("t", 1)).toBe("tj1");
        expect(getSlotNumber(jointKey("t", 1), "t")).toBeUndefined();
    });

    it("tells whether any key is a slot of the section, from a list or a set of keys", () => {
        expect(includesSlotKey(["t0", "shape"], "t")).toBe(true);
        expect(includesSlotKey(new Set(["n0", "tj1", "family", "shape"]), "t")).toBe(false);
        expect(includesSlotKey(new Set(), "n")).toBe(false);
    });

    it("makes the part for an apostrophe or a space in a shape, keyed by position, and nothing for a component slot", () => {
        const joint = { section: "given", kind: "joint" };
        expect(structurePart("'", 1)).toEqual({ key: "s1", role: "apostrophe", text: "'", ...joint });
        expect(structurePart(" ", 2)).toEqual({ key: "s2", role: "space", text: " ", ...joint });
        expect(structurePart("prefix", 0)).toBeNull();
        expect(isStructurePart(structurePart(" ", 2))).toBe(true);
        expect(isStructurePart({ role: "joining letter" })).toBe(false);
    });

    it("makes a joining letter, a joint of the section it joins", () => {
        expect(joiningLetter("n", 1, "e", "family")).toEqual({
            key: "nj1",
            role: "joining letter",
            text: "e",
            section: "family",
            kind: "joint"
        });
    });
});

describe("parts saved by 4.1.5 or earlier", () => {
    it.each([
        [{ key: "t0", role: "prefix" }, "given", "prefix"],
        [{ key: "f2", role: "suffix" }, "given", "suffix"],
        [{ key: "s1", role: "apostrophe" }, "given", "joint"],
        [{ key: "s3", role: "space" }, "given", "joint"],
        [{ key: "tj1", role: "joining letter" }, "given", "joint"],
        [{ key: "nj1", role: "joining letter" }, "family", "joint"],
        [{ key: "n0", role: "family prefix" }, "family", "prefix"],
        [{ key: "n1", role: "house suffix" }, "family", "suffix"],
        [{ key: "family", role: "family name" }, "family", "whole"],
        [{ key: "house", role: "house" }, "family", "whole"]
    ])("reads the place of %o from its key and role", (part, section, kind) => {
        expect(getStoredPlace(part)).toEqual({ section, kind });
    });
});

describe("sections and words", () => {
    const parts = [
        { key: "t0", role: "prefix", text: "ael", section: "given" },
        { key: "s1", role: "space", text: " ", section: "given" },
        { key: "t2", role: "suffix", text: "thas", section: "given" },
        { key: "n0", role: "family prefix", text: "gal", section: "family" }
    ];

    it("finds where the surname starts: the first part of the family section", () => {
        expect(surnameStart(parts)).toBe(3);
        expect(surnameStart([{ section: "given" }, { section: "family" }])).toBe(1);
        expect(surnameStart([{ section: "given" }])).toBe(-1);
    });

    it("groups part indexes into words: a space ends one, the surname starts one", () => {
        expect(groupWords(parts)).toEqual([[0], [2], [3]]);
    });

    it("lets a space just before the surname be the break, as 4.1.5 saved it", () => {
        const spaced = [parts[0], parts[1], parts[3]];
        expect(groupWords(spaced)).toEqual([[0], [2]]);
        expect(groupWords([parts[0], parts[3]])).toEqual([[0], [1]]);
    });

    it("leaves an empty word where a space has nothing to end", () => {
        const space = parts[1];
        expect(groupWords([parts[0], space, space, parts[3]]).some((word) => word.length === 0)).toBe(true);
        expect(groupWords([parts[0], space]).some((word) => word.length === 0)).toBe(true);
    });

    it("joins the parts' text into words at each space", () => {
        expect(wordsOf(parts)).toEqual(["ael", "thasgal"]);
    });

    it("capitalizes only the first letter, keeping lower case after an apostrophe", () => {
        expect(capitalize("berg'inyon")).toBe("Berg'inyon");
    });

    it("makes a section of one whole part, and nothing of no part", () => {
        const house = { key: "house", text: "Baenre" };
        expect(wholeSection(house)).toEqual({ text: "Baenre", parts: [house] });
        expect(wholeSection(null)).toBeNull();
    });

    it("writes a built section's words capitalized, and a whole part as it was published", () => {
        expect(formatSectionText(parts.slice(0, 3))).toBe("Ael Thas");
        expect(formatSectionText([{ key: "family", text: "de Lune", kind: "whole" }])).toBe("de Lune");
    });

    it("splits a name at its surname, each section's text read from its parts and with its shape", () => {
        const family = { key: "family", role: "family name", text: "Galanodel", section: "family", kind: "whole" };
        const result = {
            name: "Ael Thas Galanodel",
            shape: ["prefix", " ", "suffix"],
            parts: [...parts.slice(0, 3), family]
        };
        expect(sectionsOf(result)).toEqual({
            given: { text: "Ael Thas", parts: parts.slice(0, 3), shape: result.shape },
            family: { text: "Galanodel", parts: [family], shape: undefined }
        });
        const built = { ...result, name: "Ael Thas Gal", familyShape: ["prefix"], parts };
        expect(sectionsOf(built).family).toEqual({ text: "Gal", parts: [parts[3]], shape: ["prefix"] });
    });

    it("keeps the space 4.1.5 saved before the surname out of the first name's section", () => {
        const stored = [...parts.slice(0, 3), { key: "s3", role: "space", text: " ", section: "given" }, parts[3]];
        expect(sectionsOf({ parts: stored })).toMatchObject({
            given: { text: "Ael Thas", parts: parts.slice(0, 3) },
            family: { text: "Gal", parts: [parts[3]] }
        });
    });
});

describe("part builders", () => {
    const entry = { female: ["ra"], male: ["ran"], meaning: "Lord/Lady", sources: [{ title: "Book" }] };
    const FAMILY_SLOT = { section: "family", rolePrefix: "family " };

    it("puts a component in a slot with its key, role, section and kind, keeping its own fields", () => {
        const component = { text: "dor", method: METHOD.SPLIT, from: ["Dorn"] };
        expect(slotPart(component, "t0", "prefix", GIVEN_SLOT)).toEqual({
            ...component,
            key: "t0",
            role: "prefix",
            section: "given",
            kind: "prefix"
        });
        expect(slotPart(component, "n1", "suffix", FAMILY_SLOT)).toMatchObject({
            role: "family suffix",
            section: "family"
        });
    });

    it("makes a table part of one spelling, with the entry's meaning and sources", () => {
        expect(tablePart(entry, "ra", "t1", "suffix", GIVEN_SLOT)).toEqual({
            key: "t1",
            role: "suffix",
            text: "ra",
            meaning: "Lord/Lady",
            sources: entry.sources,
            section: "given",
            kind: "suffix"
        });
    });

    it("makes a published name one whole part", () => {
        const house = { text: "Baenre", sources: [{ title: "Book" }], meaning: "not carried" };
        expect(publishedPart(house, "house", "house", "family")).toEqual({
            key: "house",
            role: "house",
            text: "Baenre",
            method: "published",
            sources: house.sources,
            section: "family",
            kind: "whole"
        });
    });

    it("names the three ways a part is made with the values saved names store", () => {
        expect(METHOD).toEqual({ PUBLISHED: "published", SPLIT: "split", COMPOSED: "composed" });
    });

    it("names sections and kinds with the values saved names store", () => {
        expect(SECTION).toEqual({ GIVEN: "given", FAMILY: "family", PHRASE: "phrase" });
        expect(KIND).toEqual({ PREFIX: "prefix", SUFFIX: "suffix", WHOLE: "whole", JOINT: "joint" });
    });
});

describe("structure controls and sections", () => {
    it("describe every control once: its analytics value and the words of its + and - buttons", () => {
        for (const control of Object.values(NAME_STRUCTURE_CONTROL)) {
            const { analytics, addLabel, removeLabel } = STRUCTURE_CONTROLS[control];
            expect(analytics).toMatch(/^[a-z_]+$/);
            expect(addLabel).toMatch(/^Add /);
            expect(removeLabel).toMatch(/^Remove /);
        }
        expect(Object.keys(STRUCTURE_CONTROLS)).toHaveLength(Object.keys(NAME_STRUCTURE_CONTROL).length);
    });

    it("give every section a distinct analytics value", () => {
        const values = Object.values(SECTION).map((section) => SECTION_ANALYTICS[section]);
        values.forEach((value) => expect(value).toMatch(/^[a-z_]+$/));
        expect(new Set(values).size).toBe(values.length);
    });
});

describe("formatPartLabel", () => {
    it("names a surname by what it is: a family name or a house name", () => {
        const labels = ["family name", "family prefix", "family suffix", "house", "house prefix", "house suffix"].map(
            (role) => formatPartLabel({ role })
        );
        expect(labels).toEqual([
            "family name",
            "family name prefix",
            "family name suffix",
            "house name",
            "house name prefix",
            "house name suffix"
        ]);
    });

    it("uses any other role as it reads", () => {
        expect(["prefix", "suffix", "first name", "parent's name"].map((role) => formatPartLabel({ role }))).toEqual([
            "prefix",
            "suffix",
            "first name",
            "parent's name"
        ]);
    });
});

describe("isSlotComponent and hasKnownMeaning", () => {
    const table = { kind: KIND.PREFIX, meaning: "Song" };

    it("counts only prefixes and suffixes as slot components", () => {
        expect([KIND.PREFIX, KIND.SUFFIX, KIND.WHOLE, KIND.JOINT].map((kind) => isSlotComponent({ kind }))).toEqual([
            true,
            true,
            false,
            false
        ]);
    });

    it("knows a table component's meaning, a translation, a phrase's meaning and a Common-form compound", () => {
        const known = [
            table,
            { kind: KIND.WHOLE, meaning: "Moonwhisper", meaningSource: "Player's Handbook (5e)" },
            { kind: KIND.SUFFIX, wordMeaning: "Blessed by fell powers" },
            { kind: KIND.WHOLE, method: METHOD.COMPOSED }
        ];
        expect(known.map(hasKnownMeaning)).toEqual([true, true, true, true]);
    });

    it("knows no meaning for a split component, a published name without a translation, or a joint", () => {
        const unknown = [
            { ...table, method: METHOD.SPLIT },
            { kind: KIND.PREFIX },
            { kind: KIND.WHOLE, method: METHOD.PUBLISHED, meaning: "untranslated" },
            { kind: KIND.JOINT }
        ];
        expect(unknown.map(hasKnownMeaning)).toEqual([false, false, false, false]);
    });
});

describe("isSamePart", () => {
    const ro = { key: "t0", role: "suffix", text: "ro", meaning: "Summer", section: "given", kind: "suffix" };
    it("tells apart two table entries with one spelling by their meaning", () => {
        expect(isSamePart(ro, { ...ro })).toBe(true);
        expect(isSamePart(ro, { ...ro, meaning: "Walker, Walks" })).toBe(false);
    });
    it("tells apart a table entry and a split component with the same letters", () => {
        const bare = { ...ro, meaning: undefined };
        expect(isSamePart(bare, { ...bare, method: "split", from: ["Rolen"] })).toBe(false);
        expect(isSamePart(ro, { ...ro, text: "ra" })).toBe(false);
    });
});

describe("selectRollShape", () => {
    const part = (kind, role = kind) => ({ kind, role });

    it("draws by weight when nothing is locked", () => {
        // weights 4/3/2/1: a draw of 0.0 lands on the first shape, 0.95 on the last
        expect(selectRollShape(shapes, {}, "t", fixedRandom(0))).toEqual(SHORT);
        expect(selectRollShape(shapes, {}, "t", fixedRandom(0.95))).toEqual(APOSTROPHE);
    });

    it("only offers the shapes whose locked slots are still the same kind of component", () => {
        // a locked prefix in the first slot rules out the shape that starts with a suffix
        const results = [0, 0.3, 0.6, 0.95].map((draw) =>
            selectRollShape(shapes, { t0: part("prefix") }, "t", fixedRandom(draw))
        );
        expect(results).not.toContainEqual(APOSTROPHE);
        // a locked third slot that is a suffix leaves only the long shape
        expect(selectRollShape(shapes, { t2: part("suffix") }, "t", fixedRandom(0.9))).toEqual(LONG);
    });

    it("lets the shapes that remain share the draw, in their usual proportions", () => {
        // with the apostrophe shape out, the weights 4/3/2 total 9: 0.5 falls in the second shape (4/9 to 7/9)
        expect(selectRollShape(shapes, { t0: part("prefix") }, "t", fixedRandom(0.5))).toEqual(LONG);
    });

    it("treats a surname's 'family prefix' as a prefix, and ignores other slots and locks of other keys", () => {
        expect(
            selectRollShape(shapes, { n0: part("prefix", "family prefix"), t1: part("prefix") }, "n", fixedRandom(0.95))
        ).toEqual(COMPOUND);
    });

    it("decides by the part's kind, whatever its role label says", () => {
        const renamed = part("prefix", "family opening");
        expect(selectRollShape(shapes, { t0: renamed }, "t", fixedRandom(0.95))).toEqual(COMPOUND);
        expect(selectRollShape(shapes, { t0: part("suffix", "prefix") }, "t", fixedRandom(0))).toEqual(APOSTROPHE);
        expect(selectRollShape(shapes, { t2: part("suffix", "ending") }, "t", fixedRandom(0.9))).toEqual(LONG);
    });

    it("says so when no shape keeps the locks", () => {
        expect(() => selectRollShape(shapes, { t0: part("suffix"), t1: part("suffix") }, "t", fixedRandom(0))).toThrow(
            /No name shape keeps the locked parts/
        );
    });
});

describe("getChangedShape", () => {
    it("lengthens a short name and shortens a long one", () => {
        expect(change("given", SHORT)).toEqual(LONG);
        expect(change("given", LONG)).toEqual(SHORT);
    });

    it("never shortens a long name past a locked last suffix, but locks elsewhere do not matter", () => {
        expect(change("given", LONG, "t2")).toBeNull();
        expect(change("given", LONG, "t0", "t1")).toEqual(SHORT);
        expect(change("given", SHORT, "t0", "t1")).toEqual(LONG); // growth only appends
    });

    it("adds a compound name to a short name, or to a long one whose extra suffix is free", () => {
        expect(change("compound", SHORT)).toEqual(COMPOUND);
        expect(change("compound", LONG)).toEqual(COMPOUND);
        expect(change("compound", LONG, "t2")).toBeNull();
    });

    it("removes a compound name unless one of its slots is locked", () => {
        expect(change("compound", COMPOUND)).toEqual(SHORT);
        expect(change("compound", COMPOUND, "t3")).toBeNull();
        expect(change("compound", COMPOUND, "t4")).toBeNull();
        expect(change("compound", COMPOUND, "t0", "t1")).toEqual(SHORT);
    });

    it("offers no length or compound change on a shape that is not short, long or two-word", () => {
        expect(change("given", APOSTROPHE)).toBeNull();
        expect(change("compound", APOSTROPHE)).toBeNull();
        expect(change("given", undefined)).toBeNull();
    });

    it("reads locks by the key prefix it is given", () => {
        expect(getChangedShape("surname", LONG, locked("n2"), "n", NAMES)).toBeNull();
        expect(getChangedShape("surname", LONG, locked("t2"), "n", NAMES)).toEqual(SHORT);
    });
});

describe("getKeptParts", () => {
    const parts = ["t0", "t1", "tj1", "t2", "s2", "t3", "n0", "nj1", "family"].map((key) => ({ key }));

    it("keeps the first word's prefix and suffix and the joining letters of that section, by key", () => {
        expect(Object.keys(getKeptParts(parts, "t"))).toEqual(["t0", "t1", "tj1"]);
        expect(Object.keys(getKeptParts(parts, "n"))).toEqual(["n0", "nj1"]);
    });
});

describe("isEveryPartLocked", () => {
    const result = { parts: [{ key: "t0" }, { key: "j0", kind: "joint" }, { key: "t1" }] };

    it("is true only when every part but a joint is locked", () => {
        expect(isEveryPartLocked(result, new Set(["t0", "t1"]))).toBe(true);
        expect(isEveryPartLocked(result, new Set(["t0"]))).toBe(false);
    });

    it("is false before there is a name", () => {
        expect(isEveryPartLocked(null, new Set(["t0"]))).toBe(false);
    });
});

describe("getLocks", () => {
    const parts = [{ key: "t0" }, { key: "t1" }, { key: "family" }];
    const result = { parts, shape: ["prefix", "suffix"], sex: "female" };

    it("is empty when nothing is locked or there is no result", () => {
        expect(getLocks(result, new Set())).toEqual({});
        expect(getLocks(null, new Set(["t0"]))).toEqual({});
    });

    it("keeps the locked parts by key, with the shape and sex that let them keep their places", () => {
        expect(getLocks(result, new Set(["t1", "family"]))).toEqual({
            t1: parts[1],
            family: parts[2],
            shape: result.shape,
            sex: "female"
        });
    });

    it("keeps a table-built surname's shape too, and leaves out a shape the result does not have", () => {
        const surnamed = { parts, familyShape: ["prefix", "suffix"] };
        expect(getLocks(surnamed, new Set(["t0"]))).toEqual({ t0: parts[0], familyShape: surnamed.familyShape });
    });
});

describe("getAvailableControls", () => {
    const controls = { given: { isOn: (r) => r.long }, compound: { isOn: () => false } };

    const generatorWhere = (isAvailable) => ({
        generateStructureChange: (result, control, options) =>
            isAvailable(control, options) ? { changed: true } : null
    });

    it("lists the controls whose change builds, with their current state, in order", () => {
        const all = generatorWhere(() => true);
        expect(getAvailableControls(controls, { long: true }, all, new Set(), {})).toEqual([
            { control: "given", on: true },
            { control: "compound", on: false }
        ]);
        const onlyCompound = generatorWhere((control) => control === "compound");
        expect(getAvailableControls(controls, { long: true }, onlyCompound, new Set(), {})).toEqual([
            { control: "compound", on: false }
        ]);
        expect(
            getAvailableControls(
                controls,
                {},
                generatorWhere(() => false),
                new Set(),
                {}
            )
        ).toEqual([]);
    });

    it("tries each change with the locked keys and the caller's options", () => {
        const seen = [];
        const generator = generatorWhere((control, options) => seen.push([control, options]));
        const locked = new Set(["t0"]);
        getAvailableControls(controls, {}, generator, locked, { expanded: true });
        expect(seen).toEqual([
            ["given", { expanded: true, locked }],
            ["compound", { expanded: true, locked }]
        ]);
    });
});
