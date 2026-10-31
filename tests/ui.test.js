import { beforeEach, describe, expect, it, vi } from "vitest";
import { focusPart, renderResult } from "../js/ui.js";
import { readPage } from "./helpers/files.js";

// Rendering uses the real page markup, so a renamed or removed element fails here rather than on the live site.
const page = readPage();
const handlers = { onToggleLock: vi.fn(), onChoose: vi.fn() };
const rows = () =>
    [...document.querySelectorAll(".name-sources-row")].map((row) => [
        row.querySelector(".name-sources-label").textContent,
        row.querySelector(".name-sources-value").textContent
    ]);

const elf = {
    name: "Alra Starym",
    sex: "neutral",
    subrace: "sun-elf",
    parts: [
        { key: "t0", role: "prefix", text: "al", method: "split", from: ["Alarra"], books: ["Cormanthyr"] },
        { key: "t1", role: "suffix", text: "ra", method: "split", from: ["Amra"] },
        { key: "family", role: "family name", text: "Starym", method: "published", source: { title: "Cormanthyr" } }
    ]
};
const meaning = (key, role, text, value) => ({ key, role, text, meaning: value });
const drow = {
    name: "Vic'ril Quarlin Baenre",
    sex: "neutral",
    subrace: "drow",
    tables: "By Any Other Name: The Drow (Dragon #267)",
    parts: [
        meaning("f0", "prefix", "vic", "Dagger, knife"),
        { key: "s1", role: "apostrophe", text: "'" },
        meaning("f2", "suffix", "ril", "Bandit"),
        { key: "s3", role: "space", text: " " },
        meaning("f4", "prefix", "quar", "Aged"),
        meaning("f5", "suffix", "lin", "Shadow"),
        meaning("n0", "house prefix", "baen", "Blessed by"),
        { ...meaning("n1", "house suffix", "re", "Fell powers"), wordMeaning: "Blessed by fell powers" }
    ]
};
const wordMeanings = () => [...document.querySelectorAll(".name-word-meaning")].map((m) => m.textContent);

beforeEach(() => {
    document.documentElement.innerHTML = page;
});

describe("renderResult", () => {
    it("groups parts into words, so a narrow screen never wraps inside a word", () => {
        renderResult(drow, new Set(), handlers);
        const words = [...document.querySelectorAll(".name-word-parts")].map((w) => w.textContent);
        expect(words).toEqual(["Vic'ril", "Quarlin", "Baenre"]);
    });

    it("keeps a built surname with a joining letter as one word", () => {
        const surname = {
            name: "Lamath Kerelar",
            sex: "neutral",
            subrace: "high-elf",
            parts: [
                meaning("t0", "prefix", "lam", "Song"),
                meaning("t1", "suffix", "ath", "Star"),
                meaning("n0", "family prefix", "ker", "Wolf"),
                { key: "nj1", role: "joining letter", text: "e" },
                meaning("n1", "family suffix", "lar", "Storm")
            ]
        };
        renderResult(surname, new Set(), handlers);
        const words = [...document.querySelectorAll(".name-word-parts")].map((w) => w.textContent);
        expect(words).toEqual(["Lamath", "Kerelar"]);
        expect(wordMeanings()).toEqual(["Song · Star", "Wolf · Storm"]);
    });

    it("shows each word's table meaning above it (first glosses; a house as one phrase), without sources", () => {
        renderResult(drow, new Set(), handlers);
        expect(wordMeanings()).toEqual(["Dagger · Bandit", "Aged · Shadow", "Blessed by fell powers"]);
        expect(rows()[0]).toEqual(["Prefix", 'vic means "Dagger, knife"']);
        expect(rows().find(([label]) => label === "House prefix")).toEqual(["House prefix", 'baen means "Blessed by"']);
        expect(rows().at(-1)[0]).toBe("Tables");
    });

    it("marks a split component 'Unknown' in a mixed word, and the whole word when every component is", () => {
        const split = (key, role, text) => ({ key, role, text, method: "split", from: ["Alarra"] });
        const mixed = {
            ...elf,
            name: "Sapral Alra",
            parts: [
                meaning("t0", "prefix", "sap", "Sapphire"),
                split("t1", "suffix", "ral"),
                split("n0", "family prefix", "al"),
                split("n1", "family suffix", "ra")
            ]
        };
        renderResult(mixed, new Set(), handlers);
        expect(wordMeanings()).toEqual(["Sapphire · Unknown", "Meaning unknown"]);
        const unknown = [...document.querySelectorAll(".name-word-unknown")].map((u) => u.textContent);
        expect(unknown).toEqual(["Unknown", "Meaning unknown"]);
        expect(rows()[1]).toEqual(["Suffix", "-ral from Alarra"]);
    });

    it("lets each component of a built house be locked on its own", () => {
        renderResult(drow, new Set(["n1"]), handlers);
        const lock = (key) => document.querySelector(`[data-key="${key}"] .name-part-lock`);
        expect(lock("n0").getAttribute("aria-pressed")).toBe("false");
        expect(lock("n1").getAttribute("aria-pressed")).toBe("true");
    });

    it("says a name cut from published names has no known meaning, and shows the books its parts come from", () => {
        renderResult(elf, new Set(["t1"]), handlers);
        // the published family name has no translation either, but it is not a split component, so it is not gold
        expect(wordMeanings()).toEqual(["Meaning unknown", "Meaning unknown"]);
        const gold = [...document.querySelectorAll(".name-word-unknown")].map(
            (u) => u.closest(".name-word").textContent
        );
        expect(gold).toEqual([expect.stringContaining("Alra")]);
        expect(rows()).toEqual([
            ["Prefix", "al- from Alarra (Cormanthyr)"],
            ["Suffix", "-ra from Amra"],
            ["Family name", "Starym, published in Cormanthyr"]
        ]);
        const lock = document.querySelector('[data-key="t1"] .name-part-lock');
        expect(lock.getAttribute("aria-pressed")).toBe("true");
        // a published family name already in English needs no meaning
        const english = {
            key: "family",
            role: "family name",
            text: "Morninglight",
            method: "published",
            form: "common",
            source: { title: "Lost Empires of Faerun" }
        };
        renderResult(
            { ...elf, name: "Alra Morninglight", parts: [...elf.parts.slice(0, 2), english] },
            new Set(),
            handlers
        );
        expect(wordMeanings()).toEqual(["Meaning unknown", ""]);
    });

    it("notes a published match in the breakdown, labelling names known only from Ed Greenwood", () => {
        const source = { title: "forum answer by Ed Greenwood, the Realms' creator", creator: true };
        renderResult({ ...elf, published: { source } }, new Set(), handlers);
        expect(rows()[0]).toEqual([
            "Published name",
            "Alra is used by Ed Greenwood, the Realms' creator, in a forum answer"
        ]);
        renderResult({ ...elf, published: { source: { title: "Cormanthyr" } } }, new Set(), handlers);
        expect(rows()[0]).toEqual(["Published name", "Alra appears in Cormanthyr"]);
    });

    it("shows a published family-name translation above the family name and in its own row", () => {
        const family = {
            ...elf.parts[2],
            text: "Galanodel",
            source: { title: "Player's Handbook (5e)" },
            meaning: "Moonwhisper",
            meaningSource: "Player's Handbook (5e)"
        };
        renderResult(
            { ...elf, name: "Alra Galanodel", parts: [...elf.parts.slice(0, 2), family] },
            new Set(),
            handlers
        );
        expect(wordMeanings()).toEqual(["Meaning unknown", "Moonwhisper"]);
        expect(rows().at(-1)).toEqual([
            "Family name",
            'Galanodel means "Moonwhisper", published in Player\'s Handbook (5e)'
        ]);
    });
    it("leaves apostrophes out of the script line, whose fonts cannot draw them", () => {
        renderResult(drow, new Set(), handlers);
        expect(document.getElementById("nameScript").textContent).toBe("Vicril Quarlin Baenre");
    });

    it("can return keyboard focus to a part after redrawing it", () => {
        renderResult(elf, new Set(), handlers);
        focusPart("t1", "lock");
        expect(document.activeElement).toBe(document.querySelector('[data-key="t1"] .name-part-lock'));
    });
});
