import { describe, it, expect, beforeEach } from "vitest";
import { HalflingNameGenerator } from "../../js/core/HalflingNameGenerator.js";

const personal = [
    {
        root: "milo",
        prefix_text: "Milo",
        prefix_meaning: "gracious",
        can_be_prefix: true,
        can_be_suffix: true,
        gender: "male",
        subrace: ["lightfoot"],
        prefix_phonetic: "MY-loh"
    },
    {
        root: "pella",
        prefix_text: "Pella",
        prefix_meaning: "stone",
        can_be_prefix: true,
        can_be_suffix: true,
        gender: "female",
        subrace: ["stout"],
        prefix_phonetic: "PEH-lah"
    }
];

const families = [
    { root: "goodbarrel", text: "Goodbarrel", meaning: "brewkeeper", subrace: ["lightfoot"], phonetic: "GOOD-bar-rel" },
    {
        root: "thorngage",
        text: "Thorngage",
        meaning: "thorn hedge guardian",
        subrace: ["stout"],
        phonetic: "THORN-gayj"
    }
];

const nicknames = [{ text: "Quickstep", meaning: "moves lightly", phonetic: "KWIK-step" }];

describe("HalflingNameGenerator", () => {
    let gen;

    beforeEach(() => {
        gen = new HalflingNameGenerator(personal, families, nicknames);
    });

    it("generates a full name with nickname by default", () => {
        const result = gen.generate({ subrace: "lightfoot", nameType: "full", gender: "male" });
        expect(result.name).toContain(" ");
        expect(result.name).toContain('"');
        expect(result.breakdown.personal).toBeTruthy();
        expect(result.breakdown.family).toBeTruthy();
        expect(result.breakdown.nickname).toBeTruthy();
    });

    it("generates a full name without nickname when requested", () => {
        const result = gen.generate({ subrace: "stout", nameType: "full-no-nickname", gender: "female" });
        expect(result.name).toContain(" ");
        expect(result.name).not.toContain('"');
        expect(result.breakdown.personal).toBeTruthy();
        expect(result.breakdown.family).toBeTruthy();
    });

    it("generates personal-only", () => {
        const result = gen.generate({ nameType: "personal", subrace: "lightfoot", gender: "male" });
        expect(result.name.length).toBeGreaterThan(0);
        expect(result.breakdown.personal).toBeTruthy();
        expect(result.breakdown.family).toBeUndefined();
    });

    it("generates family-only", () => {
        const result = gen.generate({ nameType: "family", subrace: "stout" });
        expect(result.name.length).toBeGreaterThan(0);
        expect(result.breakdown.family).toBeTruthy();
        expect(result.breakdown.personal).toBeUndefined();
    });

    it("generates nickname-only", () => {
        const result = gen.generate({ nameType: "nickname" });
        expect(result.name).toContain('"');
        expect(result.breakdown.nickname).toBeTruthy();
    });
});
