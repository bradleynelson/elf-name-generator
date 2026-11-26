import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    renderButtonConfirmation,
    endCardConfirmations,
    focusPart,
    renderGlint,
    openPartPicker,
    renderPickers,
    renderResult
} from "../js/ui.js";
import { readPage } from "./helpers/files.js";
import {
    book,
    drow,
    elf,
    galanodel,
    joinedSurname,
    joint,
    meaning,
    published,
    split,
    stargaze,
    STARGAZE_WORDS,
    withFamily
} from "./helpers/results.js";

// Rendering uses the real page markup, so a renamed or removed element fails here rather than on the live site.
const page = readPage();
const handlers = { onToggleLock: vi.fn(), onChoose: vi.fn() };
const wordMeanings = () => [...document.querySelectorAll(".name-word-meaning")].map((m) => m.textContent);
const partMeanings = () => [...document.querySelectorAll(".name-part-meaning")].map((m) => m.textContent);
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
        renderResult(joinedSurname, new Set(), handlers);
        expect(shownWords()).toEqual(["Lamath", "Kerelar"]);
        expect(partMeanings()).toEqual(["Song", "Star", "Wolf", "Storm"]);
    });

    it("shows each table meaning over its own component, and a house's phrase over the whole house", () => {
        renderResult(drow, new Set(), handlers);
        expect(partMeanings()).toEqual(["Dagger", "Bandit", "Aged", "Shadow"]);
        const caption = (key) => document.querySelector(`[data-key="${key}"] .name-part-meaning`);
        expect(caption("f2").textContent).toBe("Bandit");
        expect(caption("n0")).toBeNull();
        expect(wordMeanings()).toEqual(["", "", "Blessed by fell powers"]);
    });

    it("glosses a Common-form family name over the word", () => {
        renderResult(withFamily(stargaze({ words: STARGAZE_WORDS }), "Alra Stargaze"), new Set(), handlers);
        expect(wordMeanings().at(-1)).toBe("star-gaze");
        expect(document.querySelector(".name-word-gloss").textContent).toBe("star-gaze");
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
    });

    it("shows a dwarf name's table meanings only, never an unknown one, since no dwarf name or clan has a meaning", () => {
        const builtDwarf = {
            name: "Tenured Ridaugaur",
            sex: "feminine",
            subrace: "duergar",
            parts: [
                meaning("g0", "prefix", "tenu", "Gold"),
                split("g1", "suffix", "red"),
                published("Ridaugaur", [book("Races of Faerun")], { key: "clan", role: "clan name", form: "dwarvish" })
            ]
        };
        renderResult(builtDwarf, new Set(), handlers);
        expect(partMeanings()).toEqual(["Gold", ""]);
        expect(wordMeanings()).toEqual(["", ""]);
        expect(document.querySelector(".name-word-unknown")).toBeNull();
    });

    it("lets each component of a built house be locked on its own", () => {
        renderResult(drow, new Set(["n1"]), handlers);
        const lock = (key) => document.querySelector(`[data-key="${key}"] .name-part-lock`);
        expect(lock("n0").getAttribute("aria-pressed")).toBe("false");
        expect(lock("n1").getAttribute("aria-pressed")).toBe("true");
    });

    it("says a name cut from published names has no known meaning", () => {
        renderResult(elf, new Set(["t1"]), handlers);
        // the published family name has no translation either, but it is not a split component, so it is not gold
        expect(wordMeanings()).toEqual(["Meaning unknown", "Meaning unknown"]);
        const gold = [...document.querySelectorAll(".name-word-unknown")].map(
            (u) => u.closest(".name-word").textContent
        );
        expect(gold).toEqual([expect.stringContaining("Alra")]);
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

    it("shows a published family-name translation above the name", () => {
        renderResult(withFamily(galanodel([book("Player's Handbook (5e)")]), "Alra Galanodel"), new Set(), handlers);
        expect(wordMeanings()).toEqual(["Meaning unknown", "Moonwhisper"]);
    });

    it("leaves apostrophes out of the script line, whose fonts cannot draw them", () => {
        renderResult(drow, new Set(), handlers);
        expect(document.getElementById("nameScript").textContent).toBe("Vicril Quarlin Baenre");
    });

    it("writes accented letters plainly and leaves punctuation out, which the script fonts draw as a box", () => {
        renderResult({ ...elf, name: "Naïlo Bhún-Taer, son of D'arn." }, new Set(), handlers);
        expect(document.getElementById("nameScript").textContent).toBe("Nailo BhunTaer son of Darn");
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
        renderResult({ ...elf, subrace: "shield-dwarf" }, new Set(), handlers);
        expect(script()).toEqual(["dethek", "Written in Dethek, the dwarven runes"]);
    });

    it("can return keyboard focus to a part after redrawing it", () => {
        renderResult(elf, new Set(), handlers);
        focusPart("t1", "lock");
        expect(document.activeElement).toBe(document.querySelector('[data-key="t1"] .name-part-lock'));
    });
});

describe("renderResult: the name read to screen readers", () => {
    const nameText = () => document.getElementById("nameText").textContent;
    const firstName = (sources) => published("Dorn", sources, { key: "given", role: "first name", section: "given" });
    const dwarf = (sources) => ({
        name: "Dorn Ironfist",
        sex: "male",
        subrace: "shield-dwarf",
        parts: [firstName(sources), joint("s1", "space", " "), published("Ironfist", [book("Dwarves Deep")])]
    });

    it("says a built name that matches a published one is a published name", () => {
        renderResult({ ...elf, published: { sources: [book("Cormanthyr")] } }, new Set(), handlers);
        expect(nameText()).toBe("Alra Starym, a published name");
    });

    it("says a whole published first name is a published name, and one from Ed Greenwood is his", () => {
        renderResult(dwarf([book("Dwarves Deep")]), new Set(), handlers);
        expect(nameText()).toBe("Dorn Ironfist, a published name");
        renderResult(dwarf([book("a forum answer", "creator")]), new Set(), handlers);
        expect(nameText()).toBe("Dorn Ironfist, a name used by Ed Greenwood");
    });

    it("says only the name when the first name is built and matches no published one, whatever the surname", () => {
        renderResult(elf, new Set(), handlers);
        expect(nameText()).toBe("Alra Starym");
    });
});

describe("openPartPicker", () => {
    HTMLDialogElement.prototype.showModal ??= function showModal() {
        this.open = true;
    };
    const details = () => [...document.querySelectorAll(".part-picker-option")].map((o) => o.textContent);

    it("shows a published house's book when it has no meaning, and a creator credit as such", () => {
        const house = (text, sources) => ({ ...published(text, sources), role: "house" });
        const tab = {
            kind: "published",
            options: [
                house("Aleval", [book("Dragon #267")]),
                house("Isprathas", [book("The Border Kingdoms (5e)", "creator")]),
                { ...house("Baenre", [book("Drow of the Underdark")]), meaning: "Blessed" }
            ],
            onPick: vi.fn()
        };
        openPartPicker([tab], { text: "none" });
        expect(details()).toEqual([
            "AlevalDragon #267",
            "BaenreBlessed",
            "IsprathasThe Border Kingdoms (5e) (Ed Greenwood's own)"
        ]);
    });
});

describe("openPartPicker marks the current part", () => {
    Element.prototype.scrollIntoView ??= () => {};
    it("marks only the entry the name has when two share a spelling", () => {
        const ro = (meaning) => ({ key: "t0", role: "suffix", text: "ro", meaning, section: "given", kind: "suffix" });
        const tab = {
            kind: "constructed",
            options: [ro("Summer"), ro("Walker, Walks")],
            onPick: vi.fn(),
            selected: true
        };
        openPartPicker([tab], ro("Walker, Walks"));
        const current = [...document.querySelectorAll('.part-picker-option[aria-current="true"]')];
        expect(current.map((o) => o.textContent)).toEqual(["roWalker, Walks"]);
    });
});

describe("renderPickers", () => {
    const settings = {
        speciesName: "elf",
        lineages: [
            { value: "high-elf", label: "any lineage" },
            { value: "drow", label: "drow" }
        ],
        styles: ["feminine", "masculine"],
        subrace: "drow",
        style: "masculine",
        expanded: true,
        smallPoolNote: ""
    };
    const $ = (id) => document.getElementById(id);

    it("lists the lineages it is given, in order, by label, and shows the settings", () => {
        renderPickers(settings);
        const options = [...$("pickerLineage").options].map((o) => [o.value, o.textContent]);
        expect(options).toEqual([
            ["high-elf", "any lineage"],
            ["drow", "drow"]
        ]);
        expect([$("pickerSpecies").value, $("pickerLineage").value, $("pickerSex").value]).toEqual([
            "elf",
            "drow",
            "masculine"
        ]);
        expect($("expandedToggle").getAttribute("aria-pressed")).toBe("true");
        expect([...$("pickerSex").options].filter((o) => !o.hidden).map((o) => o.value)).toEqual([
            "feminine",
            "masculine"
        ]);
    });

    it("keeps the lineage list's options when the lineages are the same", () => {
        renderPickers(settings);
        const first = $("pickerLineage").options[0];
        renderPickers({ ...settings, subrace: "high-elf" });
        expect($("pickerLineage").options[0]).toBe(first);
    });

    it("shows the small-pool note only when there is one", () => {
        renderPickers({ ...settings, smallPoolNote: "Repeats are normal." });
        expect($("smallPoolNote").hidden).toBe(false);
        expect($("smallPoolNote").textContent).toBe("Repeats are normal.");
        renderPickers(settings);
        expect($("smallPoolNote").hidden).toBe(true);
    });
});

describe("renderButtonConfirmation: the countdown line", () => {
    const button = () => document.getElementById("copyButton");

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("runs the line for exactly as long as the word stays", () => {
        renderButtonConfirmation(button(), "Copied");
        const lineMs = parseFloat(button().style.getPropertyValue("--confirm-ms"));
        expect(lineMs).toBeGreaterThan(0);
        vi.advanceTimersByTime(lineMs - 1);
        expect(button().hasAttribute("data-confirming")).toBe(true);
        vi.advanceTimersByTime(1);
        expect(button().hasAttribute("data-confirming")).toBe(false);
    });

    it("takes the line away with the word", () => {
        renderButtonConfirmation(button(), "Copied");
        vi.runAllTimers();
        expect(button().style.getPropertyValue("--confirm-ms")).toBe("");
    });

    it("draws one hidden-from-readers border line, however often it is pressed", () => {
        renderButtonConfirmation(button(), "Copied");
        renderButtonConfirmation(button(), "Copied");
        const lines = button().querySelectorAll(".icon-button-border");
        expect(lines).toHaveLength(1);
        expect(lines[0].getAttribute("aria-hidden")).toBe("true");
    });

    it("starts the line again when pressed again", () => {
        renderButtonConfirmation(button(), "Copied");
        const restart = vi.spyOn(button(), "getBoundingClientRect");
        renderButtonConfirmation(button(), "Copied");
        expect(restart).toHaveBeenCalled();
    });
});

describe("renderGlint: the name lights up while its button confirms", () => {
    const dials = () => document.getElementById("nameDials");
    const glinting = (node) => node.hasAttribute("data-glinting");

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("flashes the name briefly, much shorter than the button's word stays, then stops", () => {
        renderGlint(dials());
        expect(glinting(dials())).toBe(true);
        vi.advanceTimersByTime(599);
        expect(glinting(dials())).toBe(true);
        vi.advanceTimersByTime(1);
        expect(glinting(dials())).toBe(false);
    });

    it("starts over on a second press instead of stacking, and ends once", () => {
        renderGlint(dials());
        vi.advanceTimersByTime(400);
        renderGlint(dials());
        vi.advanceTimersByTime(400);
        expect(glinting(dials())).toBe(true);
        vi.advanceTimersByTime(200);
        expect(glinting(dials())).toBe(false);
    });

    it("stops with the card's confirmations when another name is shown", () => {
        renderGlint(dials());
        endCardConfirmations();
        expect(glinting(dials())).toBe(false);
        vi.runAllTimers();
        expect(glinting(dials())).toBe(false);
    });
});
