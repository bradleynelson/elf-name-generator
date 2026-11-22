import { describe, expect, it } from "vitest";
import {
    DROW,
    ELF_SUBRACES,
    SEX_BY_STYLE,
    SPECIES,
    SUBRACES,
    getLineage,
    getStyleForSex
} from "../../js/core/species.js";

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

describe("the species description", () => {
    it("keeps the values stored with saved names and sent in usage events (ANALYTICS.md)", () => {
        expect(SPECIES.elf.lineages.map((l) => [l.value, l.label, l.analytics])).toEqual([
            ["high-elf", "any lineage", "any"],
            ["sun-elf", "sun elf", "sun_elf"],
            ["moon-elf", "moon elf", "moon_elf"],
            ["wood-elf", "wood elf", "wood_elf"],
            ["drow", "drow", "drow"]
        ]);
        expect(SPECIES.elf.analytics).toBe("elf");
    });

    it("gives a lineage its own script, or else its species' script, and its species", () => {
        expect(getLineage("drow").script.font).toBe("high-drowic");
        expect(getLineage("moon-elf").script.font).toBe("espruar");
        expect(getLineage("moon-elf").species).toBe(SPECIES.elf);
        expect(getLineage("rock-gnome")).toBeUndefined();
    });

    it("translates the sources' lineage words into lineages the app offers", () => {
        const offered = new Set(SUBRACES);
        Object.values(SPECIES.elf.lineageWords).forEach((lineages) =>
            lineages.forEach((lineage) => expect(offered.has(lineage)).toBe(true))
        );
        const words = SPECIES.elf.lineageWords;
        // each lineage the app offers is printed under its own word
        expect([words.sun, words.moon, words.wood, words.drow]).toEqual([
            ["sun-elf"],
            ["moon-elf"],
            ["wood-elf"],
            ["drow"]
        ]);
        // wild elves inform the wood-elf choice; gray elves are moon elves (FRCS); high elves and eladrin are sun or moon
        expect(words.wild).toEqual(["wood-elf"]);
        expect(words.gray).toEqual(["moon-elf"]);
        expect(words.high).toEqual(["sun-elf", "moon-elf"]);
        expect(words.eladrin).toEqual(["sun-elf", "moon-elf"]);
        // "elf" alone, and elves the app does not offer, tie a name to no particular lineage
        for (const word of ["elf", "sea", "aquatic", "star", "avariel", "lythari", "fey_ri", "llewyrr"]) {
            expect(words[word], word).toEqual([]);
        }
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

describe("getStyleForSex", () => {
    it("gives the page's style for a result's sex, neutral for anything else", () => {
        expect(getStyleForSex("female")).toBe("feminine");
        expect(getStyleForSex("male")).toBe("masculine");
        expect(getStyleForSex("neutral")).toBe("neutral");
        expect(getStyleForSex(undefined)).toBe("neutral");
    });
});
