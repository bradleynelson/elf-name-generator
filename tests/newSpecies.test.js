import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { SPECIES } from "../js/core/species.js";
import { SCHEMA } from "../js/core/speciesData.js";
import { readJson, readPage } from "./helpers/files.js";

// Registers a made-up species through its description, a rule set and a data file only, then uses it through the real
// page, app and storage: if adding a species ever needs a change elsewhere, this fails.
const page = readPage();
const $ = (id) => document.getElementById(id);

const GNOME = {
    analytics: "gnome",
    dataFile: "data/gnomeNames.json",
    script: { font: "dalelands", label: "Written in the test script" },
    lineages: [{ value: "rock-gnome", label: "rock gnome", analytics: "rock_gnome" }],
    lineageWords: { gnome: [], rock: ["rock-gnome"] }
};
const GNOME_DATA = {
    schema: SCHEMA,
    sources: { "test-book": { title: "Test book", authority: "official" } },
    names: [
        { text: "Bimpnottin", type: "given", lineages: ["rock"], sources: ["test-book"] },
        { text: "Orryn", type: "given", sources: ["test-book"] },
        { text: "Turen", type: "family", sources: ["test-book"] }
    ],
    tables: [],
    words: []
};

/** A generator for the made-up species: a published given name and family name, nothing to change or choose. */
class GnomeNameGenerator {
    constructor({ names }) {
        this.given = names.filter((n) => n.type === "given");
        this.family = names.find((n) => n.type === "family");
        this.rolls = 0;
    }

    generate({ subrace }) {
        const given = this.given[this.rolls++ % this.given.length];
        const whole = (name, key, section) => ({
            key,
            role: `${section} name`,
            text: name.text,
            method: "published",
            sources: name.sources,
            section,
            kind: "whole"
        });
        return {
            name: `${given.text} ${this.family.text}`,
            sex: "neutral",
            subrace,
            // the space between the given name and the family name is not a part (a space part joins given names)
            parts: [whole(given, "given", "given"), whole(this.family, "family", "family")]
        };
    }

    optionsFor() {
        return [];
    }

    getStructureControls() {
        return [];
    }

    getSurnameSwitchOptions() {
        return { kind: "published", options: [] };
    }

    generateStructureChange() {
        return null;
    }

    generateSurnameChange() {
        return null;
    }
}

const RULE_SET = { species: "gnome", lineages: ["rock-gnome"], reads: () => true, Generator: GnomeNameGenerator };

let registered;
beforeEach(async () => {
    vi.restoreAllMocks();
    document.documentElement.innerHTML = page;
    vi.doMock("../js/analytics.js", () => ({ track: () => {}, reportError: () => {}, setUpConsent: () => {} }));
    vi.stubGlobal("fetch", async (path) => ({
        ok: true,
        json: async () => (path.startsWith(GNOME.dataFile) ? GNOME_DATA : readJson(path.split("?")[0]))
    }));
    // the fresh module instances the app is about to import: register there, as an edit to the two files would
    vi.resetModules();
    registered = {
        species: (await import("../js/core/species.js")).SPECIES,
        ruleSets: (await import("../js/core/generators.js")).RULE_SETS
    };
    registered.species.gnome = GNOME;
    registered.ruleSets.push(RULE_SET);
});

afterEach(() => {
    delete registered.species.gnome;
    registered.ruleSets.splice(registered.ruleSets.indexOf(RULE_SET), 1);
});

describe("a new species", () => {
    it("is offered, named, written in its script, saved and shown again with no change to the app, page or storage", async () => {
        await import("../js/app.js");
        await vi.waitFor(() => expect($("nameText").textContent).not.toBe(""));
        const option = [...$("pickerLineage").options].find((o) => o.value === "rock-gnome");
        expect(option.textContent).toBe("rock gnome");
        $("pickerLineage").value = "rock-gnome";
        $("pickerLineage").dispatchEvent(new Event("change"));
        expect($("nameText").textContent).toBe("Bimpnottin Turen");
        expect($("nameScript").dataset.script).toBe("dalelands");
        expect($("nameScriptLabel").textContent).toBe("Written in the test script");
        expect($("nameSources").querySelector(".name-sources-from").textContent).toBe("Test book");
        $("saveButton").click();
        const [saved] = JSON.parse(localStorage.getItem("faerunNameFavorites"));
        expect(saved.result.subrace).toBe("rock-gnome");
        expect(document.querySelector("#favoritesList .name-list-name").tagName).toBe("BUTTON");
    });
});

describe("the app, page and storage", () => {
    // every string in the code (not comments): a species or lineage named here would need editing for a new one
    const strings = (file) =>
        [
            ...readFileSync(file, "utf8")
                .replace(/^\s*(\/\/|\*|\/\*).*$/gm, "")
                .matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)
        ].map((match) => match[2]);
    const named = Object.entries(SPECIES).flatMap(([name, species]) => [
        name,
        ...species.lineages.map((l) => l.value),
        ...Object.keys(species.lineageWords)
    ]);

    it.each(["js/app.js", "js/ui.js", "js/favorites.js"])("%s names no species or lineage", (file) => {
        const found = strings(file).filter((text) => named.some((word) => new RegExp(`\\b${word}\\b`, "i").test(text)));
        expect(found).toEqual([]);
    });
});
