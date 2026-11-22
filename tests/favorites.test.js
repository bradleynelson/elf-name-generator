import { describe, expect, it, vi } from "vitest";
import {
    MAX_FAVORITES,
    addFavorite,
    canLoadFavorite,
    loadFavorites,
    loadHistory,
    loadSetting,
    removeFavorite,
    restoreFavorite,
    saveHistory,
    saveSetting
} from "../js/favorites.js";

// Saved names and history live only in this browser; saving must never lose existing names or break the page.
const result = (name) => ({
    name,
    sex: "neutral",
    subrace: "moon-elf",
    parts: [{ key: "t0", role: "prefix", text: name, section: "given", kind: "prefix" }]
});

// A result as version 4.1.5 and earlier stored it: parts without section or kind, one `source` per published name and
// the books of a split component as titles.
const savedBy415 = {
    name: "Alra Elerae Starym",
    sex: "neutral",
    subrace: "sun-elf",
    published: { source: { title: "Cormanthyr", file: "Cormanthyr.pdf", pdfPages: [3], scope: "fr" } },
    tables: 'Races of the Wild (3.5e), first published in Dragon #251 (1998), "By Any Other Name"',
    parts: [
        { key: "t0", role: "prefix", text: "al", method: "split", from: ["Alarra"], books: ["Cormanthyr", "FRCS"] },
        { key: "tj1", role: "joining letter", text: "r" },
        { key: "t2", role: "suffix", text: "a", meaning: "Gift" },
        { key: "s3", role: "space", text: " " },
        {
            key: "family",
            role: "family name",
            text: "Starym",
            method: "published",
            // 4.1.5 stored Ed Greenwood's answers under their old credit line
            source: { title: "forum answer by Ed Greenwood, the Realms' creator", file: "Part 9.pdf", creator: true }
        }
    ]
};
const drowSavedBy415 = {
    name: "Vic Baenre",
    sex: "male",
    subrace: "drow",
    tables: "By Any Other Name: The Drow (Dragon #267)",
    parts: [
        { key: "f0", role: "prefix", text: "vic", meaning: "Death" },
        { key: "n0", role: "house prefix", text: "baen" },
        { key: "nj1", role: "joining letter", text: "r" },
        { key: "n1", role: "house suffix", text: "re" }
    ]
};

describe("saved names", () => {
    it("keeps a saved name across page loads, with its full result", () => {
        addFavorite(loadFavorites(), result("Ilsevel"));
        const [saved] = loadFavorites();
        expect(saved.name).toBe("Ilsevel");
        expect(saved.result.subrace).toBe("moon-elf");
    });

    it("refuses duplicates and names past the limit, leaving the list unchanged", () => {
        const list = addFavorite([], result("Ilsevel"));
        expect(() => addFavorite(list, result("Ilsevel"))).toThrow(/already saved/);
        const full = Array.from({ length: MAX_FAVORITES }, (_, i) => ({ name: `Name${i}` }));
        expect(() => addFavorite(full, result("Ilsevel"))).toThrow(/up to/);
        expect(loadFavorites()).toHaveLength(1);
    });

    it("removes only the named entry", () => {
        const list = addFavorite(addFavorite([], result("Ilsevel")), result("Aerith"));
        expect(removeFavorite(list, "Ilsevel").map((f) => f.name)).toEqual(["Aerith"]);
        expect(loadFavorites().map((f) => f.name)).toEqual(["Aerith"]);
    });

    it("puts a removed name back in its old place (Undo), once", () => {
        const list = addFavorite(addFavorite(addFavorite([], result("A")), result("B")), result("C"));
        const record = list[1];
        const restored = restoreFavorite(removeFavorite(list, "B"), record, 1);
        expect(restored.map((f) => f.name)).toEqual(["A", "B", "C"]);
        expect(restoreFavorite(restored, record, 1)).toHaveLength(3);
        expect(loadFavorites().map((f) => f.name)).toEqual(["A", "B", "C"]);
    });

    it("preserves legacy records when saving another name", () => {
        const older = { name: "Thorin Ironfist", generatorType: "dwarven", savedAt: 1 };
        const otherRace = { name: "Bimpnottin", result: { ...result("Bimpnottin"), subrace: "rock-gnome" } };
        localStorage.setItem("faerunNameFavorites", JSON.stringify([older, otherRace]));

        addFavorite(loadFavorites(), result("Ilsevel"));

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
        expect(() => addFavorite([], result("Ilsevel"))).toThrow(/would not save/);
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
        const [split, , table, , family] = elf.parts;
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
        expect(drow.parts.find((p) => p.key === "nj1").sources).toBeUndefined();
        expect(family).toMatchObject({
            section: "family",
            kind: "whole",
            sources: [{ title: "Forum answer by Ed Greenwood (Realms creator)", authority: "creator" }]
        });
        expect(family.source).toBeUndefined();
        // a drow house and the joining letter inside a surname belong to the family name
        expect(drow.parts.map((p) => [p.section, p.kind])).toEqual([
            ["given", "prefix"],
            ["family", "prefix"],
            ["family", "joint"],
            ["family", "suffix"]
        ]);
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
