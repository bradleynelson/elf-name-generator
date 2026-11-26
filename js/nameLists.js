// Saved names, More names and History: what is kept, copied, removed and put back, and the messages about it.
import { track } from "./analytics.js?v=4.3.0";
import { formatNameWithKind } from "./core/species.js?v=4.3.0";
import {
    MAX_FAVORITES,
    addFavorite,
    canLoadFavorite,
    loadFavorites,
    loadHistory,
    removeFavorite,
    restoreFavorite,
    saveHistory,
    storageAvailable,
    watchSavedNames
} from "./favorites.js?v=4.3.0";
import { announce, renderMessage } from "./messages.js?v=4.3.0";
import {
    focusHistoryControl,
    focusListedName,
    focusSavedName,
    renderFavorites,
    renderHistoryTools,
    renderListedConfirmation,
    renderNameList,
    renderSavedNameMessage,
    rememberRowFocus,
    wireListControls
} from "./nameListsView.js?v=4.3.0";
import { goToSection, renderConfirmation } from "./ui.js?v=4.3.0";

const HISTORY_SIZE = 10;
// "Saved · 3 left" and an amber count from this many spaces left
const FEW_SAVES_LEFT = 10;

/** The message when a name cannot be saved because Saved names is full. */
export const SAVED_NAMES_FULL = {
    kind: "warning",
    title: "Saved names is full.",
    text: "Unsave a name to make room for this one.",
    action: { label: "Go to saved names", onClick: () => goToSection("favoritesTitle") }
};

const lists = {
    favorites: [],
    moreNames: [],
    // where in moreNames the names removed from it are; they keep their rows, with an Undo, until the list is replaced
    removedFromList: new Set(),
    // saved names removed this visit, each with the row it had, shown with an Undo until the page is left
    removed: [],
    history: [],
    isConfirmingClear: false,
    clearedHistory: []
};

/**
 * What the lists need from the app, set once by startNameLists.
 * @typedef {Object} NameListsApp
 * @property {(handler: Function) => Function} guarded - wraps a click handler so an error is reported and recovered
 * @property {(handlers: Object<string, Function>) => Object<string, Function>} guardedAll - `guarded` on each handler
 * @property {(extra?: Object) => Object} usage - an analytics event's parameters, with the current settings
 * @property {(result: NameResult, options?: { remember?: boolean }) => void} restore - shows a listed name on the card
 * @property {Function} rollList - rolls More names (Roll 10 More)
 * @property {Function} onSavedNamesChange - Saved names changed, so the card's bookmark may need redrawing
 */
let app;

/**
 * Draws the stored saved names and history, keeps Saved names in step with other tabs, wires the list buttons and
 * says where storage is blocked. Saved names and history work before the name lists load.
 * @param {NameListsApp} appHooks
 */
export function startNameLists(appHooks) {
    app = appHooks;
    wireListControls(
        app.guardedAll({
            onRollList: app.rollList,
            onCopyAllList: handleCopyAllList,
            onCopyAllSaved: handleCopyAllSaved,
            ...historyClearHandlers()
        })
    );
    const loadSavedNames = () => {
        const restoreFocus = rememberRowFocus();
        lists.favorites = loadFavorites();
        lists.removed = lists.removed.filter(isStillRemoved);
        renderSavedNames();
        restoreFocus();
    };
    loadSavedNames();
    watchSavedNames(loadSavedNames);
    setHistory(loadHistory());
    // the generator works without storage, but nothing can be saved and history is lost on leaving: say so there
    if (!storageAvailable()) {
        renderMessage("favoritesStorage", {
            kind: "warning",
            title: "Saved names can't be kept.",
            text: "This browser is blocking site storage, so names can't be saved here. Copy any you want to keep."
        });
        renderMessage("historyStorage", {
            kind: "warning",
            title: "History won't be kept.",
            text: "This browser is blocking site storage, so this list is forgotten when you leave."
        });
    }
}

export const isSaved = (result) => Boolean(result) && lists.favorites.some((f) => f.name === result.name);
const savesLeft = () => MAX_FAVORITES - lists.favorites.length;
export const isSavedNamesFull = () => savesLeft() <= 0;

/** Puts a name shown on the card at the top of History, once. */
export function addToHistory(result) {
    setHistory([result, ...lists.history.filter((r) => r.name !== result.name)].slice(0, HISTORY_SIZE));
}

function setHistory(history) {
    lists.history = history;
    saveHistory(history);
    renderHistory();
    renderHistoryClear();
}

const renderHistoryClear = () =>
    renderHistoryTools({
        hasHistory: lists.history.length > 0,
        isConfirming: lists.isConfirmingClear,
        canUndo: lists.clearedHistory.length > 0
    });

/** What every list of names does with its copy buttons and bookmarks; `source` is "list" or "history". */
const createRowHandlers = (listId, source, explain) => ({
    onCopy: app.guarded((result, index, row) =>
        copyToClipboard(formatNameWithKind(result.name, result), source, {
            explain,
            confirm: row.confirm,
            isStillShown: row.isShown
        })
    ),
    isSaved,
    isFull: isSavedNamesFull(),
    onSave: app.guarded((result, index) => {
        explain(null);
        const done = toggleSaved(result, explain, source);
        if (!done) return;
        renderListedConfirmation(listId, index, "save", done.word);
        announce(done.said);
    })
});

function renderHistory() {
    renderNameList(
        "historyList",
        lists.history.map((result) => ({ result })),
        {
            onPick: app.guarded((r) => app.restore(r, { remember: false })),
            ...createRowHandlers("historyList", "history", renderHistoryMessage)
        }
    );
}

const withoutRepeats = (results) => results.filter((r, i) => results.findIndex((o) => o.name === r.name) === i);

/** Replaces More names with a new roll of names (none clears it), forgetting the names removed from the last. */
export function setMoreNames(results) {
    lists.moreNames = results;
    lists.removedFromList = new Set();
    renderMoreNames();
}

const keptInList = () => lists.moreNames.filter((_, index) => !lists.removedFromList.has(index));

function renderMoreNames() {
    const rows = lists.moreNames.map((result, index) => ({ result, isRemoved: lists.removedFromList.has(index) }));
    renderNameList("nameList", rows, {
        onPick: app.guarded((r) => app.restore(r)),
        ...createRowHandlers("nameList", "list", renderListMessage),
        onRemove: app.guarded((result, index) => {
            setRemovedFromList((removed) => removed.add(index));
            focusListedName("nameList", index, "undo");
            announce(`Removed ${result.name}. Undo is in its row.`);
        }),
        onUndo: app.guarded((result, index) => {
            setRemovedFromList((removed) => removed.delete(index));
            focusListedName("nameList", index, "remove");
            announce(`${result.name} is back in More names.`);
        })
    });
}

function setRemovedFromList(change) {
    renderListMessage(null);
    change(lists.removedFromList);
    renderMoreNames();
}

const isStillRemoved = (ghost) => !lists.favorites.some((f) => f.name === ghost.record.name);

/** Saved names in order, with each name removed this visit back in the row it had. */
function savedRows() {
    const rows = lists.favorites.map((record) => ({ record }));
    [...lists.removed]
        .sort((a, b) => a.row - b.row)
        .forEach(({ record, row }) => rows.splice(Math.min(row, rows.length), 0, { record, isRemoved: true }));
    return rows;
}

function renderSavedNames(restored) {
    app.onSavedNamesChange();
    renderMoreNames();
    renderHistory();
    renderFavorites(savedRows(), {
        count: lists.favorites.length,
        max: MAX_FAVORITES,
        isNearlyFull: savesLeft() <= FEW_SAVES_LEFT,
        restored,
        canLoad: canLoadFavorite,
        onLoad: app.guarded((record) => {
            renderSavedNameMessage(null);
            if (canLoadFavorite(record)) return app.restore(record.result);
            rowExplainer(record.name)({
                kind: "warning",
                title: "This name is damaged.",
                text: "It can't be shown again, but you can still copy or remove it."
            });
        }),
        onCopy: app.guarded((record, _index, row) =>
            copyToClipboard(formatSavedLine(record), "saved", {
                explain: rowExplainer(record.name),
                confirm: row.confirm
            })
        ),
        onRemove: app.guarded(({ name }) => {
            renderSavedNameMessage(null);
            if (!removeSaved(name, rowExplainer(name))) return;
            focusSavedName(name, "undo");
            announce(`Unsaved ${name}. Undo is in its row.`);
        }),
        onUndo: app.guarded((record) => {
            renderSavedNameMessage(null);
            const rows = savedRows();
            const before = rows.slice(
                0,
                rows.findIndex((r) => r.record === record)
            );
            const index = before.filter((r) => !r.isRemoved).length;
            const failure = { explain: rowExplainer(record.name), title: "That name wasn't put back." };
            if (!setFavorites(() => restoreFavorite(record, index), failure, { restored: record.name })) return;
            focusSavedName(record.name, "remove");
            announce(`${record.name} is back in Saved names.`);
        })
    });
}

// Where a message about a list goes: under Roll 10 More, under History, in Saved names, or in a saved name's row.
export const renderListMessage = (message) => renderMessage("nameListMessage", message);
const renderHistoryMessage = (message) => renderMessage("historyMessage", message);
const renderSavedMessage = (message) => renderMessage("favoritesMessage", message);
const rowExplainer = (name) => (message) => renderSavedNameMessage(name, message);

// A refused change is explained by failure.explain and changes nothing; `removed` replaces the names shown with an
// Undo, `restored` is the name just put back.
function setFavorites(change, failure, { removed = lists.removed, restored } = {}) {
    try {
        lists.favorites = change();
    } catch (error) {
        failure.explain({ kind: "error", title: failure.title, text: error.message });
        return false;
    }
    lists.removed = removed.filter(isStillRemoved);
    renderSavedNames(restored);
    return true;
}

/** Removes a saved name, leaving its row with an Undo. */
function removeSaved(name, explain) {
    const record = lists.favorites.find((f) => f.name === name);
    const row = savedRows().findIndex((r) => r.record === record);
    const removed = [...lists.removed.filter((ghost) => ghost.record.name !== name), { record, row }];
    return setFavorites(() => removeFavorite(name), { explain, title: "That name wasn't unsaved." }, { removed });
}

/**
 * Copies text for any Copy button. `source` is a copy_source value (ANALYTICS.md); a success counts. `confirm(word,
 * iconName)` confirms on the button pressed. A refusal is explained where pressed, with the text selected; neither
 * shows once isStillShown() fails (a copy can outlast a roll).
 */
export async function copyToClipboard(text, source, { explain, confirm, done = "Copied", isStillShown = () => true }) {
    explain(null);
    try {
        await navigator.clipboard.writeText(text);
        track("name_copied", app.usage({ copy_source: source }));
        if (!isStillShown()) return;
        confirm(done, "check");
        announce(`${done}.`);
    } catch {
        if (!isStillShown()) return;
        explain({
            kind: "warning",
            title: "Your browser wouldn't copy it.",
            text: "Press Ctrl+C (Cmd+C on a Mac) to copy it, which is selected for you:",
            copyText: text
        });
    }
}

const formatSavedLine = (record) =>
    formatNameWithKind(record.name, { sex: record.result?.sex, subrace: record.subrace });

function handleCopyAllSaved() {
    const lines = lists.favorites.map(formatSavedLine);
    copyToClipboard(lines.join("\n"), "saved_all", {
        explain: renderSavedMessage,
        confirm: (word, iconName) => renderConfirmation("copyAllSavedButton", word, iconName),
        done: "Copied all"
    });
}

function handleCopyAllList() {
    const shown = lists.moreNames;
    copyToClipboard(
        keptInList()
            .map((result) => formatNameWithKind(result.name, result))
            .join("\n"),
        "list_all",
        {
            explain: renderListMessage,
            confirm: (word, iconName) => renderConfirmation("copyAllListButton", word, iconName),
            done: "Copied all",
            isStillShown: () => lists.moreNames === shown
        }
    );
}

/** What the bookmark and screen readers say after a save: the spaces left, once few remain. */
function formatSaveConfirmation(left) {
    if (left === 0) return { word: "Saved · now full", said: "Saved. Saved names is now full." };
    if (left > FEW_SAVES_LEFT) return { word: "Saved", said: "Saved." };
    return { word: `Saved · ${left} left`, said: `Saved. ${left} ${left === 1 ? "space" : "spaces"} left.` };
}

/**
 * Saves the name, or unsaves a saved one (its row in Saved names keeps an Undo). `source` is a save_source value.
 * @returns {{ word: string, said: string } | null} what the bookmark and screen readers say; null when refused, after
 *   `explain` has said why
 */
export function toggleSaved(result, explain, source) {
    if (isSaved(result)) {
        if (!removeSaved(result.name, explain)) return null;
        return { word: "Unsaved", said: "Unsaved. Undo is in Saved names." };
    }
    if (isSavedNamesFull()) {
        explain(SAVED_NAMES_FULL);
        return null;
    }
    if (!setFavorites(() => addFavorite(result), { explain, title: "That name wasn't saved." })) return null;
    track("name_saved", app.usage({ save_source: source }));
    return formatSaveConfirmation(savesLeft());
}

// Clearing asks first (Cancel or Delete); what was cleared comes back with Undo, after any names viewed since.
const historyClearHandlers = () => ({
    onHistoryClear: () => {
        setConfirmingClear(true);
        focusHistoryControl("cancel");
    },
    onHistoryCancel: () => {
        setConfirmingClear(false);
        focusHistoryControl("clear");
    },
    onHistoryDelete: () => {
        lists.clearedHistory = [...lists.history, ...lists.clearedHistory];
        lists.isConfirmingClear = false;
        setHistory([]);
        focusHistoryControl("undo");
        announce("History cleared. Undo is under the list.");
    },
    onHistoryUndo: () => {
        const restored = withoutRepeats([...lists.history, ...lists.clearedHistory]).slice(0, HISTORY_SIZE);
        lists.clearedHistory = [];
        setHistory(restored);
        focusHistoryControl("title");
        announce("History is back.");
    }
});

function setConfirmingClear(isOn) {
    lists.isConfirmingClear = isOn;
    renderHistoryClear();
}
