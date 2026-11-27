// Saved names, history and settings in browser storage. The saved-names key and record shape are unchanged from the
// previous site, so older names (including other races) still show.
import {
    getStoredPlace,
    getStoredTableSources,
    groupWords,
    KIND,
    METHOD,
    SECTION
} from "./core/nameStructure.js?v=4.3.2";
import { getLineage } from "./core/species.js?v=4.3.2";

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

const isText = (value) => typeof value === "string" && value !== "";

const isCount = (value) => value === undefined || (Number.isInteger(value) && value >= 0);
const isTextList = (items) => Array.isArray(items) && items.every(isText);
const isSourceList = (sources) => Array.isArray(sources) && sources.every((source) => isText(source?.title));
const hasEvidence = (word) => isTextList(word.names) && isSourceList(word.sources);
const hasNoEvidence = (word) => word.names === undefined && word.sources === undefined;

const PART_CHECKS = {
    // a total without its names cannot be drawn (the page compares the total with the names it lists)
    split: (part) =>
        (part.from === undefined ? part.fromTotal === undefined : isTextList(part.from)) &&
        isCount(part.fromTotal) &&
        isCount(part.sourcesTotal),
    published: (part) => isSourceList(part.sources) && part.sources.length > 0,
    composed: ({ words }) =>
        Array.isArray(words) &&
        words.length === 2 &&
        words.every((word) => isText(word?.text)) &&
        (words.every(hasEvidence) || words.every(hasNoEvidence))
};
const hasMeaningIfSlot = (part) =>
    (part.kind !== KIND.PREFIX && part.kind !== KIND.SUFFIX) || typeof part.meaning === "string";

const isPlaced = (part) => Object.values(SECTION).includes(part.section) && Object.values(KIND).includes(part.kind);
const canRenderPart = (part) =>
    isPlaced(part) &&
    (part.sources === undefined || isSourceList(part.sources)) &&
    (PART_CHECKS[part.method] ?? hasMeaningIfSlot)(part);

// A stored result this version can draw and build on, or null (however it is damaged); older ones are filled in.
function validateResult(result) {
    try {
        const isUsable =
            isText(result?.name) &&
            Boolean(getLineage(result.subrace)) &&
            Array.isArray(result.parts) &&
            result.parts.length > 0 &&
            result.parts.every((part) => isText(part?.key) && isText(part.role) && typeof part.text === "string");
        if (!isUsable) return null;
        const placed = result.parts.every((part) => part.section && part.kind) ? result : fillStoredResult(result);
        const filled = { ...placed, parts: placed.parts.map(toWordRecords) };
        const isDrawable =
            (filled.published?.sources === undefined || isSourceList(filled.published.sources)) &&
            filled.parts.every(canRenderPart) &&
            groupWords(filled.parts).every((word) => word.length > 0);
        return isDrawable ? filled : null;
    } catch {
        return null;
    }
}

// What 4.1.5 and earlier did not store: parts' section and kind, and `sources` in place of `source`, `books` or one
// `tables` line. Their only creator sources were Ed Greenwood's forum answers, which take today's credit line.
const FORUM_ANSWER = "Forum answer by Ed Greenwood (Realms creator)";
function fillStoredResult(result) {
    const sourceOf = ({ title, creator }) =>
        creator ? { title: FORUM_ANSWER, authority: "creator" } : { title, authority: "official" };
    const sourcesOf = ({ source, books, meaning, method }) => {
        if (source) return [sourceOf(source)];
        if (books) return books.map((title) => ({ title }));
        if (meaning && !method) return getStoredTableSources(result.tables);
    };
    const parts = result.parts.map(({ source, books, ...part }) => {
        const sources = sourcesOf({ source, books, ...part });
        return { ...part, ...(sources ? { sources } : {}), ...getStoredPlace(part) };
    });
    const published = result.published?.source ? { published: { sources: [sourceOf(result.published.source)] } } : {};
    return { ...result, ...published, parts };
}

// 4.2.0 kept a composed name's words, names and books as three lists; 4.1.5 kept only the words.
const hasWordList = (part) => part.method === METHOD.COMPOSED && isTextList(part.words);
function toWordRecords(part) {
    if (!hasWordList(part)) return part;
    const { wordNames, wordSources, ...rest } = part;
    const evidence = (n) => (wordNames === undefined ? {} : { names: wordNames[n], sources: wordSources?.[n] });
    return { ...rest, words: part.words.map((text, n) => ({ text, ...evidence(n) })) };
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
    return loadList(HISTORY_KEY).map(validateResult).filter(Boolean);
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
 * Saved names; records without a name are skipped. The rest are kept as stored: one that cannot be shown is still
 * listed and can be copied (canLoadFavorite), and an older result is filled in when read.
 */
export function loadFavorites() {
    return loadList(STORAGE_KEY)
        .filter((record) => isText(record?.name))
        .map((record) => {
            const result = validateResult(record.result);
            return result && result !== record.result ? { ...record, result } : record;
        });
}

/** True if a saved name can be shown again with its components, rather than only listed. */
export const canLoadFavorite = (record) => Boolean(validateResult(record.result));

/** True for a name an older site saved as text only: every current version stores a result with its record. */
export const isFromOldSite = (record) => record.result === undefined;

/** Adds a name; returns the updated list. Throws an Error with a user-facing message when it cannot be saved. */
export function addFavorite(result) {
    const favorites = loadFavorites();
    if (favorites.some((f) => f.name === result.name)) throw new Error("That name is already saved.");
    if (favorites.length >= MAX_FAVORITES) throw new Error(`You can save up to ${MAX_FAVORITES} names.`);
    const generatorType = getLineage(result.subrace)?.species.generatorType ?? "elven";
    const record = { name: result.name, generatorType, subrace: result.subrace, savedAt: Date.now(), result };
    return save([...favorites, record]);
}

export function removeFavorite(name) {
    return save(loadFavorites().filter((f) => f.name !== name));
}

/**
 * Puts a removed record back where it was (Undo), unless it is saved again already. Throws an Error with a
 * user-facing message when the list is full again or the browser refuses.
 */
export function restoreFavorite(record, index) {
    const favorites = loadFavorites();
    if (favorites.some((f) => f.name === record.name)) return favorites;
    if (favorites.length >= MAX_FAVORITES) {
        throw new Error("Saved names is full. Unsave another name to put this one back.");
    }
    return save([...favorites.slice(0, index), record, ...favorites.slice(index)]);
}

export function watchSavedNames(listener) {
    window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY || event.key === null) listener();
    });
}

function save(favorites) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        return favorites;
    } catch {
        throw new Error("Your browser's storage is full or turned off.");
    }
}
