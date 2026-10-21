// Saved names, history and remembered settings, kept in this browser only. The saved-names key and record shape match the previous
// version of the site, so names saved there (including other races) are kept and still shown.
const STORAGE_KEY = "faerunNameFavorites";
const HISTORY_KEY = "faerunNameHistory";
const SETTING_PREFIX = "faerunNameSetting.";

/** A remembered choice (such as Expanded Variety); the fallback when none is stored or storage is unavailable. */
export function loadSetting(name, fallback) {
    try {
        const stored = localStorage.getItem(SETTING_PREFIX + name);
        return stored === null ? fallback : JSON.parse(stored);
    } catch {
        return fallback;
    }
}

export function saveSetting(name, value) {
    try {
        localStorage.setItem(SETTING_PREFIX + name, JSON.stringify(value));
    } catch {
        /* the choice still applies to this visit */
    }
}
export const MAX_FAVORITES = 100;

/** Recent results (newest first); empty when storage is unavailable or the record is unreadable. */
export function loadHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        return Array.isArray(saved) ? saved.filter((r) => r?.name && Array.isArray(r.parts)) : [];
    } catch {
        return [];
    }
}

/** History is a convenience: if the browser will not store it, it still works for this visit. */
export function saveHistory(history) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
        /* kept in memory only */
    }
}

export function loadFavorites() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

/** Adds a name; returns the updated list. Throws an Error with a user-facing message when it cannot be saved. */
export function addFavorite(favorites, result) {
    if (favorites.some((f) => f.name === result.name)) throw new Error("That name is already saved.");
    if (favorites.length >= MAX_FAVORITES) throw new Error(`You can save up to ${MAX_FAVORITES} names.`);
    // the full result is kept so a saved name can be loaded back with its parts and sources
    const record = { name: result.name, generatorType: "elven", subrace: result.subrace, savedAt: Date.now(), result };
    return save([...favorites, record]);
}

export function removeFavorite(favorites, name) {
    return save(favorites.filter((f) => f.name !== name));
}

/** Puts a removed record back where it was (Undo). */
export function restoreFavorite(favorites, record, index) {
    if (favorites.some((f) => f.name === record.name)) return favorites;
    return save([...favorites.slice(0, index), record, ...favorites.slice(index)]);
}

function save(favorites) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        return favorites;
    } catch {
        throw new Error("Your browser would not save the name. Storage may be full or turned off.");
    }
}
