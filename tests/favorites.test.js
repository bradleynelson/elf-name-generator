import { describe, expect, it, vi } from "vitest";
import {
    MAX_FAVORITES,
    addFavorite,
    loadFavorites,
    loadHistory,
    loadSetting,
    removeFavorite,
    restoreFavorite,
    saveHistory,
    saveSetting
} from "../js/favorites.js";

// Saved names and history live only in this browser; saving must never lose existing names or break the page.
const result = (name) => ({ name, sex: "neutral", subrace: "moon-elf", parts: [{ key: "t0", text: name }] });

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
        saveHistory([result("Ilsevel"), { name: "Broken" }, null]);
        expect(loadHistory().map((r) => r.name)).toEqual(["Ilsevel"]);
        localStorage.setItem("faerunNameHistory", "{not json");
        expect(loadHistory()).toEqual([]);
    });

    it("keeps working for the visit when the browser will not store history", () => {
        const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("SecurityError");
        });
        expect(() => saveHistory([result("Ilsevel")])).not.toThrow();
        setItem.mockRestore();
    });
});
