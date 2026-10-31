import { describe, expect, it } from "vitest";
import { DROW, ELF_SUBRACES, SEX_BY_STYLE, SUBRACES } from "../../js/core/species.js";

describe("ELF_SUBRACES", () => {
    it("lists the four surface-elf subraces, high elf first (the default)", () => {
        expect(ELF_SUBRACES).toEqual(["high-elf", "sun-elf", "moon-elf", "wood-elf"]);
    });
});

describe("SUBRACES", () => {
    it("lists every lineage the app offers: the elf subraces, then drow", () => {
        expect(DROW).toBe("drow");
        expect(SUBRACES).toEqual([...ELF_SUBRACES, "drow"]);
    });
});

describe("SEX_BY_STYLE", () => {
    it("maps each name style to the sex it implies", () => {
        expect(SEX_BY_STYLE).toEqual({
            feminine: "female",
            masculine: "male",
            neutral: "neutral",
            female: "female",
            male: "male"
        });
    });

    it("has no entry for a style that leaves the sex to the generator", () => {
        expect(SEX_BY_STYLE.random).toBeUndefined();
    });
});
