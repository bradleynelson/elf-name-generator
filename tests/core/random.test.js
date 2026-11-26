import { describe, expect, it } from "vitest";
import {
    RecentNames,
    generateUnrepeated,
    generateWithRetries,
    selectRandom,
    selectWeighted,
    shuffle
} from "../../js/core/random.js";
import { fixedRandom, seededRandom } from "../helpers/random.js";

describe("selectRandom", () => {
    const items = ["a", "b", "c", "d"];

    it("returns null when there is nothing to choose from", () => {
        expect(selectRandom([], fixedRandom(0.5))).toBeNull();
    });

    it("splits the range [0, 1) into equal shares, one per item", () => {
        expect(selectRandom(items, fixedRandom(0))).toBe("a");
        expect(selectRandom(items, fixedRandom(0.24))).toBe("a");
        expect(selectRandom(items, fixedRandom(0.25))).toBe("b");
        expect(selectRandom(items, fixedRandom(0.99))).toBe("d");
    });

    it("draws from Math.random when no source is given", () => {
        expect(items).toContain(selectRandom(items));
    });
});

describe("shuffle", () => {
    const items = ["a", "b", "c", "d"];

    it("swaps each place, from the last, with one at or before it that the draw picks", () => {
        expect(shuffle(items, fixedRandom(0.99))).toEqual(items);
        expect(shuffle(items, fixedRandom(0))).toEqual(["b", "c", "d", "a"]);
        expect(shuffle(items, fixedRandom(0.5))).toEqual(["a", "d", "b", "c"]);
        expect(items).toEqual(["a", "b", "c", "d"]);
    });

    it("draws once for each place but the first, which has nowhere else to go", () => {
        let draws = 0;
        shuffle(items, () => (draws++, 0.5));
        expect(draws).toBe(items.length - 1);
    });

    it("can give every order", () => {
        const random = seededRandom(5);
        const orders = new Set(Array.from({ length: 200 }, () => shuffle(["a", "b", "c"], random).join("")));
        expect(orders).toEqual(new Set(["abc", "acb", "bac", "bca", "cab", "cba"]));
    });
});

describe("selectWeighted", () => {
    // weights 1/3/6 total 10: the shares are [0, 0.1), [0.1, 0.4) and [0.4, 1)
    const items = [
        { name: "light", weight: 1 },
        { name: "middle", weight: 3 },
        { name: "heavy", weight: 6 }
    ];
    const weightOf = (item) => item.weight;
    const pick = (draw) => selectWeighted(items, weightOf, fixedRandom(draw)).name;

    it("gives each item a share of the draw in proportion to its weight", () => {
        expect(pick(0)).toBe("light");
        expect(pick(0.09)).toBe("light");
        expect(pick(0.1)).toBe("middle");
        expect(pick(0.39)).toBe("middle");
        expect(pick(0.4)).toBe("heavy");
        expect(pick(0.99)).toBe("heavy");
    });

    it("never picks an item whose weight is zero", () => {
        const withZero = [{ weight: 0, name: "never" }, ...items];
        for (const draw of [0, 0.05, 0.5, 0.99]) {
            expect(selectWeighted(withZero, weightOf, fixedRandom(draw)).name).not.toBe("never");
        }
    });

    it("returns null when there is nothing to choose from", () => {
        expect(selectWeighted([], weightOf, fixedRandom(0.5))).toBeNull();
    });

    it("falls back to the last item when no weight lets the draw land (all weights zero)", () => {
        const none = items.map((item) => ({ ...item, weight: 0 }));
        expect(selectWeighted(none, weightOf, fixedRandom(0.5)).name).toBe("heavy");
    });

    it("draws from Math.random when no source is given", () => {
        expect(items).toContain(selectWeighted(items, weightOf));
    });
});

describe("RecentNames", () => {
    it("starts empty", () => {
        const recent = new RecentNames();
        expect(recent.names).toEqual([]);
        expect(recent.has("Ael")).toBe(false);
    });

    it("remembers the last five names by default, forgetting the oldest first", () => {
        const recent = new RecentNames();
        ["a", "b", "c", "d", "e"].forEach((name) => recent.add(name));
        expect(["a", "b", "c", "d", "e"].every((name) => recent.has(name))).toBe(true);
        recent.add("f");
        expect(recent.has("a")).toBe(false);
        expect(["b", "c", "d", "e", "f"].every((name) => recent.has(name))).toBe(true);
    });

    it("remembers as many names as the size it is given", () => {
        const recent = new RecentNames(2);
        ["a", "b", "c"].forEach((name) => recent.add(name));
        expect(recent.has("a")).toBe(false);
        expect(recent.has("b")).toBe(true);
        expect(recent.has("c")).toBe(true);
    });
});

describe("generateWithRetries", () => {
    it("returns the first attempt that builds, without trying again", () => {
        const build = fixedRandom(null, null, "Ael", "Bel");
        expect(generateWithRetries(build)).toBe("Ael");
    });

    it("gives up with null after 300 attempts", () => {
        let attempts = 0;
        expect(generateWithRetries(() => (attempts++, null))).toBeNull();
        expect(attempts).toBe(300);
    });
});

describe("generateUnrepeated", () => {
    const named = (...names) => fixedRandom(...names.map((name) => name && { name }));

    it("returns the first name not used recently, and remembers it", () => {
        const recent = new RecentNames();
        recent.add("Ael");
        expect(generateUnrepeated(named(null, "Ael", "Bel"), recent)).toEqual({ name: "Bel" });
        expect(recent.has("Bel")).toBe(true);
    });

    it("returns the first repeat, and remembers it, when every attempt was used recently", () => {
        const recent = new RecentNames();
        ["Ael", "Bel"].forEach((name) => recent.add(name));
        let attempts = 0;
        const build = () => ({ name: ++attempts === 1 ? "Ael" : "Bel" });
        expect(generateUnrepeated(build, recent)).toEqual({ name: "Ael" });
        expect(attempts).toBe(300);
        expect(recent.names.at(-1)).toBe("Ael");
    });

    it("returns null and remembers nothing when no attempt builds", () => {
        const recent = new RecentNames();
        expect(generateUnrepeated(() => null, recent)).toBeNull();
        expect(recent.names).toEqual([]);
    });
});
