import { describe, expect, it } from "vitest";
import { SCHEMA, loadSpeciesData } from "../../js/core/speciesData.js";

// A species description with two lineages and the sources' words for them.
const species = { lineageWords: { elf: [], wild: ["wood-elf"], high: ["sun-elf", "moon-elf"], drow: ["drow"] } };
const file = (changes = {}) => ({
    schema: SCHEMA,
    sources: {
        phb: { title: "Player's Handbook", authority: "official" },
        ed: { title: "forum answer by Ed Greenwood", authority: "creator" },
        frcs: { title: "Forgotten Realms Campaign Setting", authority: "official" }
    },
    names: [
        { text: "Ilsevel", type: "given", form: "elvish", sources: ["ed", "frcs", "phb"] },
        { text: "Aerith", type: "given", form: "elvish", sources: ["phb"] },
        {
            text: "Galanodel",
            type: "family",
            form: "elvish",
            meaning: "Moonwhisper",
            meaningSource: "phb",
            sources: ["phb"]
        }
    ],
    tables: [{ type: "given", sources: ["frcs", "phb"], prefixes: [], suffixes: [] }],
    words: [{ text: "moon", use: "common-first", lineages: ["high"] }],
    ...changes
});
const load = (changes) => loadSpeciesData(file(changes), species);
const titles = (sources) => sources.map((source) => source.title);

describe("loadSpeciesData", () => {
    it("refuses a file in another shape, such as a stale cached copy of the old two-file data", () => {
        expect(() => load({ schema: undefined })).toThrow(/schema/);
        expect(() => load({ schema: SCHEMA + 1 })).toThrow(/schema/);
        // a file that is not name data at all is refused the same way, not with a crash
        expect(() => loadSpeciesData(null, species)).toThrow(/has schema undefined/);
    });

    it("gives every name its sources by title: official books first, the book giving most names first", () => {
        const [ilsevel] = load().names;
        expect(titles(ilsevel.sources)).toEqual([
            "Player's Handbook",
            "Forgotten Realms Campaign Setting",
            "forum answer by Ed Greenwood"
        ]);
        expect(ilsevel.sources[0]).toEqual({ title: "Player's Handbook", authority: "official" });
        // the file lists the Player's Handbook first, but the Campaign Setting gives more names here
        const names = [
            { text: "Ilsevel", type: "given", sources: ["ed", "phb", "frcs"] },
            { text: "Aerith", type: "given", sources: ["frcs"] }
        ];
        expect(titles(load({ names }).names[0].sources)).toEqual([
            "Forgotten Realms Campaign Setting",
            "Player's Handbook",
            "forum answer by Ed Greenwood"
        ]);
    });

    it("puts books that give as many names in the order the file lists its sources", () => {
        const names = [{ text: "Ilsevel", type: "given", sources: ["frcs", "phb"] }];
        expect(titles(load({ names }).names[0].sources)).toEqual([
            "Player's Handbook",
            "Forgotten Realms Campaign Setting"
        ]);
    });

    it("lists every source in that order, for lists made from several names", () => {
        expect(titles(load().sources)).toEqual([
            "Player's Handbook",
            "Forgotten Realms Campaign Setting",
            "forum answer by Ed Greenwood"
        ]);
    });

    it("gives a table its sources in the same order as a name's, and resolves a translation's source", () => {
        const data = load();
        expect(titles(data.tables[0].sources)).toEqual(["Player's Handbook", "Forgotten Realms Campaign Setting"]);
        expect(data.names[2].meaningSource).toBe("Player's Handbook");
    });

    it("refuses an unknown source id or authority", () => {
        expect(() => load({ names: [{ text: "Ilsevel", type: "given", sources: ["dmg"] }] })).toThrow(/dmg/);
        expect(() => load({ tables: [{ type: "given", sources: ["dmg"], prefixes: [], suffixes: [] }] })).toThrow(
            /dmg/
        );
        const sources = {
            ...file().sources,
            frcs: { title: "Forgotten Realms Campaign Setting", authority: "rumour" }
        };
        expect(() => load({ sources })).toThrow(/frcs.*authority/);
    });

    it("translates the sources' lineage words into the app's lineages", () => {
        const names = [
            { text: "Ilsevel", type: "given", lineages: ["wild"], sources: ["phb"] },
            { text: "Drizzt", type: "given", lineages: ["drow", "elf"], sources: ["phb"] },
            { text: "Aerith", type: "given", sources: ["phb"] }
        ];
        const [ilsevel, drizzt, aerith] = load({ names }).names;
        expect(ilsevel).toMatchObject({ lineages: ["wood-elf"], generic: false });
        // "elf" alone ties a name to no particular lineage, and a file leaves that word out
        expect(drizzt).toMatchObject({ lineages: ["drow"], generic: true });
        expect(aerith).toMatchObject({ lineages: [], generic: true });
        expect(load().words[0]).toMatchObject({ lineages: ["sun-elf", "moon-elf"], generic: false });
    });

    it("refuses a lineage word the species does not know", () => {
        const words = [{ text: "moon", use: "common-first", lineages: ["dimernesti"] }];
        expect(() => load({ words })).toThrow(/dimernesti/);
    });

    it("cuts the split components from the names it publishes; the file carries none", () => {
        const { split } = load();
        expect(split.given.endings.map((item) => item.text)).toEqual(["rith", "sevel", "vel"]);
        expect(split.given.endings[0].from).toEqual(["Aerith"]);
        expect(split.family.endings.map((item) => item.text)).toEqual(["del", "lanodel", "nodel"]);
    });
});
