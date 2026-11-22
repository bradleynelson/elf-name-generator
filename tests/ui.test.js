import { beforeEach, describe, expect, it, vi } from "vitest";
import { focusPart, renderLineagePicker, renderResult } from "../js/ui.js";
import { readPage } from "./helpers/files.js";

// Rendering uses the real page markup, so a renamed or removed element fails here rather than on the live site.
const page = readPage();
const handlers = { onToggleLock: vi.fn(), onChoose: vi.fn() };
// [label, what the part is, its source line] per breakdown row; a row with no source line has two entries
const rows = () =>
    [...document.querySelectorAll(".name-sources-row")].map((row) => {
        const from = row.querySelector(".name-sources-from");
        const label = row.querySelector(".name-sources-label").textContent;
        const text = row.querySelector(".name-sources-text").textContent;
        return from ? [label, text, from.textContent] : [label, text];
    });

const book = (title, authority = "official") => ({ title, authority });
// a part in its place: its section and its kind, which the page reads instead of the key or role
const placed = (section, kind) => ({ section, kind });
const split = (key, role, text, section = "given", sources = []) => ({
    key,
    role,
    text,
    method: "split",
    from: ["Alarra"],
    sources,
    ...placed(section, role.split(" ").at(-1))
});
const published = (text, sources, more = {}) => ({
    key: "family",
    role: "family name",
    text,
    method: "published",
    sources,
    ...placed("family", "whole"),
    ...more
});
const elf = {
    name: "Alra Starym",
    sex: "neutral",
    subrace: "sun-elf",
    parts: [
        split("t0", "prefix", "al", "given", [book("Cormanthyr")]),
        { ...split("t1", "suffix", "ra"), from: ["Amra"] },
        published("Starym", [book("Cormanthyr")])
    ]
};
const meaning = (key, role, text, value, section = "given") => ({
    key,
    role,
    text,
    meaning: value,
    ...placed(section, role.split(" ").at(-1))
});
const joint = (key, role, text, section = "given") => ({ key, role, text, ...placed(section, "joint") });
const drow = {
    name: "Vic'ril Quarlin Baenre",
    sex: "neutral",
    subrace: "drow",
    parts: [
        meaning("f0", "prefix", "vic", "Dagger, knife"),
        joint("s1", "apostrophe", "'"),
        meaning("f2", "suffix", "ril", "Bandit"),
        joint("s3", "space", " "),
        meaning("f4", "prefix", "quar", "Aged"),
        meaning("f5", "suffix", "lin", "Shadow"),
        meaning("n0", "house prefix", "baen", "Blessed by", "family"),
        { ...meaning("n1", "house suffix", "re", "Fell powers", "family"), wordMeaning: "Blessed by fell powers" }
    ]
};
const DRAGON_267 = [book("Dragon #267")];
const wordMeanings = () => [...document.querySelectorAll(".name-word-meaning")].map((m) => m.textContent);
const partMeanings = () => [...document.querySelectorAll(".name-part-meaning")].map((m) => m.textContent);
const moreButtons = () => [...document.querySelectorAll(".name-sources-more")];
// the letters of each word as shown, without the captions above its components
const shownWords = () =>
    [...document.querySelectorAll(".name-word-parts")].map((w) =>
        [...w.querySelectorAll(".name-part-text, .name-part-joint")].map((n) => n.textContent).join("")
    );

beforeEach(() => {
    document.documentElement.innerHTML = page;
});

describe("renderResult", () => {
    it("groups parts into words, so a narrow screen never wraps inside a word", () => {
        renderResult(drow, new Set(), handlers);
        expect(shownWords()).toEqual(["Vic'ril", "Quarlin", "Baenre"]);
    });

    it("keeps a built surname with a joining letter as one word", () => {
        const surname = {
            name: "Lamath Kerelar",
            sex: "neutral",
            subrace: "high-elf",
            parts: [
                meaning("t0", "prefix", "lam", "Song"),
                meaning("t1", "suffix", "ath", "Star"),
                meaning("n0", "family prefix", "ker", "Wolf", "family"),
                { ...joint("nj1", "joining letter", "e", "family"), basis: "Dragon #251" },
                meaning("n1", "family suffix", "lar", "Storm", "family")
            ]
        };
        renderResult(surname, new Set(), handlers);
        expect(shownWords()).toEqual(["Lamath", "Kerelar"]);
        expect(partMeanings()).toEqual(["Song", "Star", "Wolf", "Storm"]);
        expect(rows()[3]).toEqual([
            "Joining letter",
            "-e- added so the components join smoothly",
            "rule from Dragon #251"
        ]);
        expect(document.querySelector(".name-sources-from cite").textContent).toBe("Dragon #251");
    });

    it("says why a joining letter was added only when the part says, as names saved by 4.1.5 or earlier do not", () => {
        const saved = {
            ...elf,
            name: "Alera Starym",
            parts: [elf.parts[0], joint("tj1", "joining letter", "e"), ...elf.parts.slice(1)]
        };
        renderResult(saved, new Set(), handlers);
        expect(rows()[1]).toEqual(["Joining letter", "-e- added so the components join smoothly"]);
    });

    it("shows each table meaning over its own component, and a house's phrase over the whole house", () => {
        renderResult(drow, new Set(), handlers);
        expect(partMeanings()).toEqual(["Dagger", "Bandit", "Aged", "Shadow"]);
        const caption = (key) => document.querySelector(`[data-key="${key}"] .name-part-meaning`);
        expect(caption("f2").textContent).toBe("Bandit");
        expect(caption("n0")).toBeNull();
        expect(wordMeanings()).toEqual(["", "", "Blessed by fell powers"]);
    });

    it("says what each part is, then credits its sources on a line of its own; no separate tables row", () => {
        const sourced = { ...drow, parts: drow.parts.map((p) => (p.meaning ? { ...p, sources: DRAGON_267 } : p)) };
        renderResult(sourced, new Set(), handlers);
        expect(rows()[0]).toEqual(["Prefix", 'vic- means "Dagger, knife"', "Dragon #267"]);
        expect(rows().find(([label]) => label === "House name suffix")).toEqual([
            "House name suffix",
            '-re means "Fell powers"',
            "Dragon #267"
        ]);
        expect(rows().map(([label]) => label)).not.toContain("Tables");
        expect(document.querySelector(".name-sources-from cite").textContent).toBe("Dragon #267");
    });

    it("shows up to two sources, separated as citations; from three, the first and a button for the rest", () => {
        const family = (sources) => ({ ...elf, parts: [...elf.parts.slice(0, 2), { ...elf.parts[2], sources }] });
        renderResult(family([book("Races of the Wild (3.5e)"), book("Dragon #251")]), new Set(), handlers);
        expect(rows().at(-1)[2]).toBe("Races of the Wild (3.5e); Dragon #251");
        expect(moreButtons()).toEqual([]);

        const three = [book("Cormanthyr"), book("Elves of Evermeet (2e)"), book("Dragon #251")];
        renderResult(family(three), new Set(), handlers);
        const [more] = moreButtons();
        const rest = document.querySelector(".name-sources-from .name-sources-rest");
        expect([more.textContent, more.getAttribute("aria-expanded"), rest.hidden]).toEqual([
            "and 2 more",
            "false",
            true
        ]);
        more.click();
        expect([more.textContent, more.getAttribute("aria-expanded"), rest.hidden]).toEqual([
            "show fewer",
            "true",
            false
        ]);
        expect(rest.textContent).toBe("; Elves of Evermeet (2e); Dragon #251");
        more.click();
        expect([more.textContent, more.getAttribute("aria-expanded"), rest.hidden]).toEqual([
            "and 2 more",
            "false",
            true
        ]);
    });

    it("words a split component as cut from its names: up to three in full, then two and a button", () => {
        const cut = (from) => ({ ...elf, parts: [{ ...elf.parts[0], from }, ...elf.parts.slice(1)] });
        renderResult(cut(["Alarra", "Alavara", "Alais"]), new Set(), handlers);
        expect(rows()[0]).toEqual(["Prefix", "al- cut from Alarra, Alavara and Alais", "Cormanthyr"]);
        renderResult(cut(["Alarra", "Alavara", "Alais", "Alea"]), new Set(), handlers);
        const [more] = moreButtons();
        expect(more.textContent).toBe("and 2 more names");
        const rest = document.querySelector(".name-sources-text .name-sources-rest");
        expect([rest.hidden, rest.textContent]).toEqual([true, ", Alais, Alea"]);
    });

    it("glosses a Common-form family name, and names the published family names its words appear in", () => {
        const stargaze = (more) => ({
            key: "family",
            role: "family name",
            text: "Stargaze",
            method: "composed",
            words: ["Star", "gaze"],
            ...placed("family", "whole"),
            ...more
        });
        const render = (part) =>
            renderResult(
                { ...elf, name: "Alra Stargaze", parts: [...elf.parts.slice(0, 2), part] },
                new Set(),
                handlers
            );
        const lore = book("Lost Empires of Faerun");
        render(
            stargaze({
                wordNames: [["Starym", "Starfall"], ["Moongaze"]],
                wordSources: [[lore, book("Cormanthyr")], [lore]]
            })
        );
        expect(wordMeanings().at(-1)).toBe("star-gaze");
        expect(document.querySelector(".name-word-gloss").textContent).toBe("star-gaze");
        expect(rows().slice(-2)).toEqual([
            [
                "Family\u00a0name, first\u00a0word",
                '"star" as in Starym and Starfall',
                "Lost Empires of Faerun; Cormanthyr"
            ],
            ["Family\u00a0name, second\u00a0word", '"gaze" as in Moongaze', "Lost Empires of Faerun"]
        ]);
        render(
            stargaze({
                wordNames: [["Starym", "Starfall", "Starbrow", "Starwind"], ["Moongaze"]],
                wordSources: [[lore], [lore]]
            })
        );
        expect(moreButtons().map((b) => b.textContent)).toEqual(["and 2 more names"]);
        render(stargaze({ wordsFrom: "published elf family names" }));
        expect(rows().at(-1)).toEqual([
            "Family name",
            'Stargaze: "star" and "gaze"',
            "words from published elf family names"
        ]);
    });

    it("marks a split component 'Unknown' in a mixed word, and the whole word when every component is", () => {
        const mixed = {
            ...elf,
            name: "Sapral Alra",
            parts: [
                meaning("t0", "prefix", "sap", "Sapphire"),
                split("t1", "suffix", "ral"),
                split("n0", "family prefix", "al", "family"),
                split("n1", "family suffix", "ra", "family")
            ]
        };
        renderResult(mixed, new Set(), handlers);
        expect(partMeanings()).toEqual(["Sapphire", "Unknown"]);
        expect(wordMeanings()).toEqual(["", "Meaning unknown"]);
        const unknown = [...document.querySelectorAll(".name-word-unknown")].map((u) => u.textContent);
        expect(unknown).toEqual(["Unknown", "Meaning unknown"]);
        expect(rows()[1]).toEqual(["Suffix", "-ral cut from Alarra"]);
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
            ["Prefix", "al- cut from Alarra", "Cormanthyr"],
            ["Suffix", "-ra cut from Amra"],
            ["Family name", "Starym", "Cormanthyr"]
        ]);
        const lock = document.querySelector('[data-key="t1"] .name-part-lock');
        expect(lock.getAttribute("aria-pressed")).toBe("true");
        // a published family name already in English needs no meaning
        const english = published("Morninglight", [book("Lost Empires of Faerun")], { form: "common" });
        renderResult(
            { ...elf, name: "Alra Morninglight", parts: [...elf.parts.slice(0, 2), english] },
            new Set(),
            handlers
        );
        expect(wordMeanings()).toEqual(["Meaning unknown", ""]);
    });

    it("notes a published match in the breakdown with its sources, in the order the core gives", () => {
        const ed = book("a forum answer by Ed Greenwood, the Realms' creator", "creator");
        renderResult({ ...elf, published: { sources: [ed, book("Cormanthyr")] } }, new Set(), handlers);
        expect(rows()[0]).toEqual([
            "Published name",
            "Alra",
            "a forum answer by Ed Greenwood, the Realms' creator; Cormanthyr"
        ]);
        renderResult({ ...elf, published: { sources: [book("Cormanthyr"), ed] } }, new Set(), handlers);
        expect(rows()[0][2]).toBe("Cormanthyr; a forum answer by Ed Greenwood, the Realms' creator");
    });

    it("shows a published family-name translation above the name, naming its book only when it is another", () => {
        const galanodel = (sources) => ({
            ...elf.parts[2],
            text: "Galanodel",
            sources,
            meaning: "Moonwhisper",
            meaningSource: "Player's Handbook (5e)"
        });
        const render = (sources) =>
            renderResult(
                { ...elf, name: "Alra Galanodel", parts: [...elf.parts.slice(0, 2), galanodel(sources)] },
                new Set(),
                handlers
            );
        render([book("Player's Handbook (5e)")]);
        expect(wordMeanings()).toEqual(["Meaning unknown", "Moonwhisper"]);
        expect(rows().at(-1)).toEqual(["Family name", 'Galanodel means "Moonwhisper"', "Player's Handbook (5e)"]);
        render([book("Xanathar's Guide to Everything (5e)"), book("Player's Handbook (5e)")]);
        expect(rows().at(-1)[2]).toBe(
            "Xanathar's Guide to Everything (5e); Player's Handbook (5e) · meaning from Player's Handbook (5e)"
        );
    });

    it("shows a name saved by an older version, which cites its tables apart and gives parts no sources", () => {
        renderResult({ ...drow, tables: "By Any Other Name: The Drow (Dragon #267)" }, new Set(), handlers);
        expect(rows()[0]).toEqual(["Prefix", 'vic- means "Dagger, knife"']);
        expect(rows().map(([label]) => label)).not.toContain("Tables");
    });

    it("leaves apostrophes out of the script line, whose fonts cannot draw them", () => {
        renderResult(drow, new Set(), handlers);
        expect(document.getElementById("nameScript").textContent).toBe("Vicril Quarlin Baenre");
    });

    it("writes the name in its lineage's script, from the species description", () => {
        const script = () => [
            document.getElementById("nameScript").dataset.script,
            document.getElementById("nameScriptLabel").textContent
        ];
        renderResult(drow, new Set(), handlers);
        expect(script()).toEqual(["high-drowic", "Written in the High Drowic font"]);
        renderResult(elf, new Set(), handlers);
        expect(script()).toEqual(["espruar", "Written in Espruar, the elven alphabet"]);
    });

    it("can return keyboard focus to a part after redrawing it", () => {
        renderResult(elf, new Set(), handlers);
        focusPart("t1", "lock");
        expect(document.activeElement).toBe(document.querySelector('[data-key="t1"] .name-part-lock'));
    });
});

describe("renderLineagePicker", () => {
    it("lists the lineages it is given, in order, by label", () => {
        renderLineagePicker([
            { value: "high-elf", label: "any lineage" },
            { value: "drow", label: "drow" }
        ]);
        const options = [...document.getElementById("pickerLineage").options].map((o) => [o.value, o.textContent]);
        expect(options).toEqual([
            ["high-elf", "any lineage"],
            ["drow", "drow"]
        ]);
    });
});
