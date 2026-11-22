import { describe, expect, it } from "vitest";
import { DrowNameGenerator } from "../../js/core/DrowNameGenerator.js";
import { ElfNameGenerator } from "../../js/core/ElfNameGenerator.js";
import { RULE_SETS, createGeneratorFor } from "../../js/core/generators.js";
import { ELF_SUBRACES, SUBRACES } from "../../js/core/species.js";
import { readSpeciesData } from "../helpers/nameData.js";

const generatorFor = createGeneratorFor(readSpeciesData());
const readsOf = (lineage) => RULE_SETS.find((ruleSet) => ruleSet.lineages.includes(lineage)).reads;
// an entry as loadSpeciesData gives it: the app's lineages its sources tie it to, and whether one ties it to none
const tied = (lineages, generic = false) => ({ lineages, generic });

describe("generatorFor", () => {
    it.each(ELF_SUBRACES)("gives %s the one elf generator", (subrace) => {
        expect(generatorFor(subrace)).toBeInstanceOf(ElfNameGenerator);
        expect(generatorFor(subrace)).toBe(generatorFor("high-elf"));
    });

    it("gives drow their own generator", () => {
        expect(generatorFor("drow")).toBeInstanceOf(DrowNameGenerator);
    });

    it("has a generator for every lineage the app offers", () => {
        SUBRACES.forEach((subrace) => expect(generatorFor(subrace)).toBeDefined());
    });

    it("rejects a subrace no species owns", () => {
        expect(() => generatorFor("half-elf")).toThrow("Unknown subrace: half-elf");
        expect(() => generatorFor(undefined)).toThrow("Unknown subrace: undefined");
    });

    it("refuses to build a rule set whose species has no data", () => {
        expect(() => createGeneratorFor({})).toThrow("No name data for elf");
    });
});

describe("which data each rule set reads", () => {
    it("gives the drow rules only what the sources tie to drow", () => {
        const drow = readsOf("drow");
        expect(drow(tied(["drow"]))).toBe(true);
        expect(drow(tied(["drow"], true))).toBe(true);
        expect(drow(tied([], true))).toBe(false);
        expect(drow(tied(["moon-elf"]))).toBe(false);
    });

    it("gives the surface rules everything else, and a name printed both as drow and as plain elf to both", () => {
        const surface = readsOf("sun-elf");
        expect(surface(tied([], true))).toBe(true);
        expect(surface(tied(["moon-elf"]))).toBe(true);
        expect(surface(tied(["drow"], true))).toBe(true);
        expect(surface(tied(["drow"]))).toBe(false);
        // a name printed as drow and as a surface lineage serves both
        expect(surface(tied(["drow", "moon-elf"]))).toBe(true);
    });

    it("builds each generator from only the names, tables and words its rule set reads", () => {
        // a stand-in generator that keeps the data it is given
        class Kept {
            constructor(data) {
                this.data = data;
            }
        }
        const entry = (text, lineages, generic = false) => ({ text, ...tied(lineages, generic) });
        const share = [entry("Drizzt", ["drow"]), entry("Ilsevel", ["moon-elf"]), entry("Aerith", [], true)];
        const data = { elf: { names: share, tables: share, words: share, sources: [] } };
        const keptFor = createGeneratorFor(
            data,
            RULE_SETS.map((ruleSet) => ({ ...ruleSet, Generator: Kept }))
        );
        const texts = (lineage, field) => keptFor(lineage).data[field].map((e) => e.text);
        for (const field of ["names", "tables", "words"]) {
            expect(texts("drow", field)).toEqual(["Drizzt"]);
            expect(texts("moon-elf", field)).toEqual(["Ilsevel", "Aerith"]);
        }
        // the rest of the data reaches every generator as it is
        expect(keptFor("drow").data.sources).toBe(data.elf.sources);
    });
});
