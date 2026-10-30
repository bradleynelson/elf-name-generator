import { describe, expect, it } from "vitest";
import { joinsCleanly, SplitComponents } from "../../js/core/splitComponents.js";

// Components cut from made-up published names (not the real data): the rules for offering them, by slot and sex.
const opening = (text, ...from) => ({ text, from });
const ending = (text, sex, ...from) => ({ text, sex, from });

describe("joinsCleanly", () => {
    const clusters = new Set(["rn"]);

    it("accepts a join of one consonant or none, whatever the clusters", () => {
        expect(joinsCleanly("ael", "uin", clusters)).toBe(true); // "l" then a vowel
        expect(joinsCleanly("ae", "luin", clusters)).toBe(true); // a vowel then "l"
        expect(joinsCleanly("ae", "uin", clusters)).toBe(true); // no consonant at all
    });

    it("accepts a longer run of consonants only when it occurs inside a published name", () => {
        expect(joinsCleanly("ar", "nin", clusters)).toBe(true);
        expect(joinsCleanly("ar", "tin", clusters)).toBe(false);
        expect(joinsCleanly("ar", "nin", new Set())).toBe(false);
    });

    it("counts accented and y vowels as vowels", () => {
        expect(joinsCleanly("ár", "yn", new Set())).toBe(true);
        expect(joinsCleanly("ar", "ün", new Set())).toBe(true);
    });
});

describe("SplitComponents availability", () => {
    it("is unavailable without data, and with only one of openings and endings", () => {
        expect(new SplitComponents().isAvailable).toBe(false);
        expect(new SplitComponents({}).isAvailable).toBe(false);
        expect(new SplitComponents({ openings: [opening("ael", "Aelar")] }).isAvailable).toBe(false);
        expect(new SplitComponents({ endings: [ending("ar", "male", "Aelar")] }).isAvailable).toBe(false);
    });

    it("is available when it has both", () => {
        const data = { openings: [opening("ael", "Aelar")], endings: [ending("ar", "male", "Aelar")] };
        expect(new SplitComponents(data).isAvailable).toBe(true);
    });

    it("starts with no join clusters unless given some", () => {
        expect(new SplitComponents().clusters.size).toBe(0);
        expect([...new SplitComponents({ joinClusters: ["rn", "th"] }).clusters]).toEqual(["rn", "th"]);
    });
});

describe("SplitComponents.componentsFor", () => {
    const data = {
        openings: [opening("ael", "Aelar", "Aelin"), opening("Sy", "Syl")],
        endings: [
            ending("ar", "male", "Aelar"),
            ending("wen", "female", "Arwen"),
            ending("iel", "female", "Daniel"),
            ending("iel", "male", "Gabriel"),
            ending("or", "male", "Vendor")
        ]
    };
    const publishedNames = [
        { text: "Aelar", source: { title: "Book One" } },
        { text: "Aelin", source: { title: "Book Two" } },
        { text: "Arwen", source: { title: "Book One" } },
        { text: "Syl" } // a published name that does not say where it appears
    ];
    const texts = (components) => components.map((component) => component.text);

    it("offers every opening for a prefix slot and tags each as a split component with its sources and books", () => {
        const components = new SplitComponents(data, {}, publishedNames).componentsFor("prefix");
        expect(components).toEqual([
            { text: "ael", from: ["Aelar", "Aelin"], books: ["Book One", "Book Two"], method: "split" },
            { text: "Sy", from: ["Syl"], books: [], method: "split" }
        ]);
    });

    it("lists only the endings published with a gender, and every ending when there is none", () => {
        const splits = new SplitComponents(data);
        expect(texts(splits.componentsFor("suffix", "female"))).toEqual(["wen", "iel"]);
        expect(texts(splits.componentsFor("suffix", "male"))).toEqual(["ar", "iel", "or"]);
        expect(texts(splits.componentsFor("suffix"))).toEqual(["ar", "wen", "iel", "iel", "or"]);
    });

    it("gives a neutral name only the endings found on both female and male names, once each", () => {
        const neutral = new SplitComponents(data).componentsFor("suffix", "neutral");
        expect(neutral).toEqual([{ text: "iel", from: ["Daniel", "Gabriel"], books: [], method: "split" }]);
    });

    it("lists the sources of a shared ending once each", () => {
        const shared = {
            openings: data.openings,
            endings: [ending("iel", "female", "Ariel"), ending("iel", "male", "Ariel", "Gabriel")]
        };
        expect(new SplitComponents(shared).componentsFor("suffix", "neutral")[0].from).toEqual(["Ariel", "Gabriel"]);
    });

    it("leaves out components whose text the name tables already offer, ignoring case", () => {
        const splits = new SplitComponents(data, { prefix: new Set(["sy"]), suffix: new Set(["ar"]) });
        expect(texts(splits.componentsFor("prefix"))).toEqual(["ael"]);
        expect(texts(splits.componentsFor("suffix", "male"))).toEqual(["iel", "or"]);
    });

    it("applies the table texts of the slot asked for only", () => {
        const splits = new SplitComponents(data, { suffix: new Set(["ael"]) });
        expect(texts(splits.componentsFor("prefix"))).toEqual(["ael", "Sy"]);
    });

    it("names the books of the sources it knows, without gaps or repeats, and copes with names lacking a source", () => {
        const names = [
            { text: "Aelar", source: { title: "Book One" } },
            { text: "Aelin", source: { title: "Book One" } },
            { text: "Syl", source: undefined }
        ];
        const splits = new SplitComponents(data, {}, names);
        expect(splits.componentsFor("prefix")[0].books).toEqual(["Book One"]);
        expect(splits.componentsFor("prefix")[1].books).toEqual([]);
    });

    it("says what is missing when no component is left for a slot", () => {
        const splits = new SplitComponents(data, { prefix: new Set(["ael", "sy"]) });
        const missing = (what) => new Error(`No published name components for a ${what}`);
        expect(() => splits.componentsFor("prefix")).toThrow(missing("prefix"));
        expect(() => splits.componentsFor("prefix", "female")).toThrow(missing("prefix (female)"));
        const onlyMale = new SplitComponents({ openings: data.openings, endings: [ending("ar", "male", "Aelar")] });
        expect(() => onlyMale.componentsFor("suffix", "female")).toThrow(missing("suffix (female)"));
        expect(() => onlyMale.componentsFor("suffix", "neutral")).toThrow(missing("suffix (neutral)"));
    });

    it("answers the same slot and sex again with the same list", () => {
        const splits = new SplitComponents(data);
        expect(splits.componentsFor("suffix", "male")).toBe(splits.componentsFor("suffix", "male"));
        expect(splits.componentsFor("suffix", "male")).not.toBe(splits.componentsFor("suffix", "female"));
    });
});
