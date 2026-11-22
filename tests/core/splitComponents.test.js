import { describe, expect, it } from "vitest";
import { cutPublishedNames, joinsCleanly, SplitComponents } from "../../js/core/splitComponents.js";

// Components cut from made-up published names (not the real data): the rules for offering them, by slot and sex. The
// data gives each component once with every name it was cut from; the names give the sex and the books.
const cut = (text, ...from) => ({ text, from });
const book = (title) => ({ title, authority: "official" });
const named = (text, sex, sources = []) => ({ text, ...(sex ? { sex } : {}), sources });

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
    const names = [named("Aelar", "male")];
    const options = { names, sources: [] };
    it("is unavailable without data, and with only one of openings and endings", () => {
        expect(new SplitComponents({}, options).isAvailable).toBe(false);
        expect(new SplitComponents({}, options).isAvailable).toBe(false);
        expect(new SplitComponents({ openings: [cut("ael", "Aelar")] }, options).isAvailable).toBe(false);
        expect(new SplitComponents({ endings: [cut("ar", "Aelar")] }, options).isAvailable).toBe(false);
    });

    it("is available when it has both", () => {
        const split = { openings: [cut("ael", "Aelar")], endings: [cut("ar", "Aelar")] };
        expect(new SplitComponents(split, options).isAvailable).toBe(true);
    });

    it("starts with no join clusters unless given some, and keeps those cut from its own names", () => {
        expect(new SplitComponents({}, options).clusters.size).toBe(0);
        const joins = [cut("rn", "Aelar"), cut("th", "Aelar"), cut("zz", "Drizzt")];
        expect([...new SplitComponents({ joins }, options).clusters]).toEqual(["rn", "th"]);
    });
});

describe("SplitComponents.componentsFor", () => {
    const sources = [book("Book One"), book("Book Two"), book("Book Three")];
    const [one, two, three] = sources;
    const split = {
        openings: [cut("ael", "Aelar", "Aelin"), cut("Sy", "Syl"), cut("vel", "Velkyn")],
        endings: [
            cut("ar", "Aelar"),
            cut("wen", "Arwen"),
            cut("iel", "Daniel", "Gabriel"),
            cut("in", "Aelin"),
            cut("or", "Vendor")
        ]
    };
    // the names of this pool: Velkyn belongs to another (a drow name, say), so its components are not offered
    const names = [
        named("Aelar", "male", [two, one]),
        named("Aelin", undefined, [two]),
        named("Arwen", "female", [one]),
        named("Syl", undefined, []),
        named("Daniel", "female"),
        named("Gabriel", "male"),
        named("Vendor", "unisex")
    ];
    const splitsFor = (tableTexts) => new SplitComponents(split, { names, tableTexts, sources });
    const texts = (components) => components.map((component) => component.text);

    it("offers every opening of its names for a prefix slot, each a split component with its names and their books", () => {
        expect(splitsFor().componentsFor("prefix")).toEqual([
            { text: "ael", from: ["Aelar", "Aelin"], sources: [one, two], method: "split" },
            { text: "Sy", from: ["Syl"], sources: [], method: "split" }
        ]);
    });

    it("gives an ending the sex of the names it was cut from, and every ending when there is no sex", () => {
        const splits = splitsFor();
        expect(texts(splits.componentsFor("suffix", "female"))).toEqual(["wen", "iel", "or"]);
        expect(texts(splits.componentsFor("suffix", "male"))).toEqual(["ar", "iel", "or"]);
        expect(texts(splits.componentsFor("suffix"))).toEqual(["ar", "wen", "iel", "in", "or"]);
        // a female ending cites only the female names it was cut from
        expect(splits.componentsFor("suffix", "female")[1].from).toEqual(["Daniel"]);
    });

    it("gives a neutral name only the endings found on both female and male names, with all their names", () => {
        const neutral = splitsFor().componentsFor("suffix", "neutral");
        expect(neutral.map((c) => [c.text, c.from])).toEqual([
            ["iel", ["Daniel", "Gabriel"]],
            ["or", ["Vendor"]]
        ]);
    });

    it("cites at most the first five names a component was cut from, and their books", () => {
        const many = ["Aelar", "Aelin", "Arwen", "Daniel", "Gabriel", "Vendor"];
        const splits = new SplitComponents({ openings: [cut("a", ...many)] }, { names, sources });
        const [component] = splits.componentsFor("prefix");
        expect(component.from).toEqual(many.slice(0, 5));
        expect(component.sources).toEqual([one, two]);
        expect(component.sources).not.toContain(three);
    });

    it("leaves out components whose text the name tables already offer, ignoring case", () => {
        const splits = splitsFor({ prefix: new Set(["sy"]), suffix: new Set(["ar"]) });
        expect(texts(splits.componentsFor("prefix"))).toEqual(["ael"]);
        expect(texts(splits.componentsFor("suffix", "male"))).toEqual(["iel", "or"]);
    });

    it("applies the table texts of the slot asked for only", () => {
        expect(texts(splitsFor({ suffix: new Set(["ael"]) }).componentsFor("prefix"))).toEqual(["ael", "Sy"]);
    });

    it("says what is missing when no component is left for a slot", () => {
        const splits = splitsFor({ prefix: new Set(["ael", "sy"]) });
        const missing = (what) => new Error(`No published name components for a ${what}`);
        expect(() => splits.componentsFor("prefix")).toThrow(missing("prefix"));
        expect(() => splits.componentsFor("prefix", "female")).toThrow(missing("prefix (female)"));
        const onlyMale = new SplitComponents(
            { openings: split.openings, endings: [cut("ar", "Aelar")] },
            { names, sources }
        );
        expect(() => onlyMale.componentsFor("suffix", "female")).toThrow(missing("suffix (female)"));
        expect(() => onlyMale.componentsFor("suffix", "neutral")).toThrow(missing("suffix (neutral)"));
    });

    it("answers the same slot and sex again with the same list", () => {
        const splits = splitsFor();
        expect(splits.componentsFor("suffix", "male")).toBe(splits.componentsFor("suffix", "male"));
        expect(splits.componentsFor("suffix", "male")).not.toBe(splits.componentsFor("suffix", "female"));
    });
});

describe("cutPublishedNames", () => {
    const given = (text, more = {}) => ({ text, type: "given", form: "elvish", sources: [], ...more });
    const family = (text, more = {}) => ({ text, type: "family", form: "elvish", sources: [], ...more });
    const cutGiven = (...names) => cutPublishedNames(names).given;

    it("cuts a name at each syllable boundary, before the last consonant of a cluster", () => {
        expect(cutGiven(given("Aelar"))).toEqual({
            openings: [{ text: "ae", from: ["Aelar"] }],
            endings: [{ text: "lar", from: ["Aelar"] }],
            joins: [{ text: "l", from: ["Aelar"] }]
        });
        const { openings, endings } = cutGiven(given("Galadriel"));
        expect(openings).toEqual([
            { text: "ga", from: ["Galadriel"] },
            { text: "galad", from: ["Galadriel"] }
        ]);
        expect(endings).toEqual([
            { text: "ladriel", from: ["Galadriel"] },
            { text: "riel", from: ["Galadriel"] }
        ]);
    });

    it.each(["th", "sh", "ph", "ch", "kh", "gh", "rh", "lh", "wh", "zh"])(
        "keeps the consonant sound %s together at the start of an ending",
        (sound) => {
            expect(cutGiven(given(`El${sound}ar`)).endings).toEqual([{ text: `${sound}ar`, from: [`El${sound}ar`] }]);
        }
    );

    it("does not cut inside the consonants a name starts with", () => {
        expect(cutGiven(given("Thrandor")).openings.map((item) => item.text)).toEqual(["thran"]);
    });

    it("gives no joins for a name with no consonant inside it", () => {
        expect(cutGiven(given("Leo")).joins).toEqual([]);
    });

    it("keeps a two-letter consonant sound together at the start of an ending", () => {
        expect(cutGiven(given("Elthar")).endings).toEqual([{ text: "thar", from: ["Elthar"] }]);
        expect(cutGiven(given("Arwen")).endings).toEqual([{ text: "wen", from: ["Arwen"] }]);
    });

    it("makes no opening or ending shorter than two letters, nor cuts at the first or last letters", () => {
        expect(cutGiven(given("Ithil"), given("Abe"))).toMatchObject({ openings: [], endings: [] });
    });

    it("counts y and accented letters as vowels", () => {
        expect(cutGiven(given("Amné")).endings).toEqual([{ text: "né", from: ["Amné"] }]);
        expect(cutGiven(given("Sylvar")).openings).toEqual([{ text: "syl", from: ["Sylvar"] }]);
    });

    it("gives as joins the consonant runs inside a name, not at its first or last letter", () => {
        expect(cutGiven(given("Galadriel")).joins).toEqual([
            { text: "dr", from: ["Galadriel"] },
            { text: "l", from: ["Galadriel"] }
        ]);
    });

    it("gives each component once, in order, with every name it was cut from, each once and in order", () => {
        const { endings } = cutGiven(given("Tilar"), given("Aelar"), given("Aelar", { lineages: ["drow"] }));
        expect(endings).toEqual([{ text: "lar", from: ["Aelar", "Tilar"] }]);
    });

    it("cuts no name with an apostrophe, nor a Common-form one", () => {
        expect(cutGiven(given("Ky'lar"), given("Silverhair", { form: "common" }))).toEqual({
            openings: [],
            endings: [],
            joins: []
        });
    });

    it("cuts an Elvish-form name that happens to hold an English word", () => {
        expect(cutGiven(given("Chandra")).openings.map((item) => item.text)).toEqual(["chand"]);
    });

    it("cuts given names and Elvish family names apart, and no drow house", () => {
        const cut = cutPublishedNames([
            given("Aelar"),
            family("Tilarel"),
            { text: "Baenre", type: "house", sources: [] }
        ]);
        expect(cut.given.openings.map((item) => item.text)).toEqual(["ae"]);
        expect(cut.family.openings.map((item) => item.text)).toEqual(["ti", "tila"]);
        expect(cutPublishedNames([family("Eveningbow", { form: "common" })]).family.endings).toEqual([]);
    });
});
