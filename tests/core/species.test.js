import { describe, expect, it } from "vitest";
import {
    DROW,
    ELF_SUBRACES,
    SEX_BY_STYLE,
    SPECIES,
    SUBRACES,
    getLineage,
    formatNameKind,
    formatNameWithKind,
    getStyleForSex
} from "../../js/core/species.js";
import { readLineageData } from "../helpers/nameData.js";

describe("ELF_SUBRACES", () => {
    it("lists the four surface-elf subraces, high elf first (the default)", () => {
        expect(ELF_SUBRACES).toEqual(["high-elf", "sun-elf", "moon-elf", "wood-elf"]);
    });
});

describe("SUBRACES", () => {
    it("lists every lineage the app offers: the elf subraces, then drow, then the dwarf lineages", () => {
        expect(DROW).toBe("drow");
        expect(SUBRACES).toEqual([...ELF_SUBRACES, "drow", "shield-dwarf", "gold-dwarf", "wild-dwarf", "duergar"]);
    });
});

describe("the species description", () => {
    it("keeps the values stored with saved names and sent in usage events (ANALYTICS.md)", () => {
        expect(SPECIES.elf.lineages.map((l) => [l.value, l.label, l.analytics])).toEqual([
            ["high-elf", "any", "any"],
            ["sun-elf", "sun", "sun_elf"],
            ["moon-elf", "moon", "moon_elf"],
            ["wood-elf", "wood", "wood_elf"],
            ["drow", "drow", "drow"]
        ]);
        expect(SPECIES.elf.analytics).toBe("elf");
        expect(SPECIES.dwarf.lineages.map((l) => [l.value, l.label, l.analytics])).toEqual([
            ["shield-dwarf", "shield", "shield_dwarf"],
            ["gold-dwarf", "gold", "gold_dwarf"],
            ["wild-dwarf", "wild", "wild_dwarf"],
            ["duergar", "duergar", "duergar"]
        ]);
        expect(SPECIES.dwarf.analytics).toBe("dwarf");
        // a saved record's generatorType says its species
        expect([SPECIES.elf.generatorType, SPECIES.dwarf.generatorType]).toEqual(["elven", "dwarven"]);
    });

    it("words each species as the page does: its name, and its plural for a note about all of them", () => {
        expect([SPECIES.elf.label, SPECIES.elf.plural]).toEqual(["elf", "elves"]);
        expect([SPECIES.dwarf.label, SPECIES.dwarf.plural]).toEqual(["dwarf", "dwarves"]);
    });

    it.each([
        ["elf", "high-elf"],
        ["dwarf", "shield-dwarf"]
    ])("names the language of %s names as their data does, the other being common", (species, lineage) => {
        const forms = new Set(readLineageData(lineage).names.map((n) => n.form));
        expect(forms).toEqual(new Set([SPECIES[species].form, "common"]));
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

    it("translates the sources' dwarf words into lineages the app offers", () => {
        const words = SPECIES.dwarf.lineageWords;
        const offered = new Set(SUBRACES);
        Object.values(words).forEach((lineages) =>
            lineages.forEach((lineage) => expect(offered.has(lineage)).toBe(true))
        );
        // each lineage is printed under its own word; mountain dwarves are shield, hill dwarves gold, gray dwarves duergar
        expect([words.shield, words.gold, words.wild]).toEqual([["shield-dwarf"], ["gold-dwarf"], ["wild-dwarf"]]);
        expect(words.mountain).toEqual(["shield-dwarf"]);
        expect(words.hill).toEqual(["gold-dwarf"]);
        expect(words.gray).toEqual(["duergar"]);
        // "dwarf" alone, and dwarves the app does not offer, tie a name to no particular lineage
        for (const word of ["dwarf", "arctic", "urdunnir", "albino"]) {
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

describe("formatNameKind", () => {
    it("says gender, species and lineage in the picker's words and order", () => {
        expect(formatNameKind({ sex: "female", subrace: "sun-elf" })).toBe("female elf · sun lineage");
        expect(formatNameKind({ sex: "male", subrace: "drow" })).toBe("male elf · drow lineage");
        expect(formatNameKind({ sex: "neutral", subrace: "high-elf" })).toBe("unisex elf · any lineage");
        expect(formatNameKind({ sex: "female", subrace: "gold-dwarf" })).toBe("female dwarf · gold lineage");
    });

    it("takes the lineage and species words from the species description", () => {
        const lineage = SPECIES.elf.lineages.find((l) => l.value === "moon-elf");
        expect(formatNameKind({ sex: "male", subrace: "moon-elf" })).toBe(
            `male ${SPECIES.elf.label} · ${lineage.label} lineage`
        );
    });

    it("leaves out what is unknown, with no blank separator", () => {
        expect(formatNameKind({ sex: "female", subrace: "rock-gnome" })).toBe("female");
        expect(formatNameKind({ sex: "other", subrace: "wood-elf" })).toBe("elf · wood lineage");
        expect(formatNameKind({ subrace: "wood-elf" })).toBe("elf · wood lineage");
        expect(formatNameKind({ sex: "male" })).toBe("male");
    });

    it("gives an empty line when nothing is known", () => {
        expect(formatNameKind({})).toBe("");
        expect(formatNameKind({ sex: 3, subrace: "undefined" })).toBe("");
    });
});

describe("formatNameWithKind", () => {
    it("puts what the name is in parentheses after it", () => {
        expect(formatNameWithKind("Aelar", { sex: "male", subrace: "moon-elf" })).toBe(
            "Aelar (male elf · moon lineage)"
        );
    });

    it("gives the bare name when nothing about it is known", () => {
        expect(formatNameWithKind("Legacy", {})).toBe("Legacy");
    });
});
