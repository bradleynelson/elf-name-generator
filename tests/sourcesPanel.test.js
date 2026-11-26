import { beforeEach, describe, expect, it } from "vitest";
import { formatSourceTitle, renderSources } from "../js/sourcesPanel.js";
import { readPage } from "./helpers/files.js";
import {
    book,
    DRAGON_267,
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

// The panel is drawn into the real page markup, so a renamed or removed element fails here rather than on the live site.
const page = readPage();
// [label, what the part is, its source line] per row; a row with no source line has two entries
const rows = () =>
    [...document.querySelectorAll(".name-sources-row")].map((row) => {
        const from = row.querySelector(".name-sources-from");
        const label = row.querySelector(".name-sources-label").textContent;
        const text = row.querySelector(".name-sources-text").textContent;
        return from ? [label, text, from.textContent] : [label, text];
    });
const visibleText = (selector) =>
    [...document.querySelector(selector).childNodes]
        .filter((node) => !node.hidden && node.tagName !== "BUTTON")
        .map((node) => node.textContent)
        .join("");
const moreButtons = () => [...document.querySelectorAll(".name-sources-more")];

beforeEach(() => {
    document.documentElement.innerHTML = page;
});

describe("renderSources", () => {
    it("says why a joining letter was added, with the book its rule is from", () => {
        renderSources(joinedSurname);
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
        renderSources(saved);
        expect(rows()[1]).toEqual(["Joining letter", "-e- added so the components join smoothly"]);
    });

    it("says what each part is, then credits its sources on a line of its own; no separate tables row", () => {
        const sourced = { ...drow, parts: drow.parts.map((p) => (p.meaning ? { ...p, sources: DRAGON_267 } : p)) };
        renderSources(sourced);
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
        renderSources(family([book("Races of the Wild (3.5e)"), book("Dragon #251")]));
        expect(rows().at(-1)[2]).toBe("Races of the Wild (3.5e); Dragon #251");
        expect(moreButtons()).toEqual([]);

        renderSources(family([book("Cormanthyr"), book("Elves of Evermeet (2e)"), book("Dragon #251")]));
        const [more] = moreButtons();
        const rest = document.querySelector(".name-sources-from .name-sources-rest");
        const shown = () => [more.textContent, more.getAttribute("aria-expanded"), rest.hidden];
        expect(shown()).toEqual(["and 2 more", "false", true]);
        more.click();
        expect(shown()).toEqual(["show fewer", "true", false]);
        expect(rest.textContent).toBe("; Elves of Evermeet (2e); Dragon #251");
        more.click();
        expect(shown()).toEqual(["and 2 more", "false", true]);
    });

    it("words a split component as cut from its names: up to three in full, then two and a button", () => {
        const cut = (from) => ({ ...elf, parts: [{ ...elf.parts[0], from }, ...elf.parts.slice(1)] });
        renderSources(cut(["Alarra", "Alavara", "Alais"]));
        expect(rows()[0]).toEqual(["Prefix", "al- cut from Alarra, Alavara and Alais", "Cormanthyr"]);
        renderSources(cut(["Alarra", "Alavara", "Alais", "Alea"]));
        const [more] = moreButtons();
        expect(more.textContent).toBe("and 2 more names");
        const rest = document.querySelector(".name-sources-text .name-sources-rest");
        expect([rest.hidden, rest.textContent]).toEqual([true, ", Alais, Alea"]);
    });

    it("says a split component's names and books are examples when it was cut from more than it cites", () => {
        const cut = (more) => ({
            ...elf,
            parts: [
                { ...elf.parts[0], from: ["Alarra", "Alavara", "Alais", "Alea", "Alin"], ...more },
                ...elf.parts.slice(1)
            ]
        });
        renderSources(cut({ fromTotal: 18, sourcesTotal: 24 }));
        expect(visibleText(".name-sources-text")).toBe("al- cut from 18 names in 24 books; examples: Alarra, Alavara");
        expect(moreButtons()[0].textContent).toBe("and 3 more examples");
        expect(rows()[0][2]).toBe("in the examples: Cormanthyr");
        renderSources(cut({ fromTotal: 6, sourcesTotal: 1 }));
        expect(visibleText(".name-sources-text")).toContain("cut from 6 names in 1 book; examples:");
        renderSources(cut({ fromTotal: 5, sourcesTotal: 1 }));
        expect(visibleText(".name-sources-text")).toBe("al- cut from Alarra, Alavara");
        expect(rows()[0][2]).toBe("Cormanthyr");
    });

    it("labels five names saved before the totals were kept as examples, without totals", () => {
        const old = {
            ...elf,
            parts: [{ ...elf.parts[0], from: ["Alarra", "Alavara", "Alais", "Alea", "Alin"] }, ...elf.parts.slice(1)]
        };
        renderSources(old);
        expect(visibleText(".name-sources-text")).toBe("al- cut from names; examples: Alarra, Alavara");
        expect(moreButtons()[0].textContent).toBe("and 3 more examples");
    });

    it("draws a split component saved with neither its names nor a total (a shape the saved-name check accepts)", () => {
        const bare = { ...elf, parts: [{ ...elf.parts[0], from: undefined }, ...elf.parts.slice(1)] };
        expect(() => renderSources(bare)).not.toThrow();
    });

    it("says a source is Ed Greenwood's own unless its title already says so", () => {
        const own = book("The Border Kingdoms (5e)", "creator");
        const forum = book("a forum answer by Ed Greenwood, the Realms' creator", "creator");
        renderSources({ ...elf, parts: [...elf.parts.slice(0, 2), published("Isprathas", [own])] });
        expect(rows().at(-1)[2]).toBe("The Border Kingdoms (5e) (Ed Greenwood's own)");
        renderSources({ ...elf, parts: [...elf.parts.slice(0, 2), published("Isprathas", [forum])] });
        expect(rows().at(-1)[2]).toBe(forum.title);
        expect(formatSourceTitle(book("Cormanthyr"))).toBe("Cormanthyr");
    });

    it("names the published family names a Common-form family name's words appear in", () => {
        const render = (part) => renderSources(withFamily(part, "Alra Stargaze"));
        render(stargaze({ words: STARGAZE_WORDS }));
        expect(rows().slice(-2)).toEqual([
            ["Family name, first word", '"star" as in Starbrow and Starfall', "Lost Empires of Faerun; Cormanthyr"],
            ["Family name, second word", '"gaze" as in Moongaze', "Lost Empires of Faerun"]
        ]);
        render(
            stargaze({
                words: [
                    { ...STARGAZE_WORDS[0], names: ["Starbrow", "Starfall", "Stardancer", "Starwind"] },
                    STARGAZE_WORDS[1]
                ]
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

    it("lists a split component by the names it was cut from, without a meaning", () => {
        const mixed = {
            ...elf,
            name: "Sapral Alra",
            parts: [meaning("t0", "prefix", "sap", "Sapphire"), split("t1", "suffix", "ral")]
        };
        renderSources(mixed);
        expect(rows()[1]).toEqual(["Suffix", "-ral cut from Alarra"]);
    });

    it("shows the books each part of a name cut from published names comes from", () => {
        renderSources(elf);
        expect(rows()).toEqual([
            ["Prefix", "al- cut from Alarra", "Cormanthyr"],
            ["Suffix", "-ra cut from Amra"],
            ["Family name", "Starym", "Cormanthyr"]
        ]);
    });

    it("notes a published match with its sources, in the order the core gives", () => {
        const ed = book("a forum answer by Ed Greenwood, the Realms' creator", "creator");
        renderSources({ ...elf, published: { sources: [ed, book("Cormanthyr")] } });
        expect(rows()[0]).toEqual([
            "Published name",
            "Alra",
            "a forum answer by Ed Greenwood, the Realms' creator; Cormanthyr"
        ]);
        renderSources({ ...elf, published: { sources: [book("Cormanthyr"), ed] } });
        expect(rows()[0][2]).toBe("Cormanthyr; a forum answer by Ed Greenwood, the Realms' creator");
    });

    it("names only the first name as published, whatever phrases and clan follow it", () => {
        const word = (key, role, text, section = "phrase") => ({ ...published(text, []), key, role, section });
        const connector = (key, text) => joint(key, "phrase word", text, "phrase");
        const space = (key) => joint(key, "space", " ", "phrase");
        const given = [meaning("g0", "prefix", "uli", "Iron"), meaning("g1", "suffix", "farn", "Hammer")];
        const dwarf = (name, parts) => ({
            name,
            sex: "male",
            subrace: "duergar",
            shape: ["prefix", "suffix"],
            parts: [...given, ...parts],
            published: { sources: [book("Dragon #281")] }
        });
        const clan = (key) => [space(key), word("clan", "clan name", "Anvilbreaker", "family")];
        renderSources(
            dwarf("Ulifarn Than Droon Anvilbreaker", [
                space("p2"),
                connector("p3", "Than"),
                space("p4"),
                word("parent", "parent's name", "Droon"),
                ...clan("p6")
            ])
        );
        expect(rows()[0]).toEqual(["Published name", "Ulifarn", "Dragon #281"]);
        renderSources(
            dwarf("Ulifarn Anvilbreaker, son of Droon, of Tethyamar", [
                ...clan("p2"),
                connector("p4", ","),
                space("p5"),
                connector("p6", "son of"),
                space("p7"),
                word("parent", "parent's name", "Droon"),
                connector("p9", ","),
                space("p10"),
                connector("p11", "of"),
                space("p12"),
                word("place", "place", "Tethyamar")
            ])
        );
        expect(rows()[0]).toEqual(["Published name", "Ulifarn", "Dragon #281"]);
    });

    it("gives a published family name's translation, naming its book only when it is another", () => {
        const render = (sources) => renderSources(withFamily(galanodel(sources), "Alra Galanodel"));
        render([book("Player's Handbook (5e)")]);
        expect(rows().at(-1)).toEqual(["Family name", 'Galanodel means "Moonwhisper"', "Player's Handbook (5e)"]);
        render([book("Xanathar's Guide to Everything (5e)"), book("Player's Handbook (5e)")]);
        expect(rows().at(-1)[2]).toBe(
            "Xanathar's Guide to Everything (5e); Player's Handbook (5e) · meaning from Player's Handbook (5e)"
        );
    });

    it("shows a name saved by an older version, which cites its tables apart and gives parts no sources", () => {
        renderSources({ ...drow, tables: "By Any Other Name: The Drow (Dragon #267)" });
        expect(rows()[0]).toEqual(["Prefix", 'vic- means "Dagger, knife"']);
        expect(rows().map(([label]) => label)).not.toContain("Tables");
    });
});
