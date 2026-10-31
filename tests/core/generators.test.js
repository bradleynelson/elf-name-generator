import { describe, expect, it } from "vitest";
import { DrowNameGenerator } from "../../js/core/DrowNameGenerator.js";
import { ElfNameGenerator } from "../../js/core/ElfNameGenerator.js";
import { createGeneratorFor } from "../../js/core/generators.js";
import { ELF_SUBRACES, SUBRACES } from "../../js/core/species.js";
import { readJson } from "../helpers/files.js";

const load = (file) => readJson(`data/${file}`);
const generatorFor = createGeneratorFor(load("elfNames.json"), load("drowNames.json"));

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
});
