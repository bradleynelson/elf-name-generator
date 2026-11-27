import { describe, expect, it, vi } from "vitest";
import {
    MAX_FAVORITES,
    addFavorite,
    canLoadFavorite,
    isFromOldSite,
    loadFavorites,
    loadHistory,
    loadSetting,
    watchSavedNames,
    removeFavorite,
    restoreFavorite,
    saveHistory,
    saveSetting
} from "../js/favorites.js";
import { createGeneratorFor } from "../js/core/generators.js";
import { SUBRACES } from "../js/core/species.js";
import { readSpeciesData, stylesOf } from "./helpers/nameData.js";
import { seededRandom } from "./helpers/random.js";
import { drowSavedBy415, savedBy415 } from "./helpers/storedNames.js";

// Saved names and history live only in this browser; saving must never lose existing names or break the page.
const result = (name) => ({
    name,
    sex: "neutral",
    subrace: "moon-elf",
    parts: [{ key: "t0", role: "prefix", text: name, meaning: "Gift", section: "given", kind: "prefix" }]
});

describe("saved names", () => {
    const savedNames = () => loadFavorites().map((f) => f.name);
    const saveInAnotherTab = (...names) =>
        localStorage.setItem(
            "faerunNameFavorites",
            JSON.stringify(names.map((name) => ({ name, result: result(name) })))
        );

    it("keeps a saved name across page loads, with its full result", () => {
        addFavorite(result("Ilsevel"));
        const [saved] = loadFavorites();
        expect(saved.name).toBe("Ilsevel");
        expect(saved.result.subrace).toBe("moon-elf");
    });

    it("refuses duplicates and names past the limit, leaving the list unchanged", () => {
        addFavorite(result("Ilsevel"));
        expect(() => addFavorite(result("Ilsevel"))).toThrow(/already saved/);
        saveInAnotherTab(...Array.from({ length: MAX_FAVORITES }, (_, i) => `Name${i}`));
        expect(() => addFavorite(result("Ilsevel"))).toThrow(/up to/);
        expect(loadFavorites()).toHaveLength(MAX_FAVORITES);
    });

    it("removes only the named entry", () => {
        addFavorite(result("Ilsevel"));
        expect(addFavorite(result("Aerith")).map((f) => f.name)).toEqual(["Ilsevel", "Aerith"]);
        expect(removeFavorite("Ilsevel").map((f) => f.name)).toEqual(["Aerith"]);
        expect(savedNames()).toEqual(["Aerith"]);
    });

    it("puts a removed name back in its old place (Undo), once", () => {
        ["A", "B", "C"].forEach((name) => addFavorite(result(name)));
        const record = loadFavorites()[1];
        removeFavorite("B");
        expect(restoreFavorite(record, 1).map((f) => f.name)).toEqual(["A", "B", "C"]);
        expect(restoreFavorite(record, 1)).toHaveLength(3);
        expect(savedNames()).toEqual(["A", "B", "C"]);
    });

    it("refuses to put a removed name back past the limit, leaving the list unchanged", () => {
        addFavorite(result("Ilsevel"));
        const record = loadFavorites()[0];
        removeFavorite("Ilsevel");
        saveInAnotherTab(...Array.from({ length: MAX_FAVORITES }, (_, i) => `Name${i}`));
        expect(() => restoreFavorite(record, 0)).toThrow(/Saved names is full/);
        expect(loadFavorites()).toHaveLength(MAX_FAVORITES);
    });

    it("applies each save, removal and Undo to the names stored by another tab since", () => {
        addFavorite(result("Solvia Haellon"));
        saveInAnotherTab("Solvia Haellon", "Drerae Iliathor");
        expect(addFavorite(result("Aerith")).map((f) => f.name)).toEqual([
            "Solvia Haellon",
            "Drerae Iliathor",
            "Aerith"
        ]);
        const record = loadFavorites()[0];
        removeFavorite("Solvia Haellon");
        saveInAnotherTab("Aerith");
        expect(restoreFavorite(record, 0).map((f) => f.name)).toEqual(["Solvia Haellon", "Aerith"]);
        saveInAnotherTab("Solvia Haellon", "Ilsevel", "Aerith");
        expect(removeFavorite("Aerith").map((f) => f.name)).toEqual(["Solvia Haellon", "Ilsevel"]);
        expect(savedNames()).toEqual(["Solvia Haellon", "Ilsevel"]);
    });

    it("tells a listener when another tab changes or clears the saved names, and nothing else", () => {
        const listener = vi.fn();
        watchSavedNames(listener);
        window.dispatchEvent(new StorageEvent("storage", { key: "faerunNameHistory" }));
        expect(listener).not.toHaveBeenCalled();
        window.dispatchEvent(new StorageEvent("storage", { key: "faerunNameFavorites" }));
        window.dispatchEvent(new StorageEvent("storage", { key: null }));
        expect(listener).toHaveBeenCalledTimes(2);
    });

    it("preserves legacy records when saving another name", () => {
        const older = { name: "Thorin Ironfist", generatorType: "dwarven", savedAt: 1 };
        const otherRace = { name: "Bimpnottin", result: { ...result("Bimpnottin"), subrace: "rock-gnome" } };
        localStorage.setItem("faerunNameFavorites", JSON.stringify([older, otherRace]));

        addFavorite(result("Ilsevel"));

        const stored = JSON.parse(localStorage.getItem("faerunNameFavorites"));
        expect(stored.slice(0, 2)).toEqual([older, otherRace]);
        expect(stored[2].result).toEqual(result("Ilsevel"));
        expect(loadFavorites()).toEqual(stored);
    });

    it("shows a name saved by 4.1.5 or earlier with each part's section, kind and sources, keeping it as stored", () => {
        const stored = [{ name: savedBy415.name, result: savedBy415 }];
        localStorage.setItem("faerunNameFavorites", JSON.stringify(stored));
        const [record] = loadFavorites();
        expect(canLoadFavorite(record)).toBe(true);
        expect(record.result.parts.map((p) => [p.section, p.kind])).toEqual([
            ["given", "prefix"],
            ["given", "joint"],
            ["given", "suffix"],
            ["given", "joint"],
            ["family", "whole"]
        ]);
        expect(JSON.parse(localStorage.getItem("faerunNameFavorites"))).toEqual(stored);
    });

    it("explains when the browser will not store a name", () => {
        const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("QuotaExceededError");
        });
        expect(() => addFavorite(result("Ilsevel"))).toThrow(/storage is full or turned off/);
        setItem.mockRestore();
    });

    it("treats unreadable saved data as an empty list", () => {
        localStorage.setItem("faerunNameFavorites", "{not json");
        expect(loadFavorites()).toEqual([]);
    });

    it("skips records without a name and keeps older ones as stored, loadable only if their result is usable", () => {
        const older = { name: "Thorin Ironfist", generatorType: "dwarven", savedAt: 1 }; // saved by v3, text only
        const damaged = { name: "Ilsevel", result: { name: "Ilsevel", subrace: "moon-elf", parts: [null] } };
        const otherRace = { name: "Bimpnottin", result: { ...result("Bimpnottin"), subrace: "rock-gnome" } };
        const good = { name: "Aerith", result: result("Aerith") };
        const stored = [null, { savedAt: 2 }, older, damaged, otherRace, good];
        localStorage.setItem("faerunNameFavorites", JSON.stringify(stored));
        const loaded = loadFavorites();
        expect(loaded).toEqual([older, damaged, otherRace, good]);
        expect(loaded.map(canLoadFavorite)).toEqual([false, false, false, true]);
    });
});

describe("isFromOldSite", () => {
    // what the v3 site stored for a dwarf: text and parts, no result
    const v3Dwarf = { name: "Amar Fireok", generatorType: "dwarven", subrace: "general", firstName: { name: "Amar" } };

    it("is true for a record without a result, which no current version stores", () => {
        expect(isFromOldSite(v3Dwarf)).toBe(true);
        expect(isFromOldSite({ name: "Thorin", generatorType: "elven", savedAt: 1 })).toBe(true);
    });

    it("is false for a record with a result, usable or not", () => {
        const damaged = { name: "Ilsevel", result: { name: "Ilsevel", subrace: "moon-elf", parts: [null] } };
        expect(isFromOldSite({ name: "Aerith", result: result("Aerith") })).toBe(false);
        expect(isFromOldSite(damaged)).toBe(false);
    });
});

describe("records a page cannot render", () => {
    const withPart = (part) => ({ ...result("Broken"), parts: [{ ...result("x").parts[0], ...part }] });
    const noMeaning = withPart({ meaning: undefined });
    const booksAsText = withPart({
        key: "t0",
        role: "prefix",
        section: undefined,
        kind: undefined,
        books: "Cormanthyr"
    });
    const publishedWithoutSources = withPart({ role: "family name", kind: "whole", method: "published" });
    const unplaced = withPart({ kind: "middle" });
    const splitTotalWithoutNames = withPart({ method: "split", fromTotal: 18, sourcesTotal: 24 });
    const damaged = [noMeaning, booksAsText, publishedWithoutSources, unplaced, splitTotalWithoutNames];

    it.each(damaged.map((record) => [record.parts[0], record]))(
        "lists a saved name with %j as text only and keeps it as stored",
        (_, record) => {
            const stored = [
                { name: "Broken", result: record },
                { name: "Aerith", result: result("Aerith") }
            ];
            localStorage.setItem("faerunNameFavorites", JSON.stringify(stored));
            expect(loadFavorites()).toEqual(stored);
            expect(loadFavorites().map(canLoadFavorite)).toEqual([false, true]);
        }
    );

    it.each(damaged.map((record) => [record.parts[0], record]))(
        "skips a history entry with %j and loads the rest",
        (_, record) => {
            saveHistory([result("Aerith"), record, result("Ilsevel")]);
            expect(loadHistory().map((r) => r.name)).toEqual(["Aerith", "Ilsevel"]);
        }
    );

    it("keeps every name the generators make, so no real saved name is stranded", () => {
        const generatorFor = createGeneratorFor(readSpeciesData());
        const random = seededRandom(20261122);
        const made = SUBRACES.flatMap((subrace) =>
            stylesOf(generatorFor, subrace).flatMap((style) =>
                Array.from({ length: 30 }, () =>
                    generatorFor(subrace).generate({ subrace, style, expanded: style === "neutral", random })
                )
            )
        );
        saveHistory(made);
        expect(loadHistory()).toHaveLength(made.length);
    });
});

describe("remembered settings", () => {
    it("returns the fallback until a choice is saved, then the choice", () => {
        expect(loadSetting("expandedVariety", false)).toBe(false);
        saveSetting("expandedVariety", true);
        expect(loadSetting("expandedVariety", false)).toBe(true);
    });
});

describe("history", () => {
    it("keeps history across page loads and skips entries it cannot show", () => {
        const brokenPart = { ...result("Aerith"), parts: [{ key: "t0" }] };
        const unknownLineage = { ...result("Bimpnottin"), subrace: "rock-gnome" };
        saveHistory([result("Ilsevel"), { name: "Broken" }, null, brokenPart, unknownLineage]);
        expect(loadHistory().map((r) => r.name)).toEqual(["Ilsevel"]);
        localStorage.setItem("faerunNameHistory", "{not json");
        expect(loadHistory()).toEqual([]);
    });

    it("fills in what a result saved by 4.1.5 or earlier lacks: section, kind and sources", () => {
        saveHistory([savedBy415, drowSavedBy415]);
        const [elf, drow] = loadHistory();
        expect(elf.published).toEqual({ sources: [{ title: "Cormanthyr", authority: "official" }] });
        const [split, joint, table, , family] = elf.parts;
        expect(split).toEqual({
            key: "t0",
            role: "prefix",
            text: "al",
            method: "split",
            from: ["Alarra"],
            sources: [{ title: "Cormanthyr" }, { title: "FRCS" }],
            section: "given",
            kind: "prefix"
        });
        expect(table.sources).toEqual([
            { title: "Races of the Wild (3.5e)", authority: "official" },
            { title: "Dragon #251", authority: "official" }
        ]);
        expect(drow.parts[0].sources).toEqual([{ title: "Dragon #267", authority: "official" }]);
        expect(joint.sources).toBeUndefined();
        expect(family).toMatchObject({
            section: "family",
            kind: "whole",
            sources: [{ title: "Forum answer by Ed Greenwood (Realms creator)", authority: "creator" }]
        });
        expect(family.source).toBeUndefined();
        expect(drow.parts.map((p) => [p.section, p.kind])).toEqual([
            ["given", "prefix"],
            ["family", "prefix"],
            ["family", "suffix"]
        ]);
    });

    describe("a Common-form family name saved by an earlier version", () => {
        const lore = { title: "Lost Empires of Faerun", authority: "official" };
        const withFamily = (family) => ({
            ...result("Alra"),
            name: "Alra Stargaze",
            parts: [
                ...result("Alra").parts,
                {
                    key: "family",
                    role: "family name",
                    text: "Stargaze",
                    method: "composed",
                    section: "family",
                    kind: "whole",
                    ...family
                }
            ]
        });
        const familyRead = (stored) => {
            saveHistory([stored]);
            return loadHistory()[0]?.parts.at(-1);
        };

        it("gives each word its own record, from the three lists 4.2.0 kept", () => {
            const family = familyRead(
                withFamily({
                    words: ["Star", "gaze"],
                    wordNames: [["Starfall"], ["Moongaze"]],
                    wordSources: [[lore], [lore]]
                })
            );
            expect(family.words).toEqual([
                { text: "Star", names: ["Starfall"], sources: [lore] },
                { text: "gaze", names: ["Moongaze"], sources: [lore] }
            ]);
            expect(family).not.toHaveProperty("wordNames");
            expect(family).not.toHaveProperty("wordSources");
        });

        it("keeps one saved with only its two words, or with where they come from", () => {
            const words = [{ text: "Star" }, { text: "gaze" }];
            expect(familyRead(withFamily({ words: ["Star", "gaze"] })).words).toEqual(words);
            const from = familyRead(withFamily({ words: ["Star", "gaze"], wordsFrom: "published family names" }));
            expect([from.words, from.wordsFrom]).toEqual([words, "published family names"]);
        });

        it.each([
            ["one word", { words: ["Stargaze"] }],
            ["names for one word only", { words: ["Star", "gaze"], wordNames: [["Starfall"]], wordSources: [[lore]] }],
            ["names without books", { words: ["Star", "gaze"], wordNames: [["Starfall"], ["Moongaze"]] }],
            ["a word record without its books", { words: [{ text: "Star", names: ["Starfall"] }, { text: "gaze" }] }]
        ])("skips one with %s", (_, family) => {
            expect(familyRead(withFamily(family))).toBeUndefined();
        });
    });

    it("leaves a result saved by this version as it is", () => {
        saveHistory([result("Ilsevel")]);
        expect(loadHistory()).toEqual([result("Ilsevel")]);
    });

    it("keeps working for the visit when the browser will not store history", () => {
        const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("SecurityError");
        });
        expect(() => saveHistory([result("Ilsevel")])).not.toThrow();
        setItem.mockRestore();
    });
});
