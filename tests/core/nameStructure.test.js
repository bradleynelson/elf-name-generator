import { describe, expect, it } from "vitest";
import {
    getAvailableControls,
    getChangedShape,
    getKeptParts,
    getLocks,
    getSlotNumber,
    sameShape,
    selectRollShape
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

describe("selectRollShape", () => {
    const part = (role) => ({ role });

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
            selectRollShape(shapes, { n0: part("family prefix"), t1: part("prefix") }, "n", fixedRandom(0.95))
        ).toEqual(COMPOUND);
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
