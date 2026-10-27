// Saved names, history and remembered settings, kept in this browser only. The saved-names key and record shape match the previous
// version of the site, so names saved there (including other races) are kept and still shown.
import { ELF_SUBRACES } from "./core/ElfNameGenerator.js?v=4.1.3";

const STORAGE_KEY = "faerunNameFavorites";
const HISTORY_KEY = "faerunNameHistory";
const SETTING_PREFIX = "faerunNameSetting.";

/** False when the browser blocks storage (private window, strict privacy settings, "block all site data"). */
export function storageAvailable() {
    try {
        const key = "faerunNameStorageCheck";
        localStorage.setItem(key, "1");
        localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

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

const SUBRACES = [...ELF_SUBRACES, "drow"];
const isText = (value) => typeof value === "string" && value !== "";

/**
 * True if a stored result can be shown and built on again: a name, a lineage this version offers, and parts that each
 * have a key, a role and text. Records from older versions or edited by hand may fail this.
 */
function validateResult(result) {
    return (
        isText(result?.name) &&
        SUBRACES.includes(result.subrace) &&
        Array.isArray(result.parts) &&
        result.parts.length > 0 &&
        result.parts.every((part) => isText(part?.key) && isText(part.role) && typeof part.text === "string")
    );
}

/** Reads a stored list; anything that is not a list (missing, unreadable, blocked storage) reads as empty. */
function loadList(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

/** Recent results (newest first); entries that cannot be shown are skipped. */
export function loadHistory() {
    return loadList(HISTORY_KEY).filter(validateResult);
}

/** History is a convenience: if the browser will not store it, it still works for this visit. */
export function saveHistory(history) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
        /* kept in memory only */
    }
}

/**
 * Saved names; a record without a name is skipped. Records are kept as stored: one whose result cannot be shown (saved
 * by an older version, or for another race) is still listed and can be copied (see canLoadFavorite).
 */
export function loadFavorites() {
    return loadList(STORAGE_KEY).filter((record) => isText(record?.name));
}

/** True if a saved name can be shown again with its components, rather than only listed. */
export const canLoadFavorite = (record) => validateResult(record.result);

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
