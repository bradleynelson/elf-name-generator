import { describe, expect, it } from "vitest";
import {
    createPublishedLookup,
    filterPartOptions,
    generateName,
    takesPublishedFamily,
    takesSplitComponent,
    weightByLineage
} from "../../js/core/nameRolls.js";
import { RecentNames } from "../../js/core/random.js";

const always = (value) => () => value;

describe("the shares of a roll", () => {
    it("takes a split component on half the draws: below one half, not at it", () => {
        expect(takesSplitComponent(always(0.4999))).toBe(true);
        expect(takesSplitComponent(always(0.5))).toBe(false);
    });

    it("takes a published family name on half the draws: below one half, not at it", () => {
        expect(takesPublishedFamily(always(0.4999))).toBe(true);
        expect(takesPublishedFamily(always(0.5))).toBe(false);
    });
});

describe("weightByLineage", () => {
    it("weighs an entry tied to the lineage by its own weight and any other entry as one", () => {
        const weight = weightByLineage("sun-elf", 3);
        expect(weight({ lineages: ["moon-elf", "sun-elf"] })).toBe(3);
        expect(weight({ lineages: ["moon-elf"] })).toBe(1);
        expect(weight({ lineages: [] })).toBe(1);
    });
});

describe("createPublishedLookup", () => {
    const sources = [{ title: "Book", authority: "official" }];
    const findPublished = createPublishedLookup([{ text: "Aelar", sources }]);

    it("marks a text that matches a published name, in any case, with that name's sources", () => {
        expect(findPublished("aelar")).toEqual({ published: { sources } });
        expect(findPublished("AELAR")).toEqual({ published: { sources } });
    });

    it("adds nothing for a text no published name matches", () => {
        expect(findPublished("Aelara")).toEqual({});
    });

    it("carries only the published name's sources", () => {
        expect(Object.keys(findPublished("Aelar").published)).toEqual(["sources"]);
    });
});

describe("generateName", () => {
    it("returns the first name not used recently, and remembers it", () => {
        const recent = new RecentNames();
        recent.add("Aelar");
        const names = ["Aelar", "Bryn"];
        expect(generateName(() => ({ name: names.shift() }), recent, "an elf name").name).toBe("Bryn");
        expect(recent.has("Bryn")).toBe(true);
    });

    it("says what it could not make when every attempt breaks a rule", () => {
        expect(() => generateName(() => null, new RecentNames(), "a dwarf name")).toThrow(
            "Could not make a dwarf name with these choices. Try unlocking a part."
        );
    });
});

describe("filterPartOptions", () => {
    it("offers only the choices the generator's part change accepts", () => {
        const asked = [];
        const generator = {
            generatePartChange: (result, key, option) => {
                asked.push([result.name, key]);
                return option.text === "ok" ? result : null;
            }
        };
        const options = [{ text: "ok" }, { text: "no" }];
        expect(filterPartOptions(generator, { name: "Aelar" }, "t0", options)).toEqual([{ text: "ok" }]);
        expect(asked).toEqual([
            ["Aelar", "t0"],
            ["Aelar", "t0"]
        ]);
    });
});
