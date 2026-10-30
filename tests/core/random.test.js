import { describe, expect, it } from "vitest";
import { RecentNames, selectRandom, selectWeighted } from "../../js/core/random.js";
import { fixedRandom } from "../helpers/random.js";

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
