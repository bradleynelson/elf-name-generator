import { describe, expect, it } from "vitest";
import { generateComponentChange, generateJoined } from "../../js/core/joiningLetters.js";
import { structurePart } from "../../js/core/nameStructure.js";

// Clusters are the consonant runs found inside published names; a single consonant always joins.
const rules = (letters, clusters) => ({
    letters,
    basis: "Test book",
    clusters: new Set(clusters),
    keyPrefix: "g",
    section: "given"
});
const component = (key, text) => ({ key, role: "prefix", text, section: "given", kind: "prefix" });
const inListOrder = (letters) => letters;
const anySpelling = (parts) => parts.map((p) => p.text).join("");
const texts = (built) => built?.parts.map((p) => p.text);

describe("generateJoined", () => {
    it("joins components whose consonants meet inside a published name with no letter", () => {
        const built = generateJoined(
            [component("g0", "dor"), component("g1", "kral")],
            rules(["a"], ["rkr"]),
            inListOrder,
            anySpelling
        );
        expect(built).toEqual({ text: "dorkral", parts: [component("g0", "dor"), component("g1", "kral")] });
    });

    it("puts a joining letter, with its key, section and source, where the consonants never meet", () => {
        const built = generateJoined(
            [component("g0", "dor"), component("g1", "tak")],
            rules(["a"], []),
            inListOrder,
            anySpelling
        );
        expect(built.text).toBe("doratak");
        expect(built.parts[1]).toEqual({
            key: "gj1",
            role: "joining letter",
            text: "a",
            section: "given",
            kind: "joint",
            basis: "Test book"
        });
    });

    it("uses only letters that meet both neighbours cleanly", () => {
        const join = (clusters) =>
            generateJoined(
                [component("g0", "dor"), component("g1", "tak")],
                rules(["b"], clusters),
                inListOrder,
                anySpelling
            );
        expect(texts(join(["rb", "rbt"]))).toEqual(["dor", "b", "tak"]);
        expect(join(["rbt"]), "the letter does not meet the prefix").toBeNull();
        expect(join(["rb"]), "the letter does not meet the suffix").toBeNull();
    });

    it("tries the letters that fit in the order given, and takes the first completion the spelling accepts", () => {
        const join = (orderLetters, spell = anySpelling) =>
            generateJoined(
                [component("g0", "dor"), component("g1", "tak")],
                rules(["a", "k", "i"], []),
                orderLetters,
                spell
            );
        const offered = [];
        join((letters) => offered.push(letters) && []);
        expect(offered).toEqual([["a", "i"]]);
        expect(join((letters) => [...letters].reverse()).text).toBe("doritak");
        expect(join(inListOrder, (parts) => (parts[1].text === "a" ? null : anySpelling(parts))).text).toBe("doritak");
        expect(join(inListOrder, () => null)).toBeNull();
    });

    it("passes the letter's position and the component after it to the order", () => {
        const calls = [];
        generateJoined(
            [component("g0", "dor"), structurePart(" ", 1), component("g2", "nak"), component("g3", "tak")],
            rules(["a"], []),
            (letters, position, next) => calls.push([position, next.key]) && letters,
            anySpelling
        );
        expect(calls).toEqual([[3, "g3"]]);
    });

    it("joins a space or an apostrophe plainly, on either side", () => {
        const built = generateJoined(
            [component("g0", "dor"), structurePart("'", 1), component("g2", "tak")],
            rules([], []),
            inListOrder,
            anySpelling
        );
        expect(built.text).toBe("dor'tak");
    });
});

describe("generateComponentChange", () => {
    const joint = (text) => ({ key: "gj1", role: "joining letter", text, section: "given", kind: "joint" });
    const change = (current, choice, clusters = []) =>
        generateComponentChange(
            [component("g0", "dor"), joint(current), component("g1", "ral")],
            "g1",
            component("g1", choice),
            rules(["a", "d", "i"], clusters),
            anySpelling
        );

    it("puts the choice in its place and keeps the joining letter while it still fits", () => {
        expect(texts(change("i", "tak"))).toEqual(["dor", "i", "tak"]);
        expect(texts(change("d", "rul", ["rd", "rdr"]))).toEqual(["dor", "d", "rul"]);
    });

    it("takes the first letter that fits when the one in the name no longer does", () => {
        expect(texts(change("d", "tak", ["rd", "rdr"]))).toEqual(["dor", "a", "tak"]);
    });

    it("tries the kept letter first and once, then each other letter that fits, until the spelling accepts one", () => {
        const join = (accepts) => {
            const tried = [];
            const built = generateComponentChange(
                [component("g0", "dor"), joint("i"), component("g1", "ral")],
                "g1",
                component("g1", "tak"),
                rules(["a", "d", "i"], []),
                (parts) => {
                    tried.push(anySpelling(parts));
                    return accepts(anySpelling(parts)) ? anySpelling(parts) : null;
                }
            );
            return { tried, built };
        };
        const refusedAll = join(() => false);
        expect(refusedAll.tried).toEqual(["doritak", "doratak"]);
        expect(refusedAll.built).toBeNull();
        const refusedKept = join((text) => text !== "doritak");
        expect(refusedKept.tried).toEqual(["doritak", "doratak"]);
        expect(texts(refusedKept.built)).toEqual(["dor", "a", "tak"]);
    });

    it("drops the joining letter when the choice joins cleanly", () => {
        expect(texts(change("a", "kral", ["rkr"]))).toEqual(["dor", "kral"]);
    });

    it("keeps a space or an apostrophe, which is not a joining letter", () => {
        const built = generateComponentChange(
            [component("g0", "dor"), structurePart(" ", 1), component("g2", "tak")],
            "g2",
            component("g2", "nak"),
            rules([], []),
            anySpelling
        );
        expect(texts(built)).toEqual(["dor", " ", "nak"]);
    });

    it("is null when no letter fits", () => {
        expect(change("a", "ffa")).toBeNull();
    });
});
